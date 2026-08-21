/**
 * Ingestion des HOLDINGS (composition) depuis les fichiers CSV officiels
 * iShares/BlackRock (§13 historisation, §11 validation, §3 provenance).
 *
 * iShares publie, par fonds, un CSV de composition daté. On le parse en
 * `ParsedHolding[]` + une date `as_of`, puis on construit les lignes
 * `fund_holdings` (avec ISIN du titre sous-jacent quand présent — donnée réelle,
 * jamais inventée). Fonctions pures + persistance isolée derrière une interface.
 */

import { validateHoldingsSum, validateWeight, worstOf } from "./validation";
import type { Confidence } from "./connectors/types";

export interface ParsedHolding {
  ticker: string | null;
  name: string;
  sector: string | null;
  country: string | null;
  isin: string | null;
  weightPct: number | null;
}

export interface ParsedHoldings {
  asOf: string | null;
  holdings: ParsedHolding[];
}

/** Découpe une ligne CSV (guillemets + virgules internes), format RFC 4180. */
export function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQ = false;
      } else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

const MONTHS: Record<string, string> = {
  jan: "01",
  feb: "02",
  mar: "03",
  apr: "04",
  may: "05",
  jun: "06",
  jul: "07",
  aug: "08",
  sep: "09",
  oct: "10",
  nov: "11",
  dec: "12",
};

/** « Jul 31, 2026 » → « 2026-07-31 », sinon null. */
export function monthDayYearToIso(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const m = raw.match(/([A-Za-z]{3})[a-z]*\s+(\d{1,2}),?\s+(\d{4})/);
  if (!m) return null;
  const mm = MONTHS[m[1].toLowerCase()];
  if (!mm) return null;
  return `${m[3]}-${mm}-${m[2].padStart(2, "0")}`;
}

