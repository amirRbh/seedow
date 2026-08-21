/**
 * Extraction des SIGNAUX par dimension pour un actif (pivot PIU).
 *
 * Transforme une entrée par-actif (`MatchAssetInput`) + un contexte utilisateur
 * en une satisfaction + couverture par dimension. C'est le seul endroit qui
 * connaît COMMENT lire chaque donnée ; il applique les seuils de `dimensions.ts`
 * et les formes de `satisfaction.ts`.
 *
 * Honnêteté de la couverture (§1.2/§1.3, §9.2) :
 *  - une dimension dépendant du look-through (values_alignment, harm_avoidance)
 *    renvoie couverture 0 + motif `requires_holdings` TANT QUE `fund_holdings`
 *    n'est pas alimenté — jamais un « faux 0 % fossile » ;
 *  - `diversification` ne se juge pas sur un actif isolé → `requires_collection` ;
 *  - `risk_fit` sans tolérance déclarée → `requires_user_context` ;
 *  - une donnée simplement absente → `no_data`.
 * Aucune valeur n'est inventée pour combler un trou : le trou est déclaré.
 */

import { MATCH_DIMENSIONS, type MatchDimension } from "@/lib/preferences/dimensions";
import { CLIMATE_BENCHMARK_WACI, DIMENSION_SPECS } from "./dimensions";
import {
  satMonotoneDecreasing,
  satMonotoneIncreasing,
  satOrdinal,
  satTarget,
} from "./satisfaction";
import type {
  AssetSignals,
  DimensionSignal,
  MatchAssetInput,
  MatchContext,
  UncoveredReason,
} from "./types";

const RISK_TOLERANCE_STD = 1.5; // σ de la gaussienne risk_fit (cf. dimensions.ts)

const COVERAGE_LABELS: Record<string, string> = {
  complete: "données complètes",
  partial: "données partielles",
  estimated: "données estimées",
};

function uncovered(dimension: MatchDimension, reason: UncoveredReason): DimensionSignal {
  return { dimension, satisfaction: null, coverage: 0, uncoveredReason: reason };
}

function covered(
  dimension: MatchDimension,
  satisfaction: number,
  measuredLabel: string,
  coverage = 1,
): DimensionSignal {
  return { dimension, satisfaction, coverage, measuredLabel };
}

/** Bornes monotones d'une dimension (depuis sa spec), ou null si non monotone. */
function monotone(dim: MatchDimension): { good: number; bad: number } | null {
  const t = DIMENSION_SPECS[dim]?.threshold;
  if (t && (t.form === "monotone_decreasing" || t.form === "monotone_increasing")) {
    return { good: t.good, bad: t.bad };
  }
  return null;
}

function ordinalMapping(dim: MatchDimension): Readonly<Record<string, number>> | null {
  const t = DIMENSION_SPECS[dim]?.threshold;
  return t && t.form === "ordinal" ? t.mapping : null;
}

function signalFor(
  dim: MatchDimension,
  asset: MatchAssetInput,
  ctx: MatchContext,
): DimensionSignal {
  switch (dim) {
    // ── Dépendantes du look-through — non alimentées tant que fund_holdings vide.
    case "values_alignment":
    case "harm_avoidance":
      return uncovered(dim, "requires_holdings");

    // ── Ne se juge qu'au niveau d'une collection.
    case "diversification":
      return uncovered(dim, "requires_collection");

    // ── Climat : WACI d'abord, repli sur le score climat 0..10.
    case "climate": {
      const m = monotone("climate");
      if (asset.waci != null && Number.isFinite(asset.waci) && m) {
        const ref = ctx.benchmarkWaci ?? CLIMATE_BENCHMARK_WACI;
        const sat = satMonotoneDecreasing(asset.waci, 0, 2 * ref);
        return covered("climate", sat, `WACI ${round(asset.waci)} tCO₂e/M$ (réf ${ref})`);
      }
      if (asset.climateScore != null && Number.isFinite(asset.climateScore)) {
        const sat = satMonotoneIncreasing(asset.climateScore, 3, 8);
        // Repli : couverture réduite (score de pilier, pas un carbone financé mesuré).
        return {
          dimension: "climate",
          satisfaction: sat,
          coverage: 0.6,
          measuredLabel: `climat ${round(asset.climateScore)}/10`,
        };
      }
      return uncovered("climate", "no_data");
    }

    case "esg_quality": {
      const m = monotone("esg_quality");
      if (asset.esgScore != null && Number.isFinite(asset.esgScore) && m) {
        return covered(
          "esg_quality",
          satMonotoneIncreasing(asset.esgScore, m.bad, m.good),
          `ESG ${round(asset.esgScore)}/10`,
        );
      }
      return uncovered("esg_quality", "no_data");
    }

    case "controversy": {
      const map = ordinalMapping("controversy");
      const sat = map ? satOrdinal(asset.controversyBand, map) : null;
      if (sat != null && asset.controversyBand) {
        return covered("controversy", sat, `controverses : ${asset.controversyBand}`);
      }
      return uncovered("controversy", "no_data");
    }

    case "cost": {
      const m = monotone("cost");
      if (asset.terPct != null && Number.isFinite(asset.terPct) && m) {
        return covered(
          "cost",
          satMonotoneDecreasing(asset.terPct, m.good, m.bad),
          `TER ${round(asset.terPct)} %`,
        );
      }
      return uncovered("cost", "no_data");
    }

    case "risk_fit": {
      if (ctx.targetRiskLevel == null) return uncovered("risk_fit", "requires_user_context");
      if (asset.riskLevel == null || !Number.isFinite(asset.riskLevel)) {
        return uncovered("risk_fit", "no_data");
      }
      const sat = satTarget(asset.riskLevel, ctx.targetRiskLevel, RISK_TOLERANCE_STD);
      return covered("risk_fit", sat, `risque ${asset.riskLevel}/7`);
    }

    case "disclosure": {
      const map = ordinalMapping("disclosure");
      const sat = map ? satOrdinal(asset.dataCoverage, map) : null;
      if (sat != null && asset.dataCoverage) {
        return covered(
          "disclosure",
          sat,
          COVERAGE_LABELS[asset.dataCoverage] ?? asset.dataCoverage,
        );
      }
      return uncovered("disclosure", "no_data");
    }

    default:
      return uncovered(dim, "no_spec");
  }
}

/** Signaux de toutes les dimensions pour un actif. */
export function computeAssetSignals(asset: MatchAssetInput, ctx: MatchContext): AssetSignals {
  const out = {} as AssetSignals;
  for (const dim of MATCH_DIMENSIONS) out[dim] = signalFor(dim, asset, ctx);
  return out;
}

function round(x: number): number {
  return Math.round(x * 100) / 100;
}
