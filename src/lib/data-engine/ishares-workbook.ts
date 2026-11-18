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
 * Le classeur des ETF AMÉRICAINS (site `us`) suit la même structure avec des
 * variantes (feuille « fundHeader », bloc « Average Annual », frais dans
 * « Fees », dates « Sat, Oct 31, 2026 », croissance MENSUELLE) et ajoute deux
 * feuilles que la version européenne n'a pas :
 *
 *   - « Sustainability Characteristics » — notation MSCI ESG du fonds, score de
 *                                qualité, intensité carbone moyenne pondérée
 *                                (WACI), hausse de température implicite, avec
 *                                leurs taux de couverture ;
 *   - « Business Involvement »  — part du fonds exposée à des activités
 *                                (armes controversées, violations du Pacte
 *                                mondial, charbon thermique, sables bitumineux…).
 *
 * Ces chiffres sont CALCULÉS par MSCI ESG Research (ou par BlackRock à partir
 * de données MSCI) et REPRODUITS par l'émetteur : Seedow n'a pas de licence
 * MSCI. Ils sont lus tels quels et attribués à l'écran ; ils ne sont pas
 * redistribués par l'API publique (cf. `lib/api/v1.ts`).
 *
 * Ce module ne calcule rien : il rend ce que le document dit, tel qu'il le dit.
 * Une cellule illisible rend `null` — jamais une valeur devinée (CLAUDE.md §1.3).
 * Module PUR, sans réseau : le script `scripts/snapshot-demo-funds.ts` fournit
 * le texte du classeur.
 */
import { parseIsharesDate } from "./ishares-holdings";
import { isinFromCusip } from "./isin";

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

/** Feuille « Sustainability Characteristics » — chiffres MSCI repris par l'émetteur. */
export interface WorkbookSustainability {
  /** Notation MSCI ESG du fonds, AAA à CCC. */
  msciRating: string | null;
  /** Part du fonds couverte par la notation, en %. */
  ratingCoveragePct: number | null;
  /** Score de qualité ESG MSCI, 0 à 10. */
  qualityScore: number | null;
  /** Rang centile du score de qualité dans le groupe de pairs, en %. */
  peerPercentile: number | null;
  peerGroup: string | null;
  peerCount: number | null;
  /** Intensité carbone moyenne pondérée, t CO2e / M$ de chiffre d'affaires (scopes 1+2). */
  waci: number | null;
  waciCoveragePct: number | null;
  /** Hausse de température implicite, en bande telle que publiée (« > 1.5° - 2.0° C »). */
  impliedTempRise: string | null;
  itrCoveragePct: number | null;
  asOf: string | null;
  /** Date des positions sur lesquelles MSCI a calculé ces chiffres. */
  holdingsBasisAsOf: string | null;
}

export type BusinessInvolvementId =
  | "controversial_weapons"
  | "ungc_violators"
  | "nuclear_weapons"
  | "thermal_coal"
  | "civilian_firearms"
  | "oil_sands"
  | "tobacco";