function toNum(s: string | undefined): number | null {
  if (s == null) return null;
  const n = Number(s.replace(/[",%\s]/g, ""));
  return Number.isFinite(n) ? n : null;
}

/** Index de colonne par nom d'en-tête (insensible à la casse/espaces). */
function headerIndex(header: string[]): Record<string, number> {
  const idx: Record<string, number> = {};
  header.forEach((h, i) => {
    idx[h.toLowerCase().replace(/\s+/g, " ").trim()] = i;
  });
  return idx;
}

/**
 * Parse un CSV de composition iShares. Repère la date « as of » dans le
 * préambule et la ligne d'en-tête (contenant « Ticker » et « Weight (%) »),
 * puis lit les positions jusqu'à la fin du tableau. Ne produit que ce qui est
 * présent (champ absent → null).
 */
export function parseISharesHoldingsCsv(text: string): ParsedHoldings {
  const lines = text.split(/\r?\n/);
  let asOf: string | null = null;
  let headerRow = -1;

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (asOf == null && /Fund Holdings as of/i.test(l)) {
      asOf = monthDayYearToIso(parseCsvLine(l).slice(1).join(" "));
    }
    if (/(^|,)\s*"?Ticker"?\s*,/i.test(l) && /Weight\s*\(%\)/i.test(l)) {
      headerRow = i;
      break;
    }
  }
  if (headerRow === -1) return { asOf, holdings: [] };

  const idx = headerIndex(parseCsvLine(lines[headerRow]));
  const col = (name: string): number => idx[name] ?? -1;
  const cTicker = col("ticker");
  const cName = col("name");
  const cSector = col("sector");
  const cWeight = col("weight (%)");
  const cLocation = col("location");
  const cIsin = col("isin");

  const holdings: ParsedHolding[] = [];
  for (let i = headerRow + 1; i < lines.length; i++) {
    const raw = lines[i];
    if (raw.trim() === "") break; // fin du tableau
    const cells = parseCsvLine(raw);
    const name = cName >= 0 ? cells[cName] : "";
    if (!name) continue;
    holdings.push({
      ticker: cTicker >= 0 && cells[cTicker] ? cells[cTicker] : null,
      name,
      sector: cSector >= 0 && cells[cSector] ? cells[cSector] : null,
      country: cLocation >= 0 && cells[cLocation] ? cells[cLocation] : null,
      isin: cIsin >= 0 && cells[cIsin] ? cells[cIsin] : null,
      weightPct: cWeight >= 0 ? toNum(cells[cWeight]) : null,
    });
  }
  return { asOf, holdings };
}

/** `20260820` → « 2026-08-20 », sinon null. */
export function compactDateToIso(raw: unknown): string | null {
  const s = typeof raw === "number" ? String(raw) : typeof raw === "string" ? raw.trim() : "";
  const m = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (!m) return null;
  const [, y, mm, dd] = m;
  if (Number(mm) < 1 || Number(mm) > 12 || Number(dd) < 1 || Number(dd) > 31) return null;
  return `${y}-${mm}-${dd}`;
}

/** « 20/Aug/2026 » → « 2026-08-20 », sinon null. */
export function dayMonthYearToIso(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const m = raw.match(/^(\d{1,2})[/\s-]([A-Za-z]{3})[a-z]*[/\s-](\d{4})$/);
  if (!m) return null;
  const mm = MONTHS[m[2].toLowerCase()];
  if (!mm) return null;
  return `${m[3]}-${mm}-${m[1].padStart(2, "0")}`;
}

/**
 * Un « datapoint » de l'API produit iShares : les colonnes du tableau de
 * composition y arrivent en tableaux parallèles (une entrée par position).
 * `value` porte la donnée brute (nombre non arrondi) ; `formattedValue` la
 * version affichée. On préfère `value`, on retombe sur `formattedValue`.
 */
interface ProductDataPoint {
  value?: unknown;
  formattedValue?: unknown;
}

function columnOf(dp: ProductDataPoint | undefined): unknown[] | null {
  if (!dp) return null;
  if (Array.isArray(dp.value)) return dp.value;
  if (Array.isArray(dp.formattedValue)) return dp.formattedValue;
  return null;
}

function cellText(col: unknown[] | null, i: number): string | null {
  if (!col) return null;
  const v = col[i];
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" || s === "-" ? null : s;
}

function cellNumber(col: unknown[] | null, i: number): number | null {
  if (!col) return null;
  const v = col[i];
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = cellText(col, i);
  if (s == null) return null;
  const n = Number(s.replace(/[",%\s]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function pickHoldingsDataPoints(json: unknown): Record<string, ProductDataPoint> | null {
  if (typeof json !== "object" || json === null) return null;
  const components = (json as Record<string, unknown>).componentsByNameMap;
  if (typeof components !== "object" || components === null) return null;
  const holdings = (components as Record<string, unknown>).holdings;
  if (typeof holdings !== "object" || holdings === null) return null;
  const containers = (holdings as Record<string, unknown>).containersByNameMap;
  if (typeof containers !== "object" || containers === null) return null;
  const all = (containers as Record<string, unknown>).all;
  if (typeof all !== "object" || all === null) return null;
  const dp = (all as Record<string, unknown>).dataPointsByNameMap;
  if (typeof dp !== "object" || dp === null) return null;
  return dp as Record<string, ProductDataPoint>;
}

/**
 * Parse la réponse JSON de l'API produit iShares
 * (`.../product-data/api/v2/get-product-data?component=holdings`) — source
 * primaire de l'émetteur, mêmes données que le CSV de composition mais en un
 * simple GET, sans navigateur (cf. `docs/esg-holdings-beta.md`).
 *
 * Les colonnes arrivent en tableaux parallèles ; la longueur de référence est
 * celle de `issueName` (le libellé du titre, seul champ obligatoire). Une
 * position sans libellé est ignorée ; un champ absent reste `null` — rien n'est
 * complété ni deviné (§1.3).
 */
export function parseISharesProductDataHoldings(json: unknown): ParsedHoldings {
  const dp = pickHoldingsDataPoints(json);
  if (!dp) return { asOf: null, holdings: [] };

  const asOfRaw = dp.asOfDate;
  const asOf =
    compactDateToIso(asOfRaw?.value) ?? dayMonthYearToIso(asOfRaw?.formattedValue) ?? null;

  const names = columnOf(dp.issueName);
  if (!names) return { asOf, holdings: [] };

  const tickers = columnOf(dp.ticker);
  const sectors = columnOf(dp.sectorName);
  const countries = columnOf(dp.countryOfRisk);
  const isins = columnOf(dp.isin);
  const weights = columnOf(dp.holdingPercent);

  const holdings: ParsedHolding[] = [];
  for (let i = 0; i < names.length; i++) {
    const name = cellText(names, i);
    if (!name) continue;
    holdings.push({
      ticker: cellText(tickers, i),
      name,
      sector: cellText(sectors, i),
      country: cellText(countries, i),
      isin: cellText(isins, i),
      weightPct: cellNumber(weights, i),
    });
  }
  return { asOf, holdings };
}

/** Ligne prête à insérer dans `fund_holdings`. */
export interface HoldingRow {
  asset_id: string;
  security_isin: string | null;
  security_name: string;
  weight_pct: number | null;
  as_of: string;
  source_id: string | null;
  source_url: string | null;
  retrieved_at: string;
  confidence: string;
  validation_status: string;
}

/**
 * Construit les lignes `fund_holdings` datées et sourcées. Le statut de
 * validation combine la plausibilité du poids (§11) et celle de la somme
 * globale (une couverture partielle reste « valid » ; une somme > 100 rejette).
 */
export function buildHoldingRows(
  assetId: string,
  parsed: ParsedHoldings,
  meta: { sourceId: string | null; sourceUrl: string | null; retrievedAt: string },
  confidence: Confidence = "high",
): HoldingRow[] {
  if (!parsed.asOf || parsed.holdings.length === 0) return [];
  const sumStatus = validateHoldingsSum(parsed.holdings.map((h) => h.weightPct ?? 0)).status;

  return parsed.holdings.map((h) => {
    const status = worstOf([
      validateWeight(h.weightPct),
      { status: sumStatus, reason: null },
    ]).status;
    return {
      asset_id: assetId,
      security_isin: h.isin,
      security_name: h.name,
      weight_pct: h.weightPct,
      as_of: parsed.asOf as string,
      source_id: meta.sourceId,
      source_url: meta.sourceUrl,
      retrieved_at: meta.retrievedAt,
      confidence,
      validation_status: status,
    };
  });
}

/** I/O isolée : écriture des holdings (upsert par (asset, security_name, as_of)). */
export interface HoldingWriter {
  insertHoldings(rows: HoldingRow[]): Promise<number>;
}

/** Persiste les holdings publiables (statut ≠ rejected). No-op si rien. */
export async function persistHoldings(
  writer: HoldingWriter,
  assetId: string,
  parsed: ParsedHoldings,
  meta: { sourceId: string | null; sourceUrl: string | null; retrievedAt: string },
): Promise<{ inserted: number; asOf: string | null }> {
  const rows = buildHoldingRows(assetId, parsed, meta).filter(
    (r) => r.validation_status !== "rejected",
  );
  if (rows.length === 0) return { inserted: 0, asOf: parsed.asOf };
  const inserted = await writer.insertHoldings(rows);
  return { inserted, asOf: parsed.asOf };
}
