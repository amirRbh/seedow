/**
 * Étage « qualité de données » du pipeline de construction de portefeuille.
 *
 * Universe → Eligibility → **Data Quality** → Risk/Return → Optimization → …
 *
 * Règle fondamentale (CLAUDE.md §1.3, mission « ne jamais inventer de donnée ») :
 * le moteur reçoit `expected_return` / `volatility` sans savoir s'ils viennent
 * d'un historique réel suffisant ou de la valeur figée au seed. Ce module rend
 * cette provenance EXPLICITE et déterministe, à partir du nombre d'observations
 * réellement utilisées par le modèle de risque (`assets.stats_observations`,
 * écrit par /hooks/recompute-risk-model). Aucune de ces fonctions n'invente de
 * chiffre : elles classent, ancrent sur des pairs réels, ou laissent tel quel.
 *
 * Purement fonctionnel : aucune dépendance DB, entièrement testable.
 */

import type { Asset, AssetClass, DataQualityTier } from "./types";
export type { DataQualitySummary } from "./types";

// ── Seuils (en observations de rendements quotidiens ; base 252 j/an) ──
/**
 * Palier « full » : ≥ ~12 mois de bourse. La moyenne historique de rendement
 * est l'estimateur le plus bruité qui soit (Merton 1980) ; en dessous d'un an
 * on ne fait PAS confiance au μ propre de l'actif, on l'ancre sur ses pairs.
 */
export const FULL_CONFIDENCE_MIN_OBS = 252;
/**
 * Palier « partial » : ≥ ~2 mois. En dessous, aucune statistique n'est fiable
 * (aligné sur MIN_OBSERVATIONS du modèle de risque) → palier « insufficient ».
 */
export const PARTIAL_CONFIDENCE_MIN_OBS = 40;

/**
 * Classe un actif selon la fiabilité de ses statistiques de risque/rendement.
 * `stats_observations` null/absent ⇒ le modèle de risque n'a jamais tourné sur
 * cet actif : ses μ/σ sont la valeur de seed, traitée comme « insufficient ».
 */
export function classifyDataQuality(asset: Pick<Asset, "stats_observations">): DataQualityTier {
  const obs = asset.stats_observations;
  if (obs == null || !Number.isFinite(obs) || obs < PARTIAL_CONFIDENCE_MIN_OBS) return "insufficient";
  if (obs < FULL_CONFIDENCE_MIN_OBS) return "partial";
  return "full";
}

// ── Prior de corrélation (repli quand une paire manque de la matrice réelle) ──
//
// Un actif fraîchement ajouté (ou une paire hors fenêtre commune) n'a pas de
// covariance pré-calculée. Retomber sur 0 (non-corrélé) FABRIQUE de la
// diversification : l'optimiseur croit pouvoir annuler du risque qui, en vrai,
// est bien présent. On utilise donc un prior de corrélation prudent, positif,
// dérivé du comportement connu des grandes familles d'actifs — jamais 0 entre
// deux actifs risqués de la même famille.

type CorrFamily = "equity" | "bond" | "real" | "cash";

function corrFamily(cls: AssetClass): CorrFamily {
  switch (cls) {
    case "equity_dev":
    case "equity_em":
    case "thematic":
      return "equity";
    case "green_bond":
    case "social_bond":
    case "sov_bond":
    case "corporate_bond":
      return "bond";
    case "reit":
    case "commodity":
      return "real";
    case "cash":
      return "cash";
  }
}

// Corrélations « raisonnables et prudentes » entre familles. Volontairement
// hautes en intra-famille (on ne prétend pas diversifier deux actions monde),
// basses mais non nulles en actions↔obligations, nulles seulement avec le cash.
const FAMILY_CORR: Record<CorrFamily, Record<CorrFamily, number>> = {
  equity: { equity: 0.8, bond: 0.2, real: 0.6, cash: 0 },
  bond: { equity: 0.2, bond: 0.6, real: 0.3, cash: 0 },
  real: { equity: 0.6, bond: 0.3, real: 0.6, cash: 0 },
  cash: { equity: 0, bond: 0, real: 0, cash: 0 },
};

/** Prior de corrélation entre deux classes (1 sur la diagonale même classe). */
export function classCorrelationPrior(a: AssetClass, b: AssetClass): number {
  if (a === b) return 1;
  return FAMILY_CORR[corrFamily(a)][corrFamily(b)];
}

/**
 * Covariance de repli pour une paire (i, j) absente de la matrice réelle :
 * ρ_prior(classe_i, classe_j) · σ_i · σ_j. Sur la diagonale (i = j) c'est
 * exactement σ_i² — cohérent avec le repli existant de l'engine.
 */
export function covarianceFallback(a: Asset, b: Asset): number {
  return classCorrelationPrior(a.asset_class, b.asset_class) * a.volatility * b.volatility;
}

// ── Ancrage des rendements attendus peu fiables ──

function median(xs: number[]): number {
  if (xs.length === 0) return NaN;
  const s = [...xs].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export interface AnchorResult {
  /** μ ajusté, dans le même ordre que `assets`. */
  mu: number[];
  /** Ids dont le μ a été ancré (palier partial/insufficient). */
  anchored: string[];
}

/**
 * Ancre le μ des actifs peu fiables (palier `partial` / `insufficient`) sur la
 * médiane des μ des actifs `full` de LEUR classe. À défaut de pair `full` dans
 * la classe, on ancre sur la médiane `full` globale ; à défaut de tout actif
 * `full`, le μ est laissé inchangé (on ne fabrique rien).
 *
 * Motivation : un μ issu de < 12 mois d'historique — ou pire, d'un seed — est
 * trop bruité pour piloter le terme linéaire de l'optimiseur. On le remplace
 * par une ancre dérivée de VRAIS pairs, ce qui empêche un actif mal estimé de
 * capter des poids sur un rendement illusoire, sans jamais inventer de valeur.
 */
export function anchorLowConfidenceReturns(
  assets: Asset[],
  mu: number[],
  tiers: DataQualityTier[],
): AnchorResult {
  const out = [...mu];
  const anchored: string[] = [];

  const fullMuByClass = new Map<AssetClass, number[]>();
  const fullMuGlobal: number[] = [];
  for (let i = 0; i < assets.length; i++) {
    if (tiers[i] === "full") {
      const arr = fullMuByClass.get(assets[i].asset_class) ?? [];
      arr.push(mu[i]);
      fullMuByClass.set(assets[i].asset_class, arr);
      fullMuGlobal.push(mu[i]);
    }
  }
  const globalAnchor = fullMuGlobal.length > 0 ? median(fullMuGlobal) : null;

  for (let i = 0; i < assets.length; i++) {
    if (tiers[i] === "full") continue;
    const classArr = fullMuByClass.get(assets[i].asset_class);
    const anchor = classArr && classArr.length > 0 ? median(classArr) : globalAnchor;
    if (anchor == null) continue; // aucun pair fiable → on ne touche pas
    out[i] = anchor;
    anchored.push(assets[i].id);
  }
  return { mu: out, anchored };
}
