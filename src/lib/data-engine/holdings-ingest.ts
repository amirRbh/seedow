/**
 * Orchestration de l'ingestion des holdings (N2) — le chaînon qui manquait.
 *
 * Enchaîne, par fonds : résolution de l'URL officielle → téléchargement →
 * parsing → contrôle qualité (holdings-quality) → persistance (fund_holdings).
 * Toutes les I/O sont INJECTÉES (résolveur d'URL, downloader, parser, writer)
 * pour rester testable hors réseau/DB et réutilisable (hook cron, script, admin).
 *
 * Principes non négociables portés ici :
 *  - jamais de holding inventé : un fonds sans fichier officiel → `no_source`,
 *    un fichier illisible/vide → `empty`, un lot qui échoue la QC dure →
 *    `rejected` (rien n'est persisté). On ne comble aucun trou.
 *  - traçabilité : chaque ligne persistée porte sa source, son URL et sa date
 *    de référence (déléguée à buildHoldingRows/persistHoldings).
 */

import {
  parseISharesHoldingsCsv,
  persistHoldings,
  type ParsedHoldings,
  type HoldingWriter,
} from "./holdings";
import { runHoldingsQualityChecks, type HoldingsQualityReport } from "./holdings-quality";

/** Fonds cible (sous-ensemble d'`assets` nécessaire à la résolution d'URL). */
export interface HoldingsIngestAsset {
  id: string;
  ticker: string;
  name: string;
  isin: string | null;
  issuer: string | null;
}

/** URL officielle résolue pour un fonds, ou null si aucune source exploitable. */
export interface ResolvedHoldingsSource {
  url: string;
  /** Clé/enregistrement `data_sources` (ex. iShares) — null accepté (source_url fait foi). */
  sourceId: string | null;
}

export interface HoldingsIngestDeps {
  /** Résout l'URL du fichier de holdings officiel pour un fonds (ou null). */
  resolveUrl: (asset: HoldingsIngestAsset) => Promise<ResolvedHoldingsSource | null> | ResolvedHoldingsSource | null;
  /** Télécharge le contenu texte (CSV) — lève en cas d'échec réseau. */
  download: (url: string) => Promise<string>;
  /** Persistance des lignes (writer Supabase en prod, mock en test). */
  writer: HoldingWriter;
  /** Parser (défaut : CSV iShares). Injectable pour d'autres formats. */
  parse?: (text: string) => ParsedHoldings;
  /** Horloge (retrieved_at) — injectable pour des tests déterministes. */
  now?: () => string;
}

export type HoldingsIngestStatus =
  | "ingested" // holdings publiés
  | "no_source" // aucun fichier officiel résolu
  | "fetch_failed" // téléchargement en échec
  | "empty" // fichier lu mais aucune composition exploitable
  | "rejected"; // QC dure en échec → non persisté

export interface HoldingsIngestResult {
  assetId: string;
  status: HoldingsIngestStatus;
  inserted: number;
  asOf: string | null;
  qc?: HoldingsQualityReport;
  error?: string;
}

/** Ingère les holdings d'UN fonds. Ne lève jamais : encode l'échec dans `status`. */
export async function ingestHoldingsForAsset(
  asset: HoldingsIngestAsset,
  deps: HoldingsIngestDeps,
): Promise<HoldingsIngestResult> {
  const parse = deps.parse ?? parseISharesHoldingsCsv;
  const now = deps.now ?? (() => new Date().toISOString());

  const source = await deps.resolveUrl(asset);
  if (!source) return { assetId: asset.id, status: "no_source", inserted: 0, asOf: null };

  let text: string;
  try {
    text = await deps.download(source.url);
  } catch (err) {
    return {
      assetId: asset.id,
      status: "fetch_failed",
      inserted: 0,
      asOf: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  const parsed = parse(text);
  if (parsed.holdings.length === 0) {
    return { assetId: asset.id, status: "empty", inserted: 0, asOf: parsed.asOf };
  }

  const qc = runHoldingsQualityChecks({
    asOf: parsed.asOf,
    holdings: parsed.holdings,
    sourceId: source.sourceId,
    sourceUrl: source.url,
  });
  if (qc.status === "rejected") {
    return { assetId: asset.id, status: "rejected", inserted: 0, asOf: parsed.asOf, qc };
  }

  const { inserted, asOf } = await persistHoldings(deps.writer, asset.id, parsed, {
    sourceId: source.sourceId,
    sourceUrl: source.url,
    retrievedAt: now(),
  });
  return { assetId: asset.id, status: "ingested", inserted, asOf, qc };
}

export interface HoldingsIngestSummary {
  total: number;
  ingested: number;
  no_source: number;
  fetch_failed: number;
  empty: number;
  rejected: number;
  holdingsInserted: number;
}

/** Ingère un lot de fonds séquentiellement (poli envers les serveurs officiels). */
export async function ingestHoldingsForAssets(
  assets: HoldingsIngestAsset[],
  deps: HoldingsIngestDeps,
): Promise<{ results: HoldingsIngestResult[]; summary: HoldingsIngestSummary }> {
  const results: HoldingsIngestResult[] = [];
  for (const asset of assets) {
    results.push(await ingestHoldingsForAsset(asset, deps));
  }
  const summary: HoldingsIngestSummary = {
    total: results.length,
    ingested: results.filter((r) => r.status === "ingested").length,
    no_source: results.filter((r) => r.status === "no_source").length,
    fetch_failed: results.filter((r) => r.status === "fetch_failed").length,
    empty: results.filter((r) => r.status === "empty").length,
    rejected: results.filter((r) => r.status === "rejected").length,
    holdingsInserted: results.reduce((s, r) => s + r.inserted, 0),
  };
  return { results, summary };
}
