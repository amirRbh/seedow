/**
 * Lecture COMPLÈTE d'un classeur produit iShares (SpreadsheetML).
 *
 * `ishares-holdings.ts` n'en lit que la composition. Or le même document,
 * publié par l'émetteur à une adresse publique et rejouable, contient aussi :
 *
 *   - « Key Facts »            — devise, indice de référence, classification
 *                                SFDR déclarée, frais courants, domicile ;
 *   - « Historical NAVs »      — la valeur liquidative quotidienne depuis le
 *                                lancement ;
 *   - « Growth of Hypothetical 10,000 » — la même croissance, fonds ET indice,
 *                                au jour le jour ;
 *   - « Performance Returns »  — les rendements que l'émetteur publie lui-même
 *                                (annualisés et cumulés) ;
 *   - « Exposure Breakdowns »  — les répartitions sectorielle et géographique
 *                                calculées par l'émetteur ;
 *   - « Holdings »             — les positions, avec secteur GICS, classe
 *                                d'actifs et DEVISE de cotation.
 *
 * Ce module ne calcule rien : il rend ce que le document dit, tel qu'il le dit.
 * Une cellule illisible rend `null` — jamais une valeur devinée (CLAUDE.md §1.3).
 * Module PUR, sans réseau : le script `scripts/snapshot-demo-funds.ts` fournit
 * le texte du classeur.
 */
import { parseIsharesDate } from "./ishares-holdings";

export interface WorkbookSeriesPoint {
  /** Date ISO (AAAA-MM-JJ). */
  date: string;
  value: number;
}

export interface WorkbookExposure {
  label: string;
  /** Part du fonds, en pourcentage (0..100), telle que publiée. */
  weightPct: number;
}

export interface WorkbookHolding {
  ticker: string | null;
  name: string;
  sector: string | null;
  assetClass: string | null;
  currency: string | null;
  weightPct: number;
}

export interface WorkbookPublishedReturns {
  /** Date de référence des rendements annualisés publiés. */
  asOf: string | null;
  /** Rendements annualisés publiés par l'émetteur, en % (null si absents). */
  fund: Partial<Record<"1y" | "3y" | "5y" | "10y", number>>;
  benchmark: Partial<Record<"1y" | "3y" | "5y" | "10y", number>>;
}

export interface ISharesWorkbook {
  name: string | null;
  isin: string | null;
  currency: string | null;
  benchmark: string | null;
  /** Classification SFDR telle que DÉCLARÉE par l'émetteur (« Article 8 », « Other »…). */
  sfdrDeclared: string | null;
  /** Frais courants (TER) en fraction : 0.002 pour 0,20 %. */
  ter: number | null;
  domicile: string | null;
  assetClass: string | null;
  launchDate: string | null;
  holdingsCount: number | null;
  /** Écart-type 3 ans publié par l'émetteur, en % (pour contrôle croisé). */
  publishedStdDev3y: number | null;
  navAsOf: string | null;
  /** VL quotidienne, ordre chronologique croissant. */
  nav: WorkbookSeriesPoint[];
  /** Croissance de 10 000 : fonds et indice, ordre chronologique croissant. */
  growthFund: WorkbookSeriesPoint[];
  growthBenchmark: WorkbookSeriesPoint[];
  publishedReturns: WorkbookPublishedReturns;
  sectorExposure: WorkbookExposure[];
  sectorAsOf: string | null;
  geographyExposure: WorkbookExposure[];
  geographyAsOf: string | null;
  holdings: WorkbookHolding[];
  holdingsAsOf: string | null;
}

// ── Lecture SpreadsheetML ────────────────────────────────────────────────

const SHEET_RE = /<ss:Worksheet\b[^>]*ss:Name="([^"]+)"[^>]*>([\s\S]*?)<\/ss:Worksheet>/g;
const ROW_RE = /<ss:Row\b[^>]*>([\s\S]*?)<\/ss:Row>/g;
const CELL_RE = /<ss:Cell\b[^>]*>([\s\S]*?)<\/ss:Cell>/g;
const TAG_RE = /<[^>]+>/g;

