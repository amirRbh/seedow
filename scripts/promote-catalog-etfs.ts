/**
 * Promotion CURÉE catalogue → moteur : sélectionne des ETF de `catalog_instruments`
 * (source Adanos) et les insère dans `assets` en `is_active = false`. Second
 * chantier de l'intégration Adanos (le premier remplit le catalogue).
 *
 * Non destructif : n'INSÈRE que de nouveaux `assets` dormants et BACKFILL le lien
 * `catalog_listing_key` sur les assets déjà présents (matché par ISIN). Ne modifie
 * aucune donnée ESG/prix/holdings existante, n'active aucun fonds. La logique de
 * mapping/sélection est PURE et testée (`src/lib/data-engine/promotion.ts`).
 *
 * Garde-fous (voir promotion.ts) : ETF uniquement, ISIN requis, `asset_class` mappé
 * sans invention (Fixed Income/Alternative/… non promus ; Leveraged-Inverse/
 * Volatility exclus délibérément), `is_active=false` → jamais vu par l'optimiseur.
 *
 * Usage :
 *   bun run scripts/promote-catalog-etfs.ts                 (dry-run : rapport seul)
 *   SEEDOW_PERSIST=1 bun run scripts/promote-catalog-etfs.ts  (écrit ; secrets Supabase requis)
 * Env optionnel :
 *   PROMOTE_LIMIT   plafond du nombre d'insertions (ex. 500 pour une 1re vague ; défaut : tout)
 */

import {
  mapEtfCategoryToAssetClass,
  buildPromotedAsset,
  computePromotionReport,
  type CatalogInstrumentRow,
} from "../src/lib/data-engine/promotion";

// PostgREST plafonne chaque lecture à 1000 lignes (max-rows) : paginer par 1000,
// sinon `.range(0, 9999)` ne renvoie que 1000 lignes et la boucle s'arrête (le
// catalogue compte ~16,5k ETF → il FAUT itérer).
const CATALOG_PAGE = 1000;
const EXISTING_PAGE = 1000;
const INSERT_BATCH = 500;

// Client Supabase admin non typé : catalog_instruments et les nouvelles colonnes
// ne sont pas dans les types générés (régénérés après migration) — cast localisé,
// comme le reste du Data Engine.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Admin = any;

async function loadCatalogEtfs(admin: Admin): Promise<CatalogInstrumentRow[]> {
  const out: CatalogInstrumentRow[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await admin
      .from("catalog_instruments")
      .select("listing_key, ticker, exchange, name, asset_type, etf_category, country, isin")
      .eq("asset_type", "etf")
      .range(from, from + CATALOG_PAGE - 1);
    if (error) throw new Error(`load catalog etfs: ${error.message}`);
    const rows = (data ?? []) as CatalogInstrumentRow[];
    out.push(...rows);
    if (rows.length < CATALOG_PAGE) break;
    from += CATALOG_PAGE;
  }
  return out;
}

async function loadExistingAssets(
  admin: Admin,
): Promise<{ isins: Set<string>; tickers: Set<string> }> {
  const isins = new Set<string>();
  const tickers = new Set<string>();
  let from = 0;
  for (;;) {
    const { data, error } = await admin
      .from("assets")
      .select("isin, ticker")
      .range(from, from + EXISTING_PAGE - 1);
    if (error) throw new Error(`load existing assets: ${error.message}`);
    const rows = (data ?? []) as { isin: string | null; ticker: string | null }[];
    for (const r of rows) {
      if (r.isin) isins.add(r.isin);
      if (r.ticker) tickers.add(r.ticker.toUpperCase());
    }
    if (rows.length < EXISTING_PAGE) break;
    from += EXISTING_PAGE;
  }
  return { isins, tickers };
}

