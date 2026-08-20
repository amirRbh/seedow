/**
 * Import du catalogue mondial Adanos (Free Global Ticker Database, MIT) dans
 * `catalog_instruments`. Remplace la découverte de fonds « scraper par émetteur »
 * par une source unique, gratuite et mondiale.
 *
 * Pourquoi un script + GitHub Action (et pas un hook Edge) : 61k lignes dépassent
 * les limites CPU/taille d'un Worker Cloudflare ; l'Action tourne dans le réseau
 * GitHub → atteint trivialement la release Adanos ET Supabase. Pattern identique
 * à scripts/ingest-funds.ts.
 *
 * Non destructif : n'écrit QUE `catalog_instruments` (+ log `catalog_imports`).
 * Ne touche jamais `assets` ni les données ESG/SFDR/holdings. Rien n'est inventé :
 * champ absent → null, ISIN validé Luhn (sinon null).
 *
 * Usage :
 *   bun run scripts/import-adanos-catalog.ts                 (dry-run : parse + rapport, aucune écriture)
 *   SEEDOW_PERSIST=1 bun run scripts/import-adanos-catalog.ts  (écrit en base ; nécessite les secrets Supabase)
 * Env optionnels :
 *   ADANOS_CORE_LISTINGS_URL  (défaut : raw main data/core_listings.csv)
 *   ADANOS_VERSION            (estampille source_version ; défaut : null)
 *   ADANOS_ASSET_TYPES        (filtre CSV, ex. 'etf' ; défaut : tout)
 */

import {
  parseAdanosCoreListings,
  dedupeByListingKey,
  toCatalogRow,
  computeImportReport,
  type AdanosAssetType,
} from "../src/lib/data-engine/adanos";

const DEFAULT_URL =
  "https://raw.githubusercontent.com/adanos-software/free-ticker-database/main/data/core_listings.csv";
const BATCH = 1000;

async function main(): Promise<void> {
  const url = process.env.ADANOS_CORE_LISTINGS_URL ?? DEFAULT_URL;
  const version = process.env.ADANOS_VERSION ?? null;
  const seenAt = new Date().toISOString();
  const doPersist = process.env.SEEDOW_PERSIST === "1";
  const typeFilter = (process.env.ADANOS_ASSET_TYPES ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean) as AdanosAssetType[];

  console.log(`[adanos] source: ${url}`);
  console.log(`[adanos] persist: ${doPersist} · version: ${version ?? "—"}`);

  const resp = await fetch(url, { headers: { Accept: "text/csv,*/*" } });
  if (!resp.ok) throw new Error(`download failed: HTTP ${resp.status} ${url}`);
  const csv = await resp.text();

  const parsed = parseAdanosCoreListings(csv);
  const deduped = dedupeByListingKey(parsed);
  const duplicatesIgnored = deduped.duplicatesIgnored;
  let kept = deduped.kept;
  if (typeFilter.length > 0) kept = kept.filter((r) => typeFilter.includes(r.assetType));

  const report = computeImportReport(kept);
  console.log(
    `[adanos] parsed=${parsed.length} kept=${kept.length} dup=${duplicatesIgnored} ` +
      `etf=${report.etf} stock=${report.stock} other=${report.other} no_isin=${report.withoutIsin}`,
  );

  if (!doPersist) {
    console.log("[adanos] dry-run (SEEDOW_PERSIST != 1) — rien écrit.");
    return;
  }

  const { supabaseAdmin } = await import("../src/integrations/supabase/client.server");
  // `catalog_instruments`/`catalog_imports` pas encore dans les types générés
  // (régénérés après migration) : cast localisé, comme le reste du Data Engine.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = supabaseAdmin as any;

  const { count: countBefore } = await admin
    .from("catalog_instruments")
    .select("listing_key", { count: "exact", head: true });

  // Diff new vs updated : on charge les listing_key existants (léger, une colonne).
  // PostgREST plafonne chaque lecture à 1000 lignes (max-rows) → paginer par 1000,
  // sinon on ne charge que les 1000 premières clés et le diff new/updated est faux.
  const existing = new Set<string>();
  {
    let from = 0;
    const page = 1000;
    for (;;) {
      const { data, error } = await admin
        .from("catalog_instruments")
        .select("listing_key")
        .range(from, from + page - 1);
      if (error) throw new Error(`load existing keys: ${error.message}`);
      const rows = (data ?? []) as { listing_key: string }[];
      for (const r of rows) existing.add(r.listing_key);
      if (rows.length < page) break;
      from += page;
    }
  }
  const countNew = kept.filter((r) => !existing.has(r.listingKey)).length;
  const countUpdated = kept.length - countNew;

  let errors = 0;
  for (let i = 0; i < kept.length; i += BATCH) {
    const chunk = kept.slice(i, i + BATCH).map((l) => ({
      ...toCatalogRow(l, { sourceVersion: version, sourceUrl: url, seenAt }),
      is_present_in_latest: true,
    }));
    const { error } = await admin
      .from("catalog_instruments")
      .upsert(chunk, { onConflict: "listing_key" });
    if (error) {
      errors++;
      console.error(`[adanos] batch ${i}-${i + chunk.length} error: ${error.message}`);
    }
  }

  // Marque les lignes absentes de cet import (non revues) sans les supprimer.
  await admin
    .from("catalog_instruments")
    .update({ is_present_in_latest: false })
    .eq("source", "adanos")
    .lt("last_seen_at", seenAt);

  const status = errors === 0 ? "ok" : countNew + countUpdated > 0 ? "partial" : "error";
  await admin.from("catalog_imports").insert({
    source: "adanos",
    source_version: version,
    source_url: url,
    count_before: countBefore ?? 0,
    count_parsed: parsed.length,
    count_new: countNew,
    count_updated: countUpdated,
    count_skipped_dup: duplicatesIgnored,
    count_no_isin: report.withoutIsin,
    count_etf: report.etf,
    count_stock: report.stock,
    count_errors: errors,
    status,
    details: { typeFilter, other: report.other },
  });

  console.log(
    `[adanos] DONE status=${status} before=${countBefore ?? 0} new=${countNew} ` +
      `updated=${countUpdated} errors=${errors}`,
  );
}

main().catch((e) => {
  console.error("[adanos] fatal:", e instanceof Error ? e.message : String(e));
  process.exit(1);
});
