/**
 * Overlap look-through (N3) — mesure la diversification RÉELLE d'un portefeuille
 * au niveau des titres sous-jacents, pas seulement au niveau des fonds.
 *
 * Problème résolu : `metrics.diversification = 1 − HHI` est calculée sur les
 * poids de FONDS. Deux ETF « ESG World » différents partageant 400 titres
 * comptent alors comme parfaitement diversifiés, alors qu'ils exposent au même
 * risque sous-jacent. Ce module regarde À TRAVERS les fonds (look-through) pour
 * corriger ce mensonge de diversification.
 *
 * Fonctions PURES, sans I/O : le consommateur (server) fournit les compositions
 * réelles issues de `fund_holdings`. Contrat de transparence (§1.3) : quand un
 * fonds n'a PAS de composition connue, il est EXCLU du calcul look-through
 * (jamais de holdings inventés) et le résultat porte sa couverture — on ne
 * présente jamais une diversification look-through comme complète si elle ne
 * l'est pas.
 *
 * Conventions :
 *  - `HoldingWeights` : securityKey (isin ou nom normalisé) → part DANS LE FONDS,
 *    en fraction (0..1). Le consommateur normalise depuis `weight_pct` (0..100).
 *  - Les poids de portefeuille (`portfolioWeights`) somment à 1 sur les fonds.
 */

import type { PortfolioWeights } from "./types";

/** Composition d'un fonds : titre sous-jacent → part dans le fonds (0..1). */
export type HoldingWeights = Map<string, number>;

/**
 * Overlap entre deux fonds = Σ_titres min(part_a(t), part_b(t)) sur les titres
 * communs. Borné dans [0, 1] : 0 = aucune position commune, 1 = compositions
 * identiques. C'est la mesure standard de recouvrement de portefeuilles.
 */
export function pairwiseOverlap(a: HoldingWeights, b: HoldingWeights): number {
  // Itère sur le plus petit des deux pour l'efficacité.
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  let overlap = 0;
  for (const [sec, wa] of small) {
    const wb = large.get(sec);
    if (wb !== undefined) overlap += Math.min(wa, wb);
  }
  return Math.max(0, Math.min(1, overlap));
}

/**
 * Overlap pondéré du portefeuille = Σ_{a<b} w_a·w_b·overlap(a,b), rééchelonné
 * par la somme des poids des paires réellement couvertes (les fonds sans
 * composition connue sont ignorés). Renvoie :
 *  - `overlap` ∈ [0,1] : recouvrement moyen pondéré entre paires couvertes ;
 *  - `coverage` ∈ [0,1] : part du poids du portefeuille portée par des fonds
 *    dont la composition est connue (honnêteté : un overlap sur 30% du poids
 *    n'est pas un overlap sur 100%).
 * `overlap` = null si moins de deux fonds ont une composition connue.
 */
export function portfolioOverlap(
  portfolioWeights: PortfolioWeights,
  holdingsByAsset: Map<string, HoldingWeights>,
): { overlap: number | null; coverage: number } {
  const covered = Object.keys(portfolioWeights).filter(
    (id) => (holdingsByAsset.get(id)?.size ?? 0) > 0,
  );
  const totalWeight = Object.values(portfolioWeights).reduce((s, w) => s + w, 0);
  const coveredWeight = covered.reduce((s, id) => s + portfolioWeights[id], 0);
  const coverage = totalWeight > 0 ? coveredWeight / totalWeight : 0;

  if (covered.length < 2) return { overlap: null, coverage };

  let num = 0;
  let denom = 0;
  for (let i = 0; i < covered.length; i++) {
    for (let j = i + 1; j < covered.length; j++) {
      const wi = portfolioWeights[covered[i]];
      const wj = portfolioWeights[covered[j]];
      const ov = pairwiseOverlap(
        holdingsByAsset.get(covered[i])!,
        holdingsByAsset.get(covered[j])!,
      );
      num += wi * wj * ov;
      denom += wi * wj;
    }
  }
  return { overlap: denom > 0 ? num / denom : null, coverage };
}

/**
 * Exposition agrégée par titre sous-jacent : pour chaque fonds couvert de poids
 * w_fonds et de composition {titre → part}, on cumule w_fonds·part sur chaque
 * titre. Le résultat est renormalisé sur la part couverte pour rester une
 * distribution (somme = 1 sur l'univers couvert). Map vide si aucun fonds
 * couvert.
 */
export function aggregateExposure(
  portfolioWeights: PortfolioWeights,
  holdingsByAsset: Map<string, HoldingWeights>,
): Map<string, number> {
  const exposure = new Map<string, number>();
  let total = 0;
  for (const id in portfolioWeights) {
    const holdings = holdingsByAsset.get(id);
    if (!holdings || holdings.size === 0) continue;
    const wFund = portfolioWeights[id];
    for (const [sec, part] of holdings) {
      const contrib = wFund * part;
      exposure.set(sec, (exposure.get(sec) ?? 0) + contrib);
      total += contrib;
    }
  }
  if (total > 0) for (const [sec, v] of exposure) exposure.set(sec, v / total);
  return exposure;
}

/**
 * Diversification VRAIE look-through = 1 − HHI de l'exposition agrégée par titre
 * sous-jacent. À comparer à `metrics.diversification` (calculée sur les fonds) :
 * un écart important = de la fausse diversification (fonds redondants).
 * Renvoie :
 *  - `diversification` ∈ [0,1[ : null si aucun fonds couvert ;
 *  - `coverage` ∈ [0,1] : part du poids portée par des fonds à composition connue.
 */
export function lookThroughDiversification(
  portfolioWeights: PortfolioWeights,
  holdingsByAsset: Map<string, HoldingWeights>,
): { diversification: number | null; coverage: number } {
  const exposure = aggregateExposure(portfolioWeights, holdingsByAsset);
  const totalWeight = Object.values(portfolioWeights).reduce((s, w) => s + w, 0);
  const coveredWeight = Object.keys(portfolioWeights)
    .filter((id) => (holdingsByAsset.get(id)?.size ?? 0) > 0)
    .reduce((s, id) => s + portfolioWeights[id], 0);
  const coverage = totalWeight > 0 ? coveredWeight / totalWeight : 0;

  if (exposure.size === 0) return { diversification: null, coverage };
  let hhi = 0;
  for (const v of exposure.values()) hhi += v * v;
  return { diversification: 1 - hhi, coverage };
}
