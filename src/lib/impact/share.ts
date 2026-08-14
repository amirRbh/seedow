/**
 * Données de PARTAGE d'impact — honnêtes par construction (CLAUDE.md §1.2/§1.3).
 *
 * On ne partage QUE des chiffres réels : le score d'impact ESG (moyenne pondérée
 * de scores réels) et, uniquement s'il est mesuré de façon représentative,
 * l'écart d'intensité carbone vs un indice. Si la couverture des données
 * émetteurs est insuffisante, on ne partage AUCUN chiffre carbone (jamais un
 * « CO₂ évité » fabriqué, jamais un écart calculé sur une fraction non
 * représentative du portefeuille). C'est la boucle d'acquisition de Seedow :
 * un objet partageable qui reste fidèle à la promesse « rien de caché ».
 */

import { buildPortfolioImpact, type PortfolioImpactMetrics } from "./portfolioImpact";

export interface ImpactShareData {
  /** Score d'impact ESG réel (0..100 arrondi), ou null si non calculable. */
  score: number | null;
  /**
   * Écart d'intensité carbone vs indice, en fraction positive (0.34 = 34 % moins
   * intensif), UNIQUEMENT si le portefeuille est réellement plus propre ET mesuré
   * avec une couverture suffisante. null dans tous les autres cas — on ne partage
   * jamais un chiffre carbone non représentatif ou défavorable présenté comme un gain.
   */
  cleanerDeltaPct: number | null;
}

/**
 * Extrait les seuls chiffres honnêtement partageables d'un portefeuille.
 * Fonction pure : aucune dépendance UI, testable isolément.
 */
export function impactShareData(metrics: PortfolioImpactMetrics | null): ImpactShareData {
  if (!metrics) return { score: null, cleanerDeltaPct: null };
  const score = Number.isFinite(metrics.esg_score) ? Math.round(metrics.esg_score) : null;
  const impact = buildPortfolioImpact(metrics, 0);
  const delta = impact.intensity?.vsBenchmarkDeltaPct ?? null;
  const cleaner = impact.intensity?.cleaner ?? false;
  // Verdict carbone partagé seulement s'il est réel, favorable, et représentatif
  // (vsBenchmarkDeltaPct n'est renseigné par le moteur que si la couverture ≥ seuil).
  const cleanerDeltaPct = cleaner && delta != null && delta > 0 ? delta : null;
  return { score, cleanerDeltaPct };
}
