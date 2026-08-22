/**
 * Profil LOOK-THROUGH d'un fonds (pivot PIU, §7/§9) : « ce que ce fonds contient »
 * et « ce que ton argent finance », dérivé de sa composition réelle
 * (`fund_holdings`, datée et sourcée). Fonctions PURES, aucune I/O — testées seules.
 *
 * Honnêteté non négociable (§1.2/§1.3) :
 *  - la COUVERTURE (somme des poids connus) est calculée et exposée : une
 *    exposition « X % » n'a de sens que rapportée à la part du fonds réellement
 *    couverte. On ne présente jamais une répartition comme exhaustive si elle ne
 *    l'est pas ;
 *  - une dimension sans donnée (secteur/pays absent des lignes) n'est pas
 *    inventée : la répartition correspondante est vide, à afficher « en attente » ;
 *  - la concentration est calculée sur les titres SOUS-JACENTS (pas les fonds) —
 *    c'est la vraie granularité de « ce que ton argent finance ».
 */

export interface HoldingLine {
  securityName: string;
  securityIsin: string | null;
  sector: string | null;
  country: string | null;
  /** Poids dans le fonds, en % (0..100). */
  weightPct: number | null;
}

export interface BreakdownSlice {
  key: string;
  /** Poids agrégé, en % du fonds. */
  weightPct: number;
}

export interface LookThroughProfile {
  asOf: string | null;
  /** Nombre de lignes/titres sous-jacents. */
  holdingsCount: number;
  /** Somme des poids connus, en % (la « couverture » de la composition). */
  coveragePct: number;
  /** Titres, poids décroissant. */
  topHoldings: { name: string; isin: string | null; weightPct: number }[];
  /** Répartition sectorielle (vide si le document ne fournit pas les secteurs). */
  sectorBreakdown: BreakdownSlice[];
  /** Répartition géographique (vide si non fournie). */
  geographyBreakdown: BreakdownSlice[];
  concentration: {
    /** HHI sur les poids des titres (part de 1), ∈ [0,1]. */
    hhi: number;
    /** Nombre effectif de titres = 1/HHI. */
    effectiveHoldings: number;
    /** Poids de la plus grosse ligne, en % du fonds. */
    topWeightPct: number;
  } | null;
}

function num(w: number | null | undefined): number {
  return typeof w === "number" && Number.isFinite(w) && w > 0 ? w : 0;
}

/** Agrège les poids par clé (secteur/pays), triés décroissant. Ignore les clés nulles. */
function breakdown(
  lines: HoldingLine[],
  pick: (l: HoldingLine) => string | null,
): BreakdownSlice[] {
  const acc = new Map<string, number>();
  for (const l of lines) {
    const key = pick(l);
    const w = num(l.weightPct);
    if (!key || w <= 0) continue;
    acc.set(key, (acc.get(key) ?? 0) + w);
  }
  return [...acc.entries()]
    .map(([key, weightPct]) => ({ key, weightPct }))
    .sort((a, b) => b.weightPct - a.weightPct);
}

/**
 * Construit le profil look-through d'un fonds depuis ses lignes de composition.
 * `topN` borne la liste des principaux titres (défaut 10).
 */
export function buildLookThroughProfile(
  lines: HoldingLine[],
  asOf: string | null,
  topN = 10,
): LookThroughProfile {
  const coveragePct = lines.reduce((s, l) => s + num(l.weightPct), 0);

  const topHoldings = [...lines]
    .map((l) => ({ name: l.securityName, isin: l.securityIsin, weightPct: num(l.weightPct) }))
    .filter((h) => h.weightPct > 0)
    .sort((a, b) => b.weightPct - a.weightPct)
    .slice(0, topN);

  // Concentration sur les titres sous-jacents (parts renormalisées à la couverture).
  let concentration: LookThroughProfile["concentration"] = null;
  if (coveragePct > 0) {
    let hhi = 0;
    let topWeightPct = 0;
    for (const l of lines) {
      const w = num(l.weightPct);
      if (w <= 0) continue;
      const share = w / coveragePct; // part au sein du couvert
      hhi += share * share;
      if (w > topWeightPct) topWeightPct = w;
    }
    concentration = {
      hhi,
      effectiveHoldings: hhi > 0 ? 1 / hhi : 0,
      topWeightPct,
    };
  }

  return {
    asOf,
    holdingsCount: lines.length,
    coveragePct,
    topHoldings,
    sectorBreakdown: breakdown(lines, (l) => l.sector),
    geographyBreakdown: breakdown(lines, (l) => l.country),
    concentration,
  };
}