function decode(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#10;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

type Sheet = string[][];

function readSheets(xml: string): Map<string, Sheet> {
  const sheets = new Map<string, Sheet>();
  for (const m of xml.matchAll(SHEET_RE)) {
    const rows: Sheet = [];
    for (const r of m[2].matchAll(ROW_RE)) {
      const cells: string[] = [];
      for (const c of r[1].matchAll(CELL_RE)) cells.push(decode(c[1].replace(TAG_RE, "")));
      rows.push(cells);
    }
    sheets.set(decode(m[1]), rows);
  }
  return sheets;
}

/** « 1,234.56 », « 5.92 », « 0.20% », « USD 140.36 » → nombre ; sinon null. */
export function parseNumber(raw: string | undefined | null): number | null {
  if (raw == null) return null;
  const cleaned = raw.replace(/^[A-Z]{3}\s+/, "").replace(/[%\s,]/g, "");
  if (cleaned === "" || cleaned === "-" || cleaned === "--") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/**
 * Dates publiées sous trois formes : `17/Nov/2026`, `30/Sept/2026` (le mois de
 * septembre est écrit sur quatre lettres) et `Tue, 17 Nov 2026`.
 */
export function parseWorkbookDate(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const text = raw.trim().replace(/\/Sept\//i, "/Sep/");
  const direct = parseIsharesDate(text);
  if (direct) return direct;
  const long = /^(?:[A-Za-z]{3},\s*)?(\d{1,2}) ([A-Za-z]{3,4}) (\d{4})$/.exec(text);
  if (long)
    return parseIsharesDate(`${long[1].padStart(2, "0")}/${long[2].slice(0, 3)}/${long[3]}`);
  return null;
}

/** Une ligne « as of JJ/Mmm/AAAA » ou « … as of JJ/Mmm/AAAA ». */
function asOfIn(cells: string[]): string | null {
  for (let i = 0; i < cells.length; i++) {
    const c = cells[i];
    const inline = /as of (\S+)$/i.exec(c);
    if (inline) return parseWorkbookDate(inline[1]);
    if (c.toLowerCase() === "as of") return parseWorkbookDate(cells[i + 1]);
  }
  return null;
}

function keyFact(sheet: Sheet | undefined, label: string): string | null {
  const row = sheet?.find((r) => r[0]?.toLowerCase() === label.toLowerCase());
  return row?.[1]?.trim() || null;
}

function chronological(points: WorkbookSeriesPoint[]): WorkbookSeriesPoint[] {
  const byDate = new Map<string, number>();
  for (const p of points) byDate.set(p.date, p.value);
  return [...byDate.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([date, value]) => ({ date, value }));
}

function readExposureBlock(
  sheet: Sheet | undefined,
  title: string,
): { asOf: string | null; rows: WorkbookExposure[] } {
  if (!sheet) return { asOf: null, rows: [] };
  const start = sheet.findIndex(
    (r) => r.length === 1 && r[0].toLowerCase() === title.toLowerCase(),
  );
  if (start < 0) return { asOf: null, rows: [] };
  let asOf: string | null = null;
  const rows: WorkbookExposure[] = [];
  for (let i = start + 1; i < sheet.length; i++) {
    const r = sheet[i];
    if (r.length === 1 && r[0] && i > start + 1 && parseNumber(r[0]) === null) break; // bloc suivant
    if (r[0]?.toLowerCase() === "as of") {
      asOf = parseWorkbookDate(r[1]);
      continue;
    }
    if (r[0]?.toLowerCase() === "type") continue;
    const weight = parseNumber(r[1]);
    if (r[0] && weight !== null) rows.push({ label: r[0], weightPct: weight });
  }
  return { asOf, rows };
}

function readPublishedReturns(sheet: Sheet | undefined): WorkbookPublishedReturns {
  const out: WorkbookPublishedReturns = { asOf: null, fund: {}, benchmark: {} };
  if (!sheet) return out;
  // Premier bloc « Annualised » : as of → en-têtes → Total Return → Benchmark.
  const start = sheet.findIndex((r) => r[0]?.toLowerCase() === "annualised");
  if (start < 0) return out;
  const asOfRow = sheet[start + 1];
  const header = sheet[start + 2] ?? [];
  const fundRow = sheet[start + 3] ?? [];
  const benchRow = sheet[start + 4] ?? [];
  out.asOf = asOfRow ? asOfIn(asOfRow) : null;
  const keys = ["1y", "3y", "5y", "10y"] as const;
  for (const k of keys) {
    const col = header.findIndex((h) => h.toLowerCase() === k);
    if (col < 0) continue;
    // Les lignes de valeurs ont une cellule de libellé en tête : décalage d'une colonne.
    const f = parseNumber(fundRow[col + 1]);
    const b = parseNumber(benchRow[col + 1]);
    if (f !== null && /total return/i.test(fundRow[0] ?? "")) out.fund[k] = f;
    if (b !== null && /benchmark/i.test(benchRow[0] ?? "")) out.benchmark[k] = b;
  }
  return out;
}

function readHoldings(sheet: Sheet | undefined): { asOf: string | null; rows: WorkbookHolding[] } {
  if (!sheet) return { asOf: null, rows: [] };
  const headerIdx = sheet.findIndex((r) => r.includes("Weight (%)") && r.includes("Name"));
  if (headerIdx < 0) return { asOf: null, rows: [] };
  const header = sheet[headerIdx];
  const col = (...labels: string[]) => header.findIndex((h) => labels.includes(h));
  const c = {
    ticker: col("Issuer Ticker", "Ticker"),
    name: col("Name"),
    sector: col("Sector"),
    assetClass: col("Asset Class"),
    currency: col("Market Currency", "Currency"),
    weight: col("Weight (%)"),
  };
  let asOf: string | null = null;
  for (let i = headerIdx - 1; i >= Math.max(0, headerIdx - 4) && !asOf; i--)
    asOf = asOfIn(sheet[i]);
  const rows: WorkbookHolding[] = [];
  for (let i = headerIdx + 1; i < sheet.length; i++) {
    const r = sheet[i];
    const name = r[c.name]?.trim();
    const weight = parseNumber(r[c.weight]);
    if (!name || weight === null) continue;
    const pick = (idx: number) => (idx >= 0 && r[idx]?.trim() ? r[idx].trim() : null);
    rows.push({
      ticker: pick(c.ticker),
      name,
      sector: pick(c.sector),
      assetClass: pick(c.assetClass),
      currency: pick(c.currency),
      weightPct: weight,
    });
  }
  return { asOf, rows };
}

/** Lit un classeur produit iShares complet. Ne lève jamais. */
export function parseISharesWorkbook(xml: string): ISharesWorkbook {
  const sheets = readSheets(xml);
  const header = sheets.get("Fund Header");
  const facts = sheets.get("Key Facts");
  const characteristics = sheets.get("Portfolio Characteristics");

  const navAsOf = header?.map(asOfIn).find((d) => d !== null) ?? null;

  const nav = chronological(
    (sheets.get("Historical NAVs") ?? [])
      .map((r) => ({ date: parseWorkbookDate(r[0]), value: parseNumber(r[1]) }))
      .filter((p): p is WorkbookSeriesPoint => p.date !== null && p.value !== null && p.value > 0),
  );

  const growthRows = sheets.get("Growth of Hypothetical 10,000") ?? [];
  const growthFund: WorkbookSeriesPoint[] = [];
  const growthBenchmark: WorkbookSeriesPoint[] = [];
  for (const r of growthRows) {
    const date = parseWorkbookDate(r[0]);
    if (!date) continue;
    const f = parseNumber(r[1]);
    const b = parseNumber(r[2]);
    if (f !== null && f > 0) growthFund.push({ date, value: f });
    if (b !== null && b > 0) growthBenchmark.push({ date, value: b });
  }

  const sector = readExposureBlock(sheets.get("Exposure Breakdowns"), "Sector");
  const geography = readExposureBlock(sheets.get("Exposure Breakdowns"), "Geography/Locations");
  const holdings = readHoldings(sheets.get("Holdings"));

  const terRaw = keyFact(facts, "Total Expense Ratio") ?? keyFact(facts, "Ongoing Charges Figure");
  const ter = parseNumber(terRaw);

  return {
    name: header?.[0]?.[0] || null,
    isin: keyFact(facts, "ISIN"),
    currency: keyFact(facts, "Share Class Currency") ?? keyFact(facts, "Fund Base Currency"),
    benchmark: keyFact(facts, "Benchmark Index"),
    sfdrDeclared: keyFact(facts, "SFDR Classification"),
    // Arrondi à 6 décimales : 0.65 / 100 donne 0.006500000000000001 en flottant.
    ter: ter === null ? null : Math.round((ter / 100) * 1e6) / 1e6,
    domicile: keyFact(facts, "Domicile"),
    assetClass: keyFact(facts, "Asset Class"),
    launchDate: parseWorkbookDate(keyFact(facts, "Share Class Launch Date")),
    holdingsCount: parseNumber(keyFact(characteristics, "Number of Holdings")),
    publishedStdDev3y: parseNumber(keyFact(characteristics, "Standard Deviation (3y)")),
    navAsOf,
    nav,
    growthFund: chronological(growthFund),
    growthBenchmark: chronological(growthBenchmark),
    publishedReturns: readPublishedReturns(sheets.get("Performance Returns")),
    sectorExposure: sector.rows,
    sectorAsOf: sector.asOf,
    geographyExposure: geography.rows,
    geographyAsOf: geography.asOf,
    holdings: holdings.rows,
    holdingsAsOf: holdings.asOf,
  };
}
