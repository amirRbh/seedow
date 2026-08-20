/**
 * Parsing + normalisation du catalogue mondial **Adanos Free Global Ticker
 * Database** (github.com/adanos-software/free-ticker-database, licence MIT).
 *
 * On consomme UNIQUEMENT `data/core_listings.csv` : l'univers canonique
 * « collision-safe » d'Adanos, **une ligne primaire par titre**, clé
 * `listing_key` (`EXCHANGE::TICKER`). Les cross-listings secondaires vivent
 * ailleurs (`listings.csv`) et sont donc déjà écartés à la source → la dédup est
 * en grande partie faite par Adanos ; on reste néanmoins défensif (dédup par
 * `listing_key`).
 *
 * IMPORTANT (cf. proposition) : ce catalogue alimente une **couche séparée**
 * (`catalog_instruments`), JAMAIS directement `assets` (univers curé du moteur,
 * `ticker UNIQUE` + `asset_class` fonctionnel + ESG/return). On ne mélange pas
 * stocks et ETF : `asset_type` est conservé pour filtrer. Aucune donnée
 * ESG/SFDR/holdings n'est touchée — Adanos ne sert qu'à l'identité des titres.
 *
 * Fonctions PURES, sans I/O : le script d'import fait fetch + upsert. Rien n'est
 * inventé — un champ absent → null (§1.3).
 */

import { parseCsvLine } from "./holdings";
import { toCanonicalIsin } from "./isin";

export type AdanosAssetType = "etf" | "stock" | "other";

/** Une ligne normalisée de `core_listings.csv`. */
export interface AdanosListing {
  /** Clé venue collision-safe `EXCHANGE::TICKER` (identifiant primaire). */
  listingKey: string;
  ticker: string;
  exchange: string | null;
  name: string;
  assetType: AdanosAssetType;
  stockSector: string | null;
  etfCategory: string | null;
  country: string | null;
  countryCode: string | null;
  /** ISIN canonique (validé Luhn) ou null — jamais deviné. */
  isin: string | null;
  instrumentGroupKey: string | null;
  scopeReason: string | null;
}

function normalizeAssetType(raw: string | undefined): AdanosAssetType {
  const v = (raw ?? "").trim().toLowerCase();
  if (v === "etf") return "etf";
  if (v === "stock") return "stock";
  return "other";
}

/** Index des colonnes par nom d'en-tête (insensible casse/espaces/underscores). */
function headerIndex(header: string[]): Record<string, number> {
  const idx: Record<string, number> = {};
  header.forEach((h, i) => {
    idx[
      h
        .toLowerCase()
        .replace(/[\s_]+/g, "_")
        .replace(/^_|_$/g, "")
        .trim()
    ] = i;
  });
  return idx;
}

function cell(cols: string[], i: number): string | null {
  if (i < 0 || i >= cols.length) return null;
  const v = cols[i]?.trim();
  return v ? v : null;
}

/**
 * Parse le CSV `core_listings.csv` d'Adanos en lignes normalisées. Robuste à
 * l'ordre des colonnes (repérage par nom d'en-tête). Une ligne sans
 * `listing_key` ou sans `name` est ignorée (jamais complétée). L'ISIN est validé
 * Luhn ; un ISIN invalide devient null (l'identité venue reste portée par
 * `listing_key`).
 */