/** Feuille « Business Involvement » — part de la valeur du fonds exposée. */
export interface WorkbookBusinessInvolvement {
  rows: { id: BusinessInvolvementId; label: string; pct: number }[];
  /** Part du fonds couverte par les données d'implication, en %. */
  coveragePct: number | null;
  asOf: string | null;
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
  /** `null` quand le classeur n'a pas la feuille (classeurs européens). */
  sustainability: WorkbookSustainability | null;
  businessInvolvement: WorkbookBusinessInvolvement | null;
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
 * Dates publiées sous cinq formes : `17/Nov/2026`, `30/Sept/2026` (le mois de
 * septembre est écrit sur quatre lettres), `Tue, 17 Nov 2026`, et côté
 * américain `Nov 17, 2026` et `Sat, Oct 31, 2026`.
 */
export function parseWorkbookDate(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const text = raw.trim().replace(/\/Sept\//i, "/Sep/");
  const direct = parseIsharesDate(text) ?? parseIsharesDate(text.replace(/^[A-Za-z]{3},\s*/, ""));
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
    const inline = /as of (.+)$/i.exec(c);
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
  // Premier bloc annualisé (« Annualised » en Europe, « Average Annual » aux
  // États-Unis) : as of → en-têtes → lignes de valeurs jusqu'au « as of » suivant.
  const start = sheet.findIndex((r) => /^(annualised|average annual)$/i.test(r[0] ?? ""));
  if (start < 0) return out;
  const asOfRow = sheet[start + 1];
  const header = sheet[start + 2] ?? [];
  const block: Sheet = [];
  for (let i = start + 3; i < sheet.length; i++) {
    const r = sheet[i];
    if (r[0]?.toLowerCase() === "as of" || r.length === 1) break;
    block.push(r);
  }
  const fundRow = block.find((r) => /^total return/i.test(r[0] ?? "")) ?? [];
  const benchRow = block.find((r) => /^benchmark/i.test(r[0] ?? "")) ?? [];
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

/** Valeur et « as of » d'une ligne libellé / valeur / date, par motif de libellé. */
function labelled(sheet: Sheet, re: RegExp): { value: string | null; asOf: string | null } {
  const row = sheet.find((r) => re.test(r[0] ?? ""));
  if (!row) return { value: null, asOf: null };
  return { value: row[1]?.trim() || null, asOf: asOfIn(row.slice(2)) };
}

function readSustainability(sheet: Sheet | undefined): WorkbookSustainability | null {
  if (!sheet || sheet.length === 0) return null;
  const rating = labelled(sheet, /^MSCI ESG Fund Rating/i);
  const ratingValue =
    rating.value && /^(AAA|AA|A|BBB|BB|B|CCC)$/.test(rating.value) ? rating.value : null;
  const waci = labelled(sheet, /^MSCI Weighted Average Carbon Intensity \(/i);
  const itr = labelled(sheet, /^MSCI Implied Temperature Rise \(/i);
  const basis = sheet
    .map((r) => /based on holdings as of ([A-Za-z]{3} \d{1,2}, \d{4})/i.exec(r[0] ?? "")?.[1])
    .find(Boolean);
  const out: WorkbookSustainability = {
    msciRating: ratingValue,
    ratingCoveragePct: parseNumber(labelled(sheet, /^MSCI ESG % Coverage/i).value),
    qualityScore: parseNumber(labelled(sheet, /^MSCI ESG Quality Score \(0-10\)/i).value),
    peerPercentile: parseNumber(
      labelled(sheet, /^MSCI ESG Quality Score - Peer Percentile/i).value,
    ),
    peerGroup: labelled(sheet, /^Fund Lipper Global Classification/i).value,
    peerCount: parseNumber(labelled(sheet, /^Funds in Peer Group/i).value),
    waci: parseNumber(waci.value),
    waciCoveragePct: parseNumber(
      labelled(sheet, /^MSCI Weighted Average Carbon Intensity % Coverage/i).value,
    ),
    // Bande publiée, jamais convertie en nombre : « > 1.5° - 2.0° C » n'est pas 1,75.
    impliedTempRise: itr.value && /°/.test(itr.value) ? itr.value : null,
    itrCoveragePct: parseNumber(
      labelled(sheet, /^MSCI Implied Temperature Rise % Coverage/i).value,
    ),
    asOf: rating.asOf ?? waci.asOf ?? itr.asOf,
    holdingsBasisAsOf: parseWorkbookDate(basis ?? null),
  };
  const hasAny =
    out.msciRating !== null ||
    out.qualityScore !== null ||
    out.waci !== null ||
    out.impliedTempRise !== null;
  return hasAny ? out : null;
}

const INVOLVEMENT: { id: BusinessInvolvementId; re: RegExp }[] = [
  { id: "controversial_weapons", re: /^MSCI - Controversial Weapons$/i },
  { id: "ungc_violators", re: /^MSCI - UN Global Compact Violators$/i },
  { id: "nuclear_weapons", re: /^MSCI - Nuclear Weapons$/i },
  { id: "thermal_coal", re: /^MSCI - Thermal Coal$/i },
  { id: "civilian_firearms", re: /^MSCI - Civilian Firearms$/i },
  { id: "oil_sands", re: /^MSCI - Oil Sands$/i },
  { id: "tobacco", re: /^MSCI - Tobacco$/i },
];

function readBusinessInvolvement(sheet: Sheet | undefined): WorkbookBusinessInvolvement | null {
  if (!sheet || sheet.length === 0) return null;
  const rows: WorkbookBusinessInvolvement["rows"] = [];
  let asOf: string | null = null;
  for (const { id, re } of INVOLVEMENT) {
    const row = sheet.find((r) => re.test(r[0] ?? ""));
    const pct = parseNumber(row?.[1]);
    if (!row || pct === null) continue;
    rows.push({ id, label: row[0], pct });
    asOf ??= asOfIn(row.slice(2));
  }
  if (rows.length === 0) return null;
  return {
    rows,
    coveragePct: parseNumber(labelled(sheet, /^Business Involvement Coverage/i).value),
    asOf,
  };
}

/** Lit un classeur produit iShares complet (européen ou américain). Ne lève jamais. */
export function parseISharesWorkbook(xml: string): ISharesWorkbook {
  const sheets = readSheets(xml);
  const header = sheets.get("Fund Header") ?? sheets.get("fundHeader");
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
  const geographyEu = readExposureBlock(sheets.get("Exposure Breakdowns"), "Geography/Locations");
  const geography =
    geographyEu.rows.length > 0
      ? geographyEu
      : readExposureBlock(sheets.get("Exposure Breakdowns"), "Geography/Countries");
  const holdings = readHoldings(sheets.get("Holdings"));

  const terRaw =
    keyFact(facts, "Total Expense Ratio") ??
    keyFact(facts, "Ongoing Charges Figure") ??
    keyFact(sheets.get("Fees"), "Expense Ratio");
  const ter = parseNumber(terRaw);
  // Les classeurs américains n'ont pas de ligne « devise » : la VL est écrite
  // « $14.88 ». On ne lit le dollar que là, jamais par défaut.
  // Pas de ligne ISIN côté américain, mais le CUSIP y est : l'ISIN s'en déduit
  // par la norme (ISO 6166), et le fonds est alors domicilié aux États-Unis.
  const isinFromUs = keyFact(facts, "ISIN") ? null : isinFromCusip(keyFact(facts, "CUSIP"));
  const navCell = header?.find((r) => /^\$\d/.test(r[0] ?? ""))?.[0];
  const currency =
    keyFact(facts, "Share Class Currency") ??
    keyFact(facts, "Fund Base Currency") ??
    (navCell ? "USD" : null);

  return {
    name: header?.[0]?.[0] || null,
    isin: keyFact(facts, "ISIN") ?? isinFromUs,
    currency,
    benchmark: keyFact(facts, "Benchmark Index"),
    sfdrDeclared: keyFact(facts, "SFDR Classification"),
    // Arrondi à 6 décimales : 0.65 / 100 donne 0.006500000000000001 en flottant.
    ter: ter === null ? null : Math.round((ter / 100) * 1e6) / 1e6,
    domicile: keyFact(facts, "Domicile") ?? (isinFromUs ? "United States" : null),
    assetClass: keyFact(facts, "Asset Class"),
    launchDate: parseWorkbookDate(
      keyFact(facts, "Share Class Launch Date") ?? keyFact(facts, "Fund Inception"),
    ),
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
    sustainability: readSustainability(sheets.get("Sustainability Characteristics")),
    businessInvolvement: readBusinessInvolvement(sheets.get("Business Involvement")),
  };
}
