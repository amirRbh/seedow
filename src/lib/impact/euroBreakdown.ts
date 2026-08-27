/**
 * « Sur 1 000 € investis, voilà où ils vont. »
 *
 * Un pourcentage ne se ressent pas. « Technologie 31,4 % » est un fait exact et
 * une phrase morte ; « 314 € sur 1 000 € » est le même fait, et il se comprend
 * sans rien savoir de la finance. Ce module ne fait que ça : reformuler la
 * composition publiée par l'émetteur en euros, sur un montant de référence.
 *
 * ── Ce que ce module s'interdit ────────────────────────────────────────────
 *
 * Il ne modélise rien, n'estime rien, ne complète rien. Chaque euro affiché est
 * le produit d'un poids RÉELLEMENT publié (`fund_holdings.weight_pct`) par le
 * montant de référence. Conséquences directes, et voulues :
 *
 *   - les poids publiés ne totalisent presque jamais 100 % (liquidités,
 *     dérivés, arrondis) : l'écart ressort en `undescribedEuros`, nommé à
 *     l'écran, jamais redistribué. Renormaliser à 100 % fabriquerait une
 *     composition que l'émetteur n'a pas publiée ;
 *   - une ligne sans secteur publié n'est pas rangée sous « Autres » : elle
 *     alimente `sectorUnknownEuros`, qui se lit « secteur non publié » et non
 *     « secteur divers » — les deux ne veulent pas dire la même chose ;
 *   - sans aucune ligne exploitable, la fonction renvoie `null`. L'appelant
 *     doit alors dire que la composition n'est pas publiée, pas afficher un
 *     graphique vide qui se lit comme « ce fonds ne finance rien ».
 *
 * Module PUR : aucune requête, aucun effet de bord.
 */

import type { HoldingLine } from "@/lib/portfolio/holdings-summary";

/** Montant de référence par défaut — celui qui parle sans calcul mental. */
export const DEFAULT_REFERENCE_AMOUNT = 1000;

/** Montants proposés à l'utilisateur : le sien tient presque toujours entre. */
export const REFERENCE_AMOUNTS = [100, 1000, 10000] as const;

export interface EuroSlice {
  /** Libellé tel que l'émetteur le publie — jamais retraduit ni regroupé. */
  key: string;
  /** Part du montant de référence, en euros. */
  euros: number;
  /** Poids publié, en points de pourcentage (0..100). */
  weightPct: number;
}

export interface EuroBreakdown {
  /** Montant de référence utilisé pour la conversion. */
  amount: number;
  /** Part du montant dont la composition publiée décrit la destination. */
  describedEuros: number;
  /** Le reste : liquidités, dérivés, arrondis. Nommé, jamais réparti. */
  undescribedEuros: number;
  /** Vrai quand la somme publiée dépasse 100 % — l'écart est alors expliqué en sens inverse. */
  publishedOver100: boolean;
  /** Secteurs publiés, poids décroissant, limités à `sectorLimit`. */
  sectors: EuroSlice[];
  /** Secteurs publiés au-delà de la limite, agrégés (regroupement assumé, pas une catégorie inventée). */
  sectorsRestEuros: number;
  /** Lignes portant un poids mais dont l'émetteur ne publie pas le secteur. */
  sectorUnknownEuros: number;
  /** Principales positions, poids décroissant, limitées à `companyLimit`. */
  companies: EuroSlice[];
  /** Positions publiées au-delà de la limite, agrégées. */
  companiesRestEuros: number;
  /** Nombre de positions restantes derrière `companiesRestEuros`. */
  companiesRestCount: number;
  /** Frais annuels sur ce montant, si le TER est connu. `null` sinon — jamais 0 par défaut. */
  feesPerYear: number | null;
  /** Nombre de lignes portant un poids exploitable. */
  lineCount: number;
  /** Somme des poids publiés, telle quelle (0..100+). */
  totalWeightPct: number;
}