export function parseAdanosCoreListings(text: string): AdanosListing[] {
  const lines = text.split(/\r?\n/);
  const headerRow = lines.findIndex((l) => /(^|,)\s*"?listing_key"?\s*(,|$)/i.test(l));
  if (headerRow < 0) return [];

  const idx = headerIndex(parseCsvLine(lines[headerRow]));
  const col = (name: string): number => idx[name] ?? -1;
  const cListingKey = col("listing_key");
  const cTicker = col("ticker");
  const cExchange = col("exchange");
  const cName = col("name");
  const cAssetType = col("asset_type");
  const cSector = col("stock_sector");
  const cEtfCat = col("etf_category");
  const cCountry = col("country");
  const cCountryCode = col("country_code");
  const cIsin = col("isin");
  const cGroup = col("instrument_group_key");
  const cScope = col("scope_reason");

  const out: AdanosListing[] = [];
  for (let i = headerRow + 1; i < lines.length; i++) {
    const raw = lines[i];
    if (raw.trim() === "") continue;
    const cols = parseCsvLine(raw);
    const listingKey = cell(cols, cListingKey);
    const name = cell(cols, cName);
    if (!listingKey || !name) continue; // identité minimale requise
    out.push({
      listingKey,
      ticker: cell(cols, cTicker) ?? "",
      exchange: cell(cols, cExchange),
      name,
      assetType: normalizeAssetType(cell(cols, cAssetType) ?? undefined),
      stockSector: cell(cols, cSector),
      etfCategory: cell(cols, cEtfCat),
      country: cell(cols, cCountry),
      countryCode: cell(cols, cCountryCode),
      isin: toCanonicalIsin(cell(cols, cIsin)),
      instrumentGroupKey: cell(cols, cGroup),
      scopeReason: cell(cols, cScope),
    });
  }
  return out;
}

/**
 * Dédup défensive par `listing_key` (Adanos core est déjà « one primary per
 * security », mais on ne fait jamais confiance aveuglément à une source). La
 * première occurrence gagne ; les suivantes sont comptées comme ignorées.
 */
export function dedupeByListingKey(rows: AdanosListing[]): {
  kept: AdanosListing[];
  duplicatesIgnored: number;
} {
  const seen = new Set<string>();
  const kept: AdanosListing[] = [];
  let duplicatesIgnored = 0;
  for (const r of rows) {
    if (seen.has(r.listingKey)) {
      duplicatesIgnored++;
      continue;
    }
    seen.add(r.listingKey);
    kept.push(r);
  }
  return { kept, duplicatesIgnored };
}

/** Ligne prête à upserter dans `public.catalog_instruments`. */
export interface CatalogRow {
  listing_key: string;
  ticker: string | null;
  exchange: string | null;
  name: string;
  asset_type: AdanosAssetType;
  stock_sector: string | null;
  etf_category: string | null;
  country: string | null;
  country_code: string | null;
  isin: string | null;
  instrument_group_key: string | null;
  scope_reason: string | null;
  source: string;
  source_version: string | null;
  source_url: string | null;
  last_seen_at: string;
}

export interface CatalogRowMeta {
  sourceVersion: string | null;
  sourceUrl: string | null;
  seenAt: string;
}

/** Transforme une ligne Adanos normalisée en ligne DB catalogue (provenance incluse). */
export function toCatalogRow(l: AdanosListing, meta: CatalogRowMeta): CatalogRow {
  return {
    listing_key: l.listingKey,
    ticker: l.ticker || null,
    exchange: l.exchange,
    name: l.name,
    asset_type: l.assetType,
    stock_sector: l.stockSector,
    etf_category: l.etfCategory,
    country: l.country,
    country_code: l.countryCode,
    isin: l.isin,
    instrument_group_key: l.instrumentGroupKey,
    scope_reason: l.scopeReason,
    source: "adanos",
    source_version: meta.sourceVersion,
    source_url: meta.sourceUrl,
    last_seen_at: meta.seenAt,
  };
}

export interface CatalogImportReport {
  parsed: number;
  duplicatesIgnored: number;
  etf: number;
  stock: number;
  other: number;
  withoutIsin: number;
}

/** Compte les métriques d'un lot dédupliqué (pour le rapport d'import, exigence 8). */
export function computeImportReport(rows: AdanosListing[]): CatalogImportReport {
  let etf = 0;
  let stock = 0;
  let other = 0;
  let withoutIsin = 0;
  for (const r of rows) {
    if (r.assetType === "etf") etf++;
    else if (r.assetType === "stock") stock++;
    else other++;
    if (!r.isin) withoutIsin++;
  }
  return { parsed: rows.length, duplicatesIgnored: 0, etf, stock, other, withoutIsin };
}
