/**
 * Data-quality & monitoring — calculs purs pour le dashboard interne (§20/§21).
 *
 * Transforme un instantané de l'univers (identité + complétude + fraîcheur +
 * présence de sources/holdings) en indicateurs de santé : fonds suivis, à
 * mettre à jour, sans holdings, sans source, ISIN invalides, doublons, santé
 * des sources. Aucune I/O : l'appelant fournit les données lues en base.
 */

import { isValidIsin } from "./isin";

export interface FundQualitySummary {
  id: string;
  isin: string | null;
  ticker: string | null;
  /** Score de complétude 0-100 (cf. completeness.ts), null si non calculé. */
  completeness: number | null;
  holdingsCount: number;
  hasSource: boolean;
  /** Dernière mise à jour de données (ISO), null si jamais. */
  lastUpdated: string | null;
}

export interface DataQualityReport {
  fundsTracked: number;
  /** Complétude ≥ seuil ET données fraîches. */
  healthy: number;
  /** Données périmées (plus vieilles que staleDays) ou complétude faible. */
  needsUpdate: number;
  fundsWithoutHoldings: number;
  fundsWithoutSource: number;
  /** IDs des fonds dont l'ISIN renseigné est invalide (§21). */
  invalidIsinFundIds: string[];
  /** Doublons : valeur → IDs partageant le même ISIN / ticker. */
  duplicateIsin: Record<string, string[]>;
  duplicateTicker: Record<string, string[]>;
}

function groupDuplicates(
  funds: FundQualitySummary[],
  key: (f: FundQualitySummary) => string | null,
): Record<string, string[]> {
  const byValue = new Map<string, string[]>();
  for (const f of funds) {
    const v = key(f);
    if (!v) continue;
    const norm = v.toUpperCase();
    const list = byValue.get(norm) ?? [];
    list.push(f.id);
    byValue.set(norm, list);
  }
  const dups: Record<string, string[]> = {};
  for (const [v, ids] of byValue) if (ids.length > 1) dups[v] = ids;
  return dups;
}

export function computeDataQuality(
  funds: FundQualitySummary[],
  opts: { now?: Date; staleDays?: number; healthyMinCompleteness?: number } = {},
): DataQualityReport {
  const now = opts.now ?? new Date();
  const staleDays = opts.staleDays ?? 30;
  const minComplete = opts.healthyMinCompleteness ?? 80;
  const staleMs = staleDays * 86_400_000;

  let healthy = 0;
  let needsUpdate = 0;
  let fundsWithoutHoldings = 0;
  let fundsWithoutSource = 0;
  const invalidIsinFundIds: string[] = [];

  for (const f of funds) {
    if (f.isin && !isValidIsin(f.isin)) invalidIsinFundIds.push(f.id);
    if (f.holdingsCount === 0) fundsWithoutHoldings++;
    if (!f.hasSource) fundsWithoutSource++;

    const fresh =
      f.lastUpdated != null && now.getTime() - new Date(f.lastUpdated).getTime() <= staleMs;
    const complete = f.completeness != null && f.completeness >= minComplete;
    if (fresh && complete) healthy++;
    else needsUpdate++;
  }

  return {
    fundsTracked: funds.length,
    healthy,
    needsUpdate,
    fundsWithoutHoldings,
    fundsWithoutSource,
    invalidIsinFundIds,
    duplicateIsin: groupDuplicates(funds, (f) => f.isin),
    duplicateTicker: groupDuplicates(funds, (f) => f.ticker),
  };
}

export type SourceHealth = "healthy" | "degraded" | "broken" | "unknown";

export interface SourceHealthSummary {
  key: string;
  health: SourceHealth;
  lastCheckedAt: string | null;
}

/** Compte les sources par état de santé, pour la vignette « Source health » (§20). */
export function summarizeSourceHealth(
  sources: SourceHealthSummary[],
): Record<SourceHealth, number> {
  const counts: Record<SourceHealth, number> = {
    healthy: 0,
    degraded: 0,
    broken: 0,
    unknown: 0,
  };
  for (const s of sources) counts[s.health]++;
  return counts;
}
