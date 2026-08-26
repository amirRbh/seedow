/**
 * « Ce qu'il y a derrière ton investissement », en une phrase avant la liste.
 *
 * Une composition, c'est mille lignes. Les afficher telles quelles — Apple
 * 4,2 %, Microsoft 3,8 % — ne répond pas à la question que l'utilisateur pose ;
 * ça la remplace par un tableau qu'il ne sait pas lire. La première chose à
 * dire est le SECTEUR dominant, en français, parce que c'est ce qui décrit
 * réellement à quoi son argent est exposé.
 *
 * Module pur : il regroupe et ordonne, il ne calcule aucun score et ne juge
 * rien. Les poids sont ceux publiés par l'émetteur ; on ne les renormalise
 * jamais, y compris quand leur somme n'atteint pas 100 % (liquidités, dérivés,
 * arrondis). L'écart appartient à la donnée, pas à nous.
 */

export interface HoldingLine {
  name: string;
  ticker: string | null;
  sector: string | null;
  weightPct: number | null;
}

export interface SectorWeight {
  sector: string;
  weightPct: number;
}

export interface HoldingsSummary {
  /** Secteurs par poids décroissant. Vide si aucun secteur n'est renseigné. */
  topSectors: SectorWeight[];
  /** Principales positions, poids décroissant. */
  topHoldings: HoldingLine[];
  /** Somme des poids publiés (0..100+). Jamais ramenée à 100. */
  totalWeightPct: number;
  /** Nombre de lignes portant un poids exploitable. */
  count: number;
}

/**
 * Secteur non renseigné : on l'écarte du classement plutôt que de le ranger
 * sous « Autres », qui laisserait croire à une catégorie réelle.
 */
function usableSector(s: string | null): s is string {
  return typeof s === "string" && s.trim() !== "";
}

export function summarizeHoldings(
  holdings: readonly HoldingLine[],
  { sectors = 3, top = 10 }: { sectors?: number; top?: number } = {},
): HoldingsSummary {
  const weighted = holdings.filter(
    (h) => typeof h.weightPct === "number" && Number.isFinite(h.weightPct) && h.weightPct > 0,
  );

  const bySector = new Map<string, number>();
  for (const h of weighted) {
    if (!usableSector(h.sector)) continue;
    bySector.set(h.sector, (bySector.get(h.sector) ?? 0) + (h.weightPct ?? 0));
  }

  return {
    topSectors: [...bySector.entries()]
      .map(([sector, weightPct]) => ({ sector, weightPct }))
      .sort((a, b) => b.weightPct - a.weightPct)
      .slice(0, sectors),
    topHoldings: [...weighted]
      .sort((a, b) => (b.weightPct ?? 0) - (a.weightPct ?? 0))
      .slice(0, top),
    totalWeightPct: weighted.reduce((s, h) => s + (h.weightPct ?? 0), 0),
    count: weighted.length,
  };
}
