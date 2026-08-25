/**
 * Couche « langage débutant » — traduit les métriques brutes du moteur
 * (volatilité, TER, 1−HHI, score ESG composite) en bandes lisibles par une
 * personne qui n'a jamais investi.
 *
 * Principes (mission Seedow §5/§7) :
 *  - Purement déterministe, dérivé UNIQUEMENT de métriques réelles calculées
 *    par le moteur — aucune donnée inventée.
 *  - Ne renvoie que des identifiants stables (enums) + la valeur numérique
 *    d'origine. Le texte affiché vit en i18n (`portfolio_glance.*`), jamais
 *    codé en dur ici — séparation testable et traduisible.
 *  - Le risque n'est pas « bon » ou « mauvais » : on ne l'encode jamais en
 *    vert/rouge côté UI. Ces fonctions renvoient un niveau neutre.
 */

import type { PortfolioMetrics } from "./types";

/**
 * Sous-ensemble de métriques suffisant pour le « coup d'œil ». Défini en Pick
 * pour accepter aussi bien `PortfolioMetrics` (moteur) que la forme allégée
 * `ActivePortfolioMetrics` (hook), qui partagent ces quatre champs.
 */
export type GlanceMetrics = Pick<
  PortfolioMetrics,
  "volatility" | "diversification" | "ter" | "esg_score"
>;

export type RiskLevel = "prudent" | "modere" | "dynamique";
export type QualityBand = "limitee" | "correcte" | "bonne";
export type FeeLevel = "bas" | "modere" | "eleve";
export type ImpactLevel = "modere" | "solide" | "fort";

export interface RiskAssessment {
  level: RiskLevel;
  /** Volatilité annualisée réelle ayant servi à dériver le niveau (0..1). */
  volatility: number;
}

export interface DiversificationAssessment {
  band: QualityBand;
  /** Indice de diversification réel = 1 − HHI (0..1). */
  value: number;
}

export interface FeeAssessment {
  level: FeeLevel;
  /** TER réel du portefeuille, en fraction (ex. 0.0028 = 0,28 %/an). */
  ratio: number;
}

export interface ImpactAssessment {
  level: ImpactLevel;
  /** Score d'impact sur 100 (score ESG composite arrondi). */
  score: number;
}

/**
 * Bande de risque à partir de la volatilité annualisée.
 *
 * Seuils alignés sur les paliers de `getClassBounds()` (types.ts) :
 * défensif ≤ 0.05, équilibré ≤ 0.09, dynamique au-delà. La volatilité
 * *réalisée* d'un portefeuille tourne un cran au-dessus de la cible, donc les
 * bandes sont posées légèrement plus haut que les cibles.
 */
export function riskBand(volatility: number): RiskAssessment {
  const v = Number.isFinite(volatility) ? Math.max(0, volatility) : 0;
  const level: RiskLevel = v < 0.08 ? "prudent" : v < 0.14 ? "modere" : "dynamique";
  return { level, volatility: v };
}

/**
 * Bande de diversification à partir de l'indice 1 − HHI (0..1).
 *
 * Repères concrets (poids égaux) : 3 lignes → 0.67, 5 → 0.80, 8 → 0.875.
 * En dessous de 0.60, l'argent dépend d'un très petit nombre de lignes.
 */
export function diversificationBand(diversification: number): DiversificationAssessment {
  const d = Number.isFinite(diversification) ? Math.min(1, Math.max(0, diversification)) : 0;
  const band: QualityBand = d < 0.6 ? "limitee" : d < 0.8 ? "correcte" : "bonne";
  return { band, value: d };
}

/**
 * Bande de frais à partir du TER (fraction annuelle).
 * Repère marché : un ETF large coûte ~0,20 %/an. Au-delà de ~0,60 %/an les
 * frais pèsent nettement sur le long terme.
 */
export function feesBand(ter: number): FeeAssessment {
  const r = Number.isFinite(ter) ? Math.max(0, ter) : 0;
  const level: FeeLevel = r < 0.003 ? "bas" : r < 0.006 ? "modere" : "eleve";
  return { level, ratio: r };
}

/**
 * Score d'impact sur 100 à partir du score ESG composite (déjà sur 0..100).
 * On expose le nombre tel quel (arrondi) et une bande qualitative sobre.
 */