export interface EuroBreakdownOptions {
  /** Montant de référence (défaut : 1 000 €). */
  amount?: number;
  /** Frais courants annuels, en FRACTION (0.0022 = 0,22 %). `null` si inconnu. */
  ter?: number | null;
  sectorLimit?: number;
  companyLimit?: number;
}

/** Un poids n'est exploitable que fini et strictement positif. */
function usableWeight(w: number | null | undefined): w is number {
  return typeof w === "number" && Number.isFinite(w) && w > 0;
}

function usableSector(s: string | null | undefined): s is string {
  return typeof s === "string" && s.trim() !== "";
}

/**
 * Convertit la composition publiée en euros sur un montant de référence.
 *
 * Renvoie `null` quand aucune ligne n'est exploitable : l'absence de
 * composition est une information à dire, pas un graphique à vider.
 */
export function buildEuroBreakdown(
  holdings: readonly HoldingLine[],
  {
    amount = DEFAULT_REFERENCE_AMOUNT,
    ter = null,
    sectorLimit = 5,
    companyLimit = 8,
  }: EuroBreakdownOptions = {},
): EuroBreakdown | null {
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const weighted = holdings.filter((h) => usableWeight(h.weightPct));
  if (weighted.length === 0) return null;

  const toEuros = (weightPct: number) => (weightPct / 100) * amount;

  const totalWeightPct = weighted.reduce((s, h) => s + (h.weightPct as number), 0);
  const describedEuros = Math.min(amount, toEuros(totalWeightPct));
  // L'écart appartient à la donnée : on le borne à zéro plutôt que d'afficher
  // un « -12 € non décrits » quand la somme publiée dépasse 100 %.
  const undescribedEuros = Math.max(0, amount - toEuros(totalWeightPct));

  // ── Secteurs ────────────────────────────────────────────────────────────
  const bySector = new Map<string, number>();
  let unknownSectorWeight = 0;
  for (const h of weighted) {
    const w = h.weightPct as number;
    if (usableSector(h.sector)) {
      const key = h.sector.trim();
      bySector.set(key, (bySector.get(key) ?? 0) + w);
    } else {
      unknownSectorWeight += w;
    }
  }
  const sortedSectors = [...bySector.entries()].sort((a, b) => b[1] - a[1]);
  const keptSectors = sortedSectors.slice(0, sectorLimit);
  const restSectorWeight = sortedSectors.slice(sectorLimit).reduce((s, [, w]) => s + w, 0);

  // ── Positions ───────────────────────────────────────────────────────────
  const sortedHoldings = [...weighted].sort(
    (a, b) => (b.weightPct as number) - (a.weightPct as number),
  );
  const keptCompanies = sortedHoldings.slice(0, companyLimit);
  const restCompanies = sortedHoldings.slice(companyLimit);
  const restCompanyWeight = restCompanies.reduce((s, h) => s + (h.weightPct as number), 0);

  return {
    amount,
    describedEuros,
    undescribedEuros,
    publishedOver100: totalWeightPct > 100,
    sectors: keptSectors.map(([key, weightPct]) => ({
      key,
      weightPct,
      euros: toEuros(weightPct),
    })),
    sectorsRestEuros: toEuros(restSectorWeight),
    sectorUnknownEuros: toEuros(unknownSectorWeight),
    companies: keptCompanies.map((h) => ({
      key: h.name,
      weightPct: h.weightPct as number,
      euros: toEuros(h.weightPct as number),
    })),
    companiesRestEuros: toEuros(restCompanyWeight),
    companiesRestCount: restCompanies.length,
    // Un TER absent n'est pas un TER nul : sans donnée, pas de ligne de frais.
    feesPerYear: typeof ter === "number" && Number.isFinite(ter) && ter >= 0 ? ter * amount : null,
    lineCount: weighted.length,
    totalWeightPct,
  };
}
