/**
 * Impact d'une COLLECTION (pivot PIU, §9/§10). Agrège les compositions
 * look-through des fonds d'une collection AU NIVEAU DU TITRE SOUS-JACENT — la
 * déduplication est le cœur : deux ETF détenant tous deux TotalEnergies
 * produisent UNE exposition consolidée, pas deux (§9.1). C'est ce qui distingue
 * une vraie diversification d'une fausse (fonds redondants).
 *
 * Réutilise le moteur d'overlap existant (`lib/portfolio/overlap.ts`, §23) :
 * pairwiseOverlap / portfolioOverlap / aggregateExposure /
 * lookThroughDiversification. On n'y ajoute que l'agrégation par secteur/pays et
 * l'exposition consolidée LISIBLE (nom du titre + % de la collection).
 *
 * Honnêteté (§1.2/§1.3) : chaque métrique porte sa COUVERTURE (part du poids de
 * la collection dont on connaît réellement la composition). Un fonds sans
 * holdings est exclu du look-through, jamais complété par des holdings inventés ;
 * l'exposition consolidée est en % du TOTAL de la collection (pas renormalisée),
 * pour ne jamais gonfler un chiffre au-delà de ce qu'on voit.
 *
 * Fonctions PURES, aucune I/O.
 */

import {
  aggregateExposure,
  lookThroughDiversification,
  portfolioOverlap,
  type HoldingWeights,
} from "@/lib/portfolio/overlap";
import type { PortfolioWeights } from "@/lib/portfolio/types";
import type { HoldingLine } from "./lookthrough";

/** Un fonds de la collection + sa composition. `weight` = part dans la collection (0..1). */
export interface CollectionFund {
  assetId: string;
  weight: number;
  holdings: HoldingLine[];
}

export interface ConsolidatedSecurity {
  key: string;
  name: string;
  isin: string | null;
  /** Poids dans la collection ENTIÈRE, en % (raw, non renormalisé). */
  weightPct: number;
}

export interface CollectionBreakdownSlice {
  key: string;
  weightPct: number;
}

export interface CollectionImpact {
  /** Part du poids de la collection dont la composition est connue (0..1). */
  coverage: number;
  /** Nb de titres sous-jacents DISTINCTS (après dédup). */
  underlyingCount: number;
  /** Titres consolidés, poids décroissant (% de la collection). */
  topSecurities: ConsolidatedSecurity[];
  sectorBreakdown: CollectionBreakdownSlice[];
  geographyBreakdown: CollectionBreakdownSlice[];
  /** Diversification VRAIE look-through = 1 − HHI(titres). null si rien de couvert. */
  trueDiversification: number | null;
  /** Nombre effectif de titres = 1/HHI (sur l'exposition couverte). null si vide. */
  effectiveHoldings: number | null;
  /** Overlap moyen pondéré entre fonds ∈ [0,1]. null si < 2 fonds couverts. */
  overlap: number | null;
  /** Nb de fonds de la collection dont la composition est connue. */
  coveredFunds: number;
  /** Nb total de fonds de la collection. */
  totalFunds: number;
}

/** Clé canonique d'un titre : ISIN si présent, sinon nom normalisé. */
function securityKey(line: HoldingLine): string {
  if (line.securityIsin && line.securityIsin.trim()) return line.securityIsin.trim().toUpperCase();
  return `name:${line.securityName.trim().toLowerCase()}`;
}

function num(w: number | null | undefined): number {
  return typeof w === "number" && Number.isFinite(w) && w > 0 ? w : 0;
}

/** Agrège des contributions (fundWeight·part) par clé, triées décroissant. */
function aggregateBy(
  funds: CollectionFund[],
  pick: (l: HoldingLine) => string | null,
): CollectionBreakdownSlice[] {
  const acc = new Map<string, number>();
  for (const f of funds) {
    const fw = num(f.weight);
    if (fw <= 0) continue;
    for (const l of f.holdings) {
      const key = pick(l);
      const part = num(l.weightPct) / 100;
      if (!key || part <= 0) continue;
      acc.set(key, (acc.get(key) ?? 0) + fw * part * 100); // en % de la collection
    }
  }
  return [...acc.entries()]
    .map(([key, weightPct]) => ({ key, weightPct }))
    .sort((a, b) => b.weightPct - a.weightPct);
}

/** Construit le profil d'impact consolidé d'une collection. */
export function buildCollectionImpact(funds: CollectionFund[], topN = 10): CollectionImpact {
  const totalFunds = funds.length;
  const covered = funds.filter((f) => f.holdings.length > 0 && num(f.weight) > 0);

  // Poids de portefeuille (tous fonds) + compositions (fonds couverts) pour le
  // moteur d'overlap existant.
  const portfolioWeights: PortfolioWeights = {};
  for (const f of funds) portfolioWeights[f.assetId] = num(f.weight);

  const holdingsByAsset = new Map<string, HoldingWeights>();
  // Exposition consolidée LISIBLE (% du total collection) + méta par titre.
  const rawExposure = new Map<string, number>();
  const meta = new Map<string, { name: string; isin: string | null }>();

  for (const f of covered) {
    const fw = num(f.weight);
    const hw: HoldingWeights = new Map();
    for (const l of f.holdings) {
      const part = num(l.weightPct) / 100;
      if (part <= 0) continue;
      const key = securityKey(l);
      hw.set(key, (hw.get(key) ?? 0) + part);
      rawExposure.set(key, (rawExposure.get(key) ?? 0) + fw * part * 100);
      if (!meta.has(key)) meta.set(key, { name: l.securityName, isin: l.securityIsin });
    }
    holdingsByAsset.set(f.assetId, hw);
  }

  const topSecurities: ConsolidatedSecurity[] = [...rawExposure.entries()]
    .map(([key, weightPct]) => ({
      key,
      name: meta.get(key)?.name ?? key,
      isin: meta.get(key)?.isin ?? null,
      weightPct,
    }))
    .sort((a, b) => b.weightPct - a.weightPct)
    .slice(0, topN);

  const div = lookThroughDiversification(portfolioWeights, holdingsByAsset);
  const ov = portfolioOverlap(portfolioWeights, holdingsByAsset);

  // Nombre effectif de titres via l'exposition renormalisée (HHI sur le couvert).
  const distribution = aggregateExposure(portfolioWeights, holdingsByAsset);
  let hhi = 0;
  for (const v of distribution.values()) hhi += v * v;
  const effectiveHoldings = distribution.size > 0 && hhi > 0 ? 1 / hhi : null;

  return {
    coverage: div.coverage,
    underlyingCount: rawExposure.size,
    topSecurities,
    sectorBreakdown: aggregateBy(covered, (l) => l.sector),
    geographyBreakdown: aggregateBy(covered, (l) => l.country),
    trueDiversification: div.diversification,
    effectiveHoldings,
    overlap: ov.overlap,
    coveredFunds: covered.length,
    totalFunds,
  };
}