export function impactScore(esgScore: number): ImpactAssessment {
  const s = Number.isFinite(esgScore) ? Math.min(100, Math.max(0, esgScore)) : 0;
  const rounded = Math.round(s);
  const level: ImpactLevel = rounded >= 75 ? "fort" : rounded >= 60 ? "solide" : "modere";
  return { level, score: rounded };
}

/**
 * Regroupe les 4 lectures « coup d'œil » d'un portefeuille depuis ses métriques.
 * Renvoie `null` pour toute dimension dont la donnée réelle manque (vieux
 * portefeuille sans `metrics`), plutôt que d'inventer une valeur.
 */
export interface PortfolioGlance {
  risk: RiskAssessment | null;
  diversification: DiversificationAssessment | null;
  fees: FeeAssessment | null;
  impact: ImpactAssessment | null;
}

/**
 * Lecture « part d'une ligne » en langage débutant (onglet Affiner).
 *
 * Traduit un poids (0..1) en une bande qualitative + un équivalent concret
 * « environ 1 € sur N », le repère le plus parlant pour quelqu'un qui n'a
 * jamais manipulé de pourcentages. `oneInN` est null en dessous de 0,5 % :
 * annoncer « 1 € sur 300 » n'aide personne.
 */
export type WeightBand = "petite" | "moyenne" | "importante" | "dominante";

export interface WeightDescription {
  band: WeightBand;
  /** Poids réel utilisé (0..1). */
  weight: number;
  /** Dénominateur de l'équivalent « 1 € sur N », ou null si trop petit. */
  oneInN: number | null;
}

export function describeWeight(weight: number): WeightDescription {
  const w = Number.isFinite(weight) ? Math.min(1, Math.max(0, weight)) : 0;
  const band: WeightBand =
    w >= 0.4 ? "dominante" : w >= 0.2 ? "importante" : w >= 0.08 ? "moyenne" : "petite";
  const oneInN = w >= 0.005 ? Math.round(1 / w) : null;
  return { band, weight: w, oneInN };
}

/**
 * Risque « ressenti » dérivé UNIQUEMENT de la concentration (1 − HHI) — utile
 * pendant l'édition, où la volatilité réelle n'est pas encore recalculée. Ce
 * n'est jamais présenté comme une volatilité : la mesure serveur reste la
 * seule source de vérité chiffrée.
 */
export function perceivedRisk(diversification: number): RiskLevel {
  const d = Number.isFinite(diversification) ? Math.min(1, Math.max(0, diversification)) : 0;
  return d >= 0.8 ? "prudent" : d >= 0.6 ? "modere" : "dynamique";
}

export function portfolioGlance(metrics: GlanceMetrics | null | undefined): PortfolioGlance {
  if (!metrics) return { risk: null, diversification: null, fees: null, impact: null };
  return {
    risk: typeof metrics.volatility === "number" ? riskBand(metrics.volatility) : null,
    diversification:
      typeof metrics.diversification === "number"
        ? diversificationBand(metrics.diversification)
        : null,
    fees: typeof metrics.ter === "number" ? feesBand(metrics.ter) : null,
    impact: typeof metrics.esg_score === "number" ? impactScore(metrics.esg_score) : null,
  };
}

/**
 * Bande d'alignement — la CONCLUSION en langage courant, avant le chiffre.
 *
 * « 76/100 » ne répond pas à la question que l'utilisateur se pose, qui est
 * « et alors ? ». Un score nu appelle une interprétation qu'un débutant n'a
 * aucun moyen de faire : 76, c'est bien ? mal ? par rapport à quoi ?
 *
 * On rend donc d'abord un mot, puis le chiffre le complète. `null` reste
 * `null` : sans donnée d'exposition, il n'y a pas de conclusion à tirer — et
 * surtout pas « faiblement aligné », qui accuserait le fonds d'un manque qui
 * est le nôtre.
 */
export type AlignmentBand = "strong" | "partial" | "weak" | "unknown";

export function alignmentBand(overall: number | null): AlignmentBand {
  if (overall == null || !Number.isFinite(overall)) return "unknown";
  if (overall >= 70) return "strong";
  if (overall >= 45) return "partial";
  return "weak";
}
