/**
 * Traduction d'impact — helpers purs pour présenter la vue d'impact honnête
 * (`buildPortfolioImpact`) de façon tangible, SANS jamais fabriquer un chiffre.
 *
 * Le seul degré de liberté « émotionnel » vient de la mise en récit de données
 * réelles (équivalences ADEME sourcées, comparaison au benchmark ACWI sourcé) et
 * du niveau de confiance affiché — jamais d'une valeur inventée.
 */

/** Niveau de confiance d'une empreinte carbone, dérivé de la couverture réelle. */
export type CarbonConfidence = "high" | "partial" | "low";

/**
 * Traduit la part du portefeuille couverte par des données émetteurs réelles
 * (0..1) en un palier de confiance affichable.
 * - high    : ≥ 70 % du poids couvert
 * - partial : ≥ 30 %
 * - low     : < 30 % (ou couverture nulle/invalide)
 */
export function carbonConfidenceTier(coverage: number): CarbonConfidence {
  if (!Number.isFinite(coverage) || coverage <= 0) return "low";
  if (coverage >= 0.7) return "high";
  if (coverage >= 0.3) return "partial";
  return "low";
}
