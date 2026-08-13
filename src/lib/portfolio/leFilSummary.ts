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

/**
 * Catégories dominantes (« Ce que je finance »), triées par poids cumulé
 * décroissant et limitées à `limit`. Une catégorie vide retombe sur `fallback`.
 */
export function dominantCategories(
  holdings: readonly LeFilHolding[],
  limit = 3,
  fallback = "Autres",
): string[] {
  const byCat = new Map<string, number>();
  for (const h of holdings) {
    const cat = h.category || fallback;
    byCat.set(cat, (byCat.get(cat) ?? 0) + (h.allocationPct ?? 0));
  }
  return [...byCat.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([c]) => c);
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