async function main(): Promise<void> {
  const startedAt = Date.now();
  const doPersist = process.env.SEEDOW_PERSIST === "1";
  const limit = process.env.PROMOTE_LIMIT
    ? Math.max(1, Number(process.env.PROMOTE_LIMIT))
    : Infinity;
  console.log(`[promote] persist: ${doPersist} · limit: ${limit === Infinity ? "—" : limit}`);

  const { supabaseAdmin } = await import("../src/integrations/supabase/client.server");
  const admin = supabaseAdmin as Admin;

  const catalog = await loadCatalogEtfs(admin);
  const report = computePromotionReport(catalog);
  console.log(
    `[promote] catalogue ETF=${report.etfTotal} promouvables=${report.promotable} ` +
      `no_isin=${report.noIsin} non_mappés=${report.unmapped} exclus=${report.excluded}`,
  );
  console.log(`[promote] par classe: ${JSON.stringify(report.byClass)}`);
  console.log(`[promote] non mappés (à curer): ${JSON.stringify(report.byUnmappedCategory)}`);

  const { isins: existingIsins, tickers: existingTickers } = await loadExistingAssets(admin);
  console.log(`[promote] assets existants: ${existingIsins.size} (dédup par ISIN)`);

  const takenTickers = new Set(existingTickers);
  const seenIsins = new Set(existingIsins);
  const toInsert: ReturnType<typeof buildPromotedAsset>[] = [];
  const toBackfill: { isin: string; listing_key: string }[] = [];
  let tickerFallbacks = 0;

  for (const r of catalog) {
    if (toInsert.length >= limit) break;
    const cls = mapEtfCategoryToAssetClass(r.etf_category);
    if (!cls || !r.isin) continue; // non mappable ou sans ISIN → pas promu

    if (existingIsins.has(r.isin)) {
      // Déjà dans le moteur : on ne re-crée pas, on relie (traçabilité) si absent.
      toBackfill.push({ isin: r.isin, listing_key: r.listing_key });
      continue;
    }
    if (seenIsins.has(r.isin)) continue; // doublon ISIN intra-run (défensif)
    seenIsins.add(r.isin);

    // Unicité du ticker (NOT NULL UNIQUE) : ticker Adanos si libre, sinon
    // listing_key (clé catalogue, unique par construction) — jamais inventé.
    let ticker = (r.ticker ?? "").trim().toUpperCase();
    if (!ticker || takenTickers.has(ticker)) {
      ticker = r.listing_key;
      tickerFallbacks++;
    }
    takenTickers.add(ticker.toUpperCase());
    toInsert.push(buildPromotedAsset(r, cls, ticker));
  }

  console.log(
    `[promote] à insérer=${toInsert.length} (ticker fallback listing_key=${tickerFallbacks}) ` +
      `· liens à backfiller=${toBackfill.length}`,
  );

  if (!doPersist) {
    console.log("[promote] dry-run (SEEDOW_PERSIST != 1) — rien écrit.");
    return;
  }

  let inserted = 0;
  let errors = 0;
  for (let i = 0; i < toInsert.length; i += INSERT_BATCH) {
    const chunk = toInsert.slice(i, i + INSERT_BATCH);
    const { error } = await admin.from("assets").insert(chunk);
    if (error) {
      errors++;
      console.error(`[promote] insert ${i}-${i + chunk.length} error: ${error.message}`);
    } else {
      inserted += chunk.length;
    }
  }

  // Backfill des liens de traçabilité sur les assets déjà présents (ne touche que
  // la colonne catalog_listing_key, et seulement si elle est encore nulle).
  let backfilled = 0;
  for (const b of toBackfill) {
    const { error } = await admin
      .from("assets")
      .update({ catalog_listing_key: b.listing_key })
      .eq("isin", b.isin)
      .is("catalog_listing_key", null);
    if (error) errors++;
    else backfilled++;
  }

  const status = errors === 0 ? "ok" : inserted > 0 ? "partial" : "error";
  await admin.from("cron_run_log").insert({
    job_name: "promote-catalog-etfs",
    status,
    message: `promu ${inserted} ETF (is_active=false), ${backfilled} liens backfillés`,
    assets_ok: inserted,
    assets_failed: errors,
    duration_ms: Date.now() - startedAt,
    details: {
      report,
      inserted,
      backfilled,
      tickerFallbacks,
      limit: limit === Infinity ? null : limit,
    },
  });

  console.log(
    `[promote] DONE status=${status} inserted=${inserted} backfilled=${backfilled} errors=${errors}`,
  );
}

main().catch((e) => {
  console.error("[promote] fatal:", e instanceof Error ? e.message : String(e));
  process.exit(1);
});
