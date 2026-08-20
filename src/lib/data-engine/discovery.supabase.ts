/**
 * Adaptateur Supabase de la découverte de fonds (I/O réelle, server-only).
 *
 * Deux effets, tous deux à partir du MÊME export screener (edge-friendly, sans
 * PDF) :
 *   1. Crée les fonds absents du catalogue en `is_active=false` (identité).
 *   2. Enrichit en ESG les fonds — nouveaux comme existants sans source ESG —
 *      quand le screener publie SFDR / qualité MSCI / WACI. On ne remplace jamais
 *      une source ESG déjà présente, et on n'écrit que ce que l'export contient
 *      réellement (§1.3, aucune donnée inventée).
 *
 * La décision de QUOI créer (dédoublonnage) est pure (`planAssetInserts`).
 */

import type { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { DiscoveredFund, ExistingAssetKey } from "./discovery";
import { planAssetInserts } from "./discovery";

export interface EnsureResult {
  created: number;
  enriched: number;
  skippedExisting: number;
  createdTickers: string[];
}

/** Champs ESG à écrire depuis un fonds découvert, uniquement si présents. */
function esgFields(f: DiscoveredFund): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (f.esgScore != null) {
    row.esg_score = f.esgScore;
    row.esg_score_source = "MSCI (iShares product screener)";
  }
  if (f.sfdrArticle != null) row.sfdr_article = f.sfdrArticle;
  if (f.msciEsgQualityScore != null) row.msci_esg_quality_score = f.msciEsgQualityScore;
  if (f.waci != null) row.waci_tco2e_per_musd_sales = f.waci;
  if (f.esgAsOf) row.esg_data_asof = f.esgAsOf;
  return row;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function ensureDiscoveredAssets(
  client: typeof supabaseAdmin,
  discovered: DiscoveredFund[],
): Promise<EnsureResult> {
  if (discovered.length === 0)
    return { created: 0, enriched: 0, skippedExisting: 0, createdTickers: [] };
  const c = client as any;

  // Clés existantes (actifs actifs ET inactifs) + provenance ESG, pour ne jamais
  // dupliquer et savoir qui enrichir.
  const { data: existingRows, error: selErr } = await c
    .from("assets")
    .select("id, ticker, isin, esg_score_source")
    .limit(5000);
  if (selErr) throw new Error(`ensureDiscoveredAssets/select: ${selErr.message}`);
  const existingAll = (existingRows ?? []) as {
    id: string;
    ticker: string;
    isin: string | null;
    esg_score_source: string | null;
  }[];
  const existing: ExistingAssetKey[] = existingAll.map((r) => ({
    ticker: String(r.ticker),
    isin: r.isin != null ? String(r.isin) : null,
  }));

  const { toCreate, skippedExisting } = planAssetInserts(existing, discovered);

  // 1) Création des fonds absents (identité + ESG si présent), inactifs.
  let createdTickers: string[] = [];
  if (toCreate.length > 0) {
    const rows = toCreate.map((f) => {
      const row: Record<string, unknown> = {
        ticker: f.ticker,
        name: f.name,
        asset_class: f.assetClass,
        issuer: f.issuer,
        isin: f.isin,
        region: f.region,
        is_active: false,
        ...esgFields(f),
      };
      if (f.currency) row.currency = f.currency;
      if (f.ter != null) row.ter = f.ter;
      if (f.yahooSymbol) row.yahoo_symbol = f.yahooSymbol;
      // Si aucune donnée ESG dans le screener, on laisse esg_score_source à null
      // (défaut) — le fonds reste enrichissable par la voie factsheet plus tard.
      if (row.esg_score_source == null) row.esg_score_source = null;
      return row;
    });
    const { data: inserted, error: insErr } = await c
      .from("assets")
      .upsert(rows, { onConflict: "ticker", ignoreDuplicates: true })
      .select("ticker");
    if (insErr) throw new Error(`ensureDiscoveredAssets/insert: ${insErr.message}`);
    createdTickers = (inserted ?? []).map((r: any) => String(r.ticker));
  }

  // 2) Enrichissement ESG des fonds EXISTANTS sans source ESG, depuis le screener.
  //    On ne touche jamais un fonds qui a déjà une source (ne pas écraser MSCI réel).
  const byTicker = new Map(existingAll.map((r) => [r.ticker.toUpperCase(), r]));
  const byIsin = new Map(
    existingAll.filter((r) => r.isin).map((r) => [String(r.isin).toUpperCase(), r]),
  );
  let enriched = 0;
  for (const f of discovered) {
    const match =
      byTicker.get(f.ticker.toUpperCase()) ??
      (f.isin ? byIsin.get(f.isin.toUpperCase()) : undefined);
    if (!match || match.esg_score_source != null) continue; // déjà sourcé → intact
    const fields = esgFields(f);
    if (Object.keys(fields).length === 0) continue; // rien à écrire
    const { error: upErr } = await c.from("assets").update(fields).eq("id", match.id);
    if (upErr) {
      console.error(`[discovery] enrich ${match.ticker} failed:`, upErr.message);
      continue;
    }
    enriched++;
  }

  return {
    created: createdTickers.length,
    enriched,
    skippedExisting: skippedExisting.length,
    createdTickers,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */
