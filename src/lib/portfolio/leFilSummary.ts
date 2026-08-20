/**
 * Résumés purs pour l'accueil « Le Fil ». Extraits du composant de route pour
 * être testables (CLAUDE.md §8) et réutilisables. Aucune dépendance UI.
 */

/** Sous-ensemble d'un holding nécessaire aux résumés du Fil. */
export interface LeFilHolding {
  allocationPct: number;
  esgScore: number;
  category: string;
}

/**
 * Score d'impact pondéré (0..100) : moyenne des scores ESG pondérée par
 * l'allocation. `null` si aucune ligne ou poids total nul — rien à mesurer,
 * on n'affiche pas un 0 trompeur.
 */
export function weightedImpactScore(holdings: readonly LeFilHolding[]): number | null {
  let sumW = 0;
  let sum = 0;
  for (const h of holdings) {
    const w = h.allocationPct ?? 0;
    sumW += w;
    sum += w * (h.esgScore ?? 0);
  }
  if (sumW === 0) return null;
  return Math.round(sum / sumW);
}

/** Une famille d’actifs et le poids cumulé qu’elle représente (en %). */
export interface CategoryWeight {
  category: string;
  weightPct: number;
}

/**
 * Catégories dominantes AVEC leur poids cumulé (« Ce que je finance »), triées
 * par poids décroissant et limitées à `limit`. Une catégorie vide retombe sur
 * `fallback`.
 *
 * Le poids compte : afficher « Actions » sans dire si c’est 5 % ou 70 % du
 * portefeuille ne renseigne pas l’utilisateur sur ce qu’il finance vraiment.
 */
export function dominantCategoryWeights(
  holdings: readonly LeFilHolding[],
  limit = 3,
  fallback = "other",
): CategoryWeight[] {
  const byCat = new Map<string, number>();
  for (const h of holdings) {
    const cat = h.category || fallback;
    byCat.set(cat, (byCat.get(cat) ?? 0) + (h.allocationPct ?? 0));
  }
  return [...byCat.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([category, weightPct]) => ({ category, weightPct }));
}

/**
 * Catégories dominantes (« Ce que je finance »), triées par poids cumulé
 * décroissant et limitées à `limit`. Une catégorie vide retombe sur `fallback`.
 */
export function dominantCategories(
  holdings: readonly LeFilHolding[],
  limit = 3,
  fallback = "Autres",
): string[] {
  return dominantCategoryWeights(holdings, limit, fallback).map((c) => c.category);
}

/**
 * Principales lignes, du plus gros poids au plus petit, limitées à `limit`.
 * Ne mute pas l'entrée (copie avant tri).
 */
export function topHoldingsByWeight<T extends { allocationPct: number }>(
  holdings: readonly T[],
  limit = 4,
): T[] {
  return [...holdings]
    .sort((a, b) => (b.allocationPct ?? 0) - (a.allocationPct ?? 0))
    .slice(0, limit);
}

/** Sens de la variation, doublé d’un mot à l’écran (jamais la couleur seule). */
export type MoneyTrend = "up" | "down" | "flat";

/** Ce que dit le nœud « Mon argent » : deux repères et l’écart entre eux. */
export interface MoneySummary {
  /** Montant investi au départ — le repère de comparaison. */
  invested: number;
  /** Valeur d’aujourd’hui, aux derniers cours connus. */
  currentValue: number;
  /** Écart en euros (négatif = en baisse). */
  gain: number;
  /** Le même écart en POINTS de pourcentage (-0.7 = -0,70 %). */
  returnPoints: number;
  trend: MoneyTrend;
}

/**
 * Résume « mon argent » à partir des deux seuls chiffres qui font sens pour un
 * néophyte : ce qu’il a mis, ce que ça vaut. L’écart en % est toujours dérivé
 * du MÊME couple — un pourcentage et un montant qui ne racontent pas la même
 * histoire (cf. « -70,43 % · -0,79 € ») détruit la confiance dans l’écran.
 *
 * `flat` dès que l’écart s’arrondit à 0,00 € : on n’annonce pas une baisse que
 * le montant affiché ne montre pas.
 */
export function summarizeMoney(invested: number, currentValue: number): MoneySummary {
  const gain = currentValue - invested;
  const returnPoints = invested > 0 ? (gain / invested) * 100 : 0;
  const trend: MoneyTrend = Math.abs(gain) < 0.005 ? "flat" : gain > 0 ? "up" : "down";
  return { invested, currentValue, gain, returnPoints, trend };
}
