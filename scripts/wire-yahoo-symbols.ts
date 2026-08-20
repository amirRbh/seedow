/**
 * Wiring `yahoo_symbol` — 1er maillon du pipeline d'enrichissement des ETF promus
 * (dormants, `is_active=false`). Pose un symbole Yahoo Finance validé sur une
 * fournée CURÉE d'ETF UCITS grand public UE, pour que l'ingestion horaire commence
 * à accumuler une série de cours réelle (prérequis de l'activation).
 *
 * Non destructif : ne met à jour QUE `assets.yahoo_symbol` (jamais posé auparavant),
 * n'active AUCUN fonds (`is_active` inchangé), ne touche aucune donnée ESG/prix.
 *
 * Anti-invention (§1.3) : le symbole est DÉRIVÉ (exchange+ticker, logique pure/
 * testée) puis VALIDÉ contre Yahoo (une vraie cotation + des barres existent).
 * Un symbole non validé est jeté — jamais écrit « au cas où ».
 *
 * Fournée curée : ETF (asset_type='etf') UCITS (nom), domicile IE/LU (ISIN),
 * place mappable. Bornée par WIRE_LIMIT pour rester douce avec Yahoo.
 *
 * Usage :
 *   bun run scripts/wire-yahoo-symbols.ts                 (dry-run : dérive + valide, aucune écriture)
 *   SEEDOW_PERSIST=1 bun run scripts/wire-yahoo-symbols.ts  (écrit ; secrets Supabase requis)
 * Env optionnel :
 *   WIRE_LIMIT   nombre max d'ETF traités (défaut : 50)
 */

import { deriveYahooSymbol } from "../src/lib/data-engine/market-symbol";
import { fetchYahooChart } from "../src/lib/market/yahoo.server";

const CATALOG_PAGE = 1000; // plafond PostgREST
const ASSETS_PAGE = 1000;
const VALIDATE_DELAY_MS = 250; // gentle avec Yahoo (API non officielle)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Admin = any;

interface CatalogRow {
  listing_key: string;
  ticker: string | null;
  exchange: string | null;
  name: string;
  isin: string | null;
}

/** ETF UCITS UE grand public : nom « UCITS » + domicile IE/LU + place mappable. */
function isCuratedEuUcits(c: CatalogRow): boolean {
  if (!/ucits/i.test(c.name)) return false;
  const prefix = (c.isin ?? "").slice(0, 2).toUpperCase();
  if (prefix !== "IE" && prefix !== "LU") return false;
  return deriveYahooSymbol(c.ticker, c.exchange) !== null;
}

async function loadCatalogEtfMap(admin: Admin): Promise<Map<string, CatalogRow>> {
  const map = new Map<string, CatalogRow>();
  let from = 0;
  for (;;) {
    const { data, error } = await admin
      .from("catalog_instruments")
      .select("listing_key, ticker, exchange, name, isin")
      .eq("asset_type", "etf")
      .range(from, from + CATALOG_PAGE - 1);
    if (error) throw new Error(`load catalog: ${error.message}`);
    const rows = (data ?? []) as CatalogRow[];
    for (const r of rows) map.set(r.listing_key, r);
    if (rows.length < CATALOG_PAGE) break;
    from += CATALOG_PAGE;
  }
  return map;
}

interface AssetRow {
  id: string;
  catalog_listing_key: string | null;
  yahoo_symbol: string | null;
  is_active: boolean;
}

async function loadPromotedNeedingSymbol(admin: Admin): Promise<AssetRow[]> {
  const out: AssetRow[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await admin
      .from("assets")
      .select("id, catalog_listing_key, yahoo_symbol, is_active")
      .not("catalog_listing_key", "is", null)
      .is("yahoo_symbol", null)
      .eq("is_active", false)
      .range(from, from + ASSETS_PAGE - 1);
    if (error) throw new Error(`load promoted assets: ${error.message}`);
    const rows = (data ?? []) as AssetRow[];
    out.push(...rows);
    if (rows.length < ASSETS_PAGE) break;
    from += ASSETS_PAGE;
  }
  return out;
}

/** Une vraie cotation existe pour ce symbole ? (prix fini + au moins une barre) */
async function symbolIsReal(symbol: string): Promise<boolean> {
  try {
    const { quote, bars } = await fetchYahooChart(symbol, "5d", "1d");
    return Number.isFinite(quote.price) && bars.length > 0;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const startedAt = Date.now();
  const doPersist = process.env.SEEDOW_PERSIST === "1";
  const limit = Math.max(1, Number(process.env.WIRE_LIMIT) || 50);
  console.log(`[wire] persist: ${doPersist} · limit: ${limit}`);

  const { supabaseAdmin } = await import("../src/integrations/supabase/client.server");
  const admin = supabaseAdmin as Admin;

  const catalog = await loadCatalogEtfMap(admin);
  const promoted = await loadPromotedNeedingSymbol(admin);
  console.log(`[wire] catalogue ETF=${catalog.size} · promus sans symbole=${promoted.length}`);

  let considered = 0;
  let derived = 0;
  let validated = 0;
  let updated = 0;
  let errors = 0;

  for (const a of promoted) {
    if (validated >= limit) break;
    const c = a.catalog_listing_key ? catalog.get(a.catalog_listing_key) : undefined;
    if (!c || !isCuratedEuUcits(c)) continue;
    considered++;
    const symbol = deriveYahooSymbol(c.ticker, c.exchange);
    if (!symbol) continue;
    derived++;

    const ok = await symbolIsReal(symbol);
    await new Promise((r) => setTimeout(r, VALIDATE_DELAY_MS));
    if (!ok) {
      console.log(`[wire] ✗ ${c.name} → ${symbol} (aucune cotation Yahoo)`);
      continue;
    }
    validated++;
    console.log(`[wire] ✓ ${c.name} → ${symbol}`);

    if (!doPersist) continue;
    const { error } = await admin
      .from("assets")
      .update({ yahoo_symbol: symbol })
      .eq("id", a.id)
      .is("yahoo_symbol", null); // défensif : ne jamais écraser un symbole existant
    if (error) {
      errors++;
      console.error(`[wire] update ${a.id} error: ${error.message}`);
    } else {
      updated++;
    }
  }

  console.log(
    `[wire] considérés=${considered} dérivés=${derived} validés=${validated} ` +
      `écrits=${updated} erreurs=${errors}`,
  );

  if (!doPersist) {
    console.log("[wire] dry-run (SEEDOW_PERSIST != 1) — aucun symbole écrit.");
    return;
  }

  const status = errors === 0 ? "ok" : updated > 0 ? "partial" : "error";
  await admin.from("cron_run_log").insert({
    job_name: "wire-yahoo-symbols",
    status,
    message: `${updated} symboles Yahoo posés (validés) sur ETF promus dormants`,
    assets_ok: updated,
    assets_failed: errors,
    duration_ms: Date.now() - startedAt,
    details: { considered, derived, validated, updated, limit },
  });

  console.log(`[wire] DONE status=${status} updated=${updated} errors=${errors}`);
}

main().catch((e) => {
  console.error("[wire] fatal:", e instanceof Error ? e.message : String(e));
  process.exit(1);
});
