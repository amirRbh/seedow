/**
 * Spécifications de SATISFACTION par dimension (pivot PIU, §6.3).
 *
 * Chaque dimension déclare EXPLICITEMENT sa forme, ses seuils, LEUR PROVENANCE et
 * une VERSION — pas de nombre magique éparpillé. Les identifiants de dimension
 * viennent du registre canonique unique (`lib/preferences/dimensions.ts`) : on ne
 * duplique pas la liste, on l'enrichit d'une forme de satisfaction.
 *
 * Les bornes des formes monotones sont des DÉFAUTS indicatifs (v1), destinés à
 * être RECALIBRÉS sur la distribution réelle de l'univers (p10/p90) via
 * `calibrateMonotoneThreshold` — c'est l'exigence §6.3 « bornes issues de la
 * distribution observée, pas de chiffres ronds inventés ». Tant que l'univers est
 * étroit, on assume ces défauts sourcés plutôt que d'inventer une calibration.
 *
 * Fonctions/valeurs pures, aucune I/O.
 */

import { ACWI_WACI_SOURCE, ACWI_WACI_TCO2E_PER_MUSD } from "@/lib/esg/benchmark";
import type { MatchDimension } from "@/lib/preferences/dimensions";
import type { SatisfactionForm } from "./types";

export const MATCHING_METHODOLOGY_VERSION = "match-v1";

export interface MonotoneThreshold {
  form: "monotone_decreasing" | "monotone_increasing";
  /** Valeur « satisfaisante » (sat→1). */
  good: number;
  /** Valeur « insatisfaisante » (sat→0). */
  bad: number;
}
export interface TargetThreshold {
  form: "target";
  /** Écart-type de la gaussienne (la cible vient du contexte utilisateur). */
  tolerance: number;
}
export interface OrdinalThreshold {
  form: "ordinal";
  mapping: Readonly<Record<string, number>>;
}
export type DimensionThreshold = MonotoneThreshold | TargetThreshold | OrdinalThreshold;

export interface DimensionSpec {
  id: MatchDimension;
  form: SatisfactionForm;
  threshold: DimensionThreshold;
  /** Provenance des seuils — affichable, auditable (§1.2). */
  thresholdOrigin: string;
  version: string;
}

/** Référence WACI (ACWI), sourcée — sert de dénominateur au sous-score climat. */
export const CLIMATE_BENCHMARK_WACI = ACWI_WACI_TCO2E_PER_MUSD;

/**
 * Specs par défaut. N'y figurent que les dimensions ÉVALUABLES par une donnée
 * par-actif. Les dimensions dépendantes du look-through (values_alignment,
 * harm_avoidance) ou du contexte de collection (diversification) n'ont pas de
 * spec ici : leur satisfaction n'est pas calculable au niveau d'un actif isolé,
 * et `signals.ts` leur affecte une couverture nulle avec un motif explicite —
 * jamais un score inventé.
 */
export const DIMENSION_SPECS: Partial<Record<MatchDimension, DimensionSpec>> = {
  cost: {
    id: "cost",
    form: "monotone_decreasing",
    threshold: { form: "monotone_decreasing", good: 0.15, bad: 0.75 },
    thresholdOrigin:
      "v1 — bande de TER indicative pour ETF/fonds UCITS (0,15 % très bas → 0,75 % élevé). À recalibrer sur p10/p90 de l'univers réel.",
    version: MATCHING_METHODOLOGY_VERSION,
  },
  climate: {
    id: "climate",
    form: "monotone_decreasing",
    // Appliqué au WACI (tCO₂e/M$ CA) : sat = 1 − WACI/(2·réf), soit good=0, bad=2·réf.
    threshold: { form: "monotone_decreasing", good: 0, bad: 2 * CLIMATE_BENCHMARK_WACI },
    thresholdOrigin: `v1 — sous-score carbone = clamp(1 − WACI/(2·réf)) ; réf = ${CLIMATE_BENCHMARK_WACI} (${ACWI_WACI_SOURCE}). Repli sur le score climat 0..10 quand le WACI manque.`,
    version: MATCHING_METHODOLOGY_VERSION,
  },
  // Repli climat quand le WACI est absent : score de pilier E sur 0..10.
  esg_quality: {
    id: "esg_quality",
    form: "monotone_increasing",
    threshold: { form: "monotone_increasing", good: 8, bad: 3 },
    thresholdOrigin:
      "v1 — score ESG 0..10 : 3 = faible, 8 = fort. Indicatif, à recalibrer sur la distribution réelle et à baser sur les piliers réels quand ils sont renseignés (souvent NULL aujourd'hui).",
    version: MATCHING_METHODOLOGY_VERSION,
  },
  controversy: {
    id: "controversy",
    form: "ordinal",
    threshold: { form: "ordinal", mapping: { none: 1, low: 0.7, moderate: 0.35, severe: 0 } },
    thresholdOrigin:
      "v1 — mapping ordinal des controverses. Données de controverses non encore ingérées → couverture nulle en pratique (signals.ts).",
    version: MATCHING_METHODOLOGY_VERSION,
  },
  risk_fit: {
    id: "risk_fit",
    form: "target",
    threshold: { form: "target", tolerance: 1.5 },
    thresholdOrigin:
      "v1 — ajustement à une cible (SRRI 1..7) dérivée de la tolérance déclarée ; tolérance σ=1.5. Un actif trop peu risqué pour un profil dynamique n'est pas « parfait ».",
    version: MATCHING_METHODOLOGY_VERSION,
  },
  disclosure: {
    id: "disclosure",
    form: "ordinal",
    threshold: { form: "ordinal", mapping: { complete: 1, partial: 0.6, estimated: 0.3 } },
    thresholdOrigin:
      "v1 — satisfaction de transparence dérivée de NOTRE couverture de données (complete/partial/estimated). Dimension que Seedow contrôle par son ingestion.",
    version: MATCHING_METHODOLOGY_VERSION,
  },
};

/** Percentile linéaire d'un échantillon (p ∈ [0,1]). Ignore les non-finis. */
export function percentile(sample: number[], p: number): number | null {
  const xs = sample.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (xs.length === 0) return null;
  if (xs.length === 1) return xs[0];
  const idx = clampIndex(p, xs.length);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return xs[lo];
  return xs[lo] + (xs[hi] - xs[lo]) * (idx - lo);
}

function clampIndex(p: number, n: number): number {
  const pp = p < 0 ? 0 : p > 1 ? 1 : p;
  return pp * (n - 1);
}

/**
 * Recalibre les bornes d'une dimension monotone sur la distribution observée
 * (§6.3). Pour une dimension DÉCROISSANTE (moins = mieux), `good = p10`,
 * `bad = p90` ; pour une CROISSANTE (plus = mieux), `good = p90`, `bad = p10`.
 * Renvoie une nouvelle spec (immuable) ; l'appelant décide de l'adopter — on ne
 * mute jamais les défauts en place. Échantillon insuffisant (< `minSample`) →
 * spec inchangée (on ne calibre pas sur du bruit).
 */
export function calibrateMonotoneThreshold(
  spec: DimensionSpec,
  sample: number[],
  {
    pLow = 0.1,
    pHigh = 0.9,
    minSample = 8,
  }: { pLow?: number; pHigh?: number; minSample?: number } = {},
): DimensionSpec {
  if (
    spec.threshold.form !== "monotone_decreasing" &&
    spec.threshold.form !== "monotone_increasing"
  ) {
    return spec;
  }
  const finite = sample.filter((x) => Number.isFinite(x));
  if (finite.length < minSample) return spec;
  const lo = percentile(finite, pLow);
  const hi = percentile(finite, pHigh);
  if (lo == null || hi == null || lo === hi) return spec;

  const decreasing = spec.threshold.form === "monotone_decreasing";
  const good = decreasing ? lo : hi;
  const bad = decreasing ? hi : lo;
  return {
    ...spec,
    threshold: { form: spec.threshold.form, good, bad },
    thresholdOrigin: `calibré sur la distribution de l'univers (p${Math.round(pLow * 100)}=${round(lo)}, p${Math.round(pHigh * 100)}=${round(hi)}, n=${finite.length}).`,
    version: `${spec.version}+calib`,
  };
}

function round(x: number): number {
  return Math.round(x * 1000) / 1000;
}
