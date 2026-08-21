/**
 * Agrégation du matching (pivot PIU, §6.4). Combine les signaux par dimension
 * avec les POIDS DE L'UTILISATEUR — jamais des poids choisis par Seedow.
 *
 *   sat(a)      = Σ w·c·s / Σ w·c        (score de correspondance, ∈ [0,1])
 *   coverage(a) = Σ w·c   / Σ w          (confiance, ∈ [0,1])
 *
 * Trois garde-fous non négociables :
 *  1. La couverture PONDÈRE, elle ne pénalise pas : une dimension non mesurée
 *     sort du numérateur ET du dénominateur — elle baisse la confiance, pas le
 *     score.
 *  2. REFUS de scorer sous le plancher de couverture : pas de score affiché, un
 *     motif et la liste des dimensions manquantes à la place (§1.3).
 *  3. Précision honnête : on renvoie une BANDE ; le pourcentage n'est proposé
 *     qu'au-delà d'une couverture élevée (§6.4 — un « 94 % » sur des intrants
 *     partiels est une fausse précision).
 *
 * Fonctions pures, aucune I/O.
 */

import { MATCH_DIMENSIONS } from "@/lib/preferences/dimensions";
import type { DimensionWeights } from "@/lib/preferences/model";
import type { AssetSignals, DimensionContribution, MatchBand, MatchResult } from "./types";

export interface AggregateOptions {
  /** Couverture agrégée minimale pour afficher un score. Défaut 0.5 (§6.4). */
  minCoverage?: number;
  /** Couverture au-delà de laquelle un pourcentage est jugé honnête. Défaut 0.8. */
  percentThreshold?: number;
}

/** Seuils de bande (v1) — display, pas une vérité ; documentés et centralisés. */
const BAND_STRONG = 0.8;
const BAND_GOOD = 0.6;
const BAND_PARTIAL = 0.4;

function toBand(score: number): MatchBand {
  if (score >= BAND_STRONG) return "strong";
  if (score >= BAND_GOOD) return "good";
  if (score >= BAND_PARTIAL) return "partial";
  return "weak";
}

/**
 * Agrège des signaux par-dimension avec des poids utilisateur en un résultat de
 * correspondance décomposé et honnête.
 */
export function aggregateMatch(
  assetId: string,
  signals: AssetSignals,
  weights: DimensionWeights,
  opts: AggregateOptions = {},
): MatchResult {
  const minCoverage = opts.minCoverage ?? 0.5;
  const percentThreshold = opts.percentThreshold ?? 0.8;

  let sumW = 0;
  let sumWC = 0;
  let sumWCS = 0;
  const covered: Array<{
    dim: (typeof MATCH_DIMENSIONS)[number];
    w: number;
    c: number;
    s: number;
    wcs: number;
    label?: string;
  }> = [];
  const missing: MatchResult["missing"] = [];

  for (const dim of MATCH_DIMENSIONS) {
    const w = weights[dim] ?? 0;
    if (w <= 0) continue; // dimension à laquelle l'utilisateur n'accorde aucun poids
    sumW += w;
    const sig = signals[dim];
    const c = sig.coverage;
    if (c <= 0 || sig.satisfaction == null) {
      missing.push({ dimension: dim, reason: sig.uncoveredReason ?? "no_data" });
      continue;
    }
    const s = sig.satisfaction;
    const wc = w * c;
    const wcs = wc * s;
    sumWC += wc;
    sumWCS += wcs;
    covered.push({ dim, w, c, s, wcs, label: sig.measuredLabel });
  }

  const coverage = sumW > 0 ? sumWC / sumW : 0;
  const score = sumWC > 0 ? sumWCS / sumWC : null;
  const scorable = score != null && coverage >= minCoverage;

  const contributions: DimensionContribution[] = covered
    .map((c) => ({
      dimension: c.dim,
      weight: c.w,
      coverage: c.c,
      satisfaction: c.s,
      share: sumWCS > 0 ? c.wcs / sumWCS : 0,
      measuredLabel: c.label,
    }))
    .sort((a, b) => b.share - a.share);

  const band: MatchBand = scorable && score != null ? toBand(score) : "not_scored";
  const displayPercent =
    scorable && score != null && coverage >= percentThreshold ? Math.round(score * 100) : null;

  return {
    assetId,
    scorable,
    score: scorable ? score : null,
    coverage,
    band,
    displayPercent,
    contributions,
    missing,
  };
}
