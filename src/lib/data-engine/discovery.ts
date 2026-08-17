/**
 * Découverte de fonds (§5, chaînon manquant de l'expansion d'univers).
 *
 * Le reste du Data Engine ENRICHIT des fonds déjà connus (factsheet → ESG/WACI
 * sur un `assets` existant). Rien ne DÉCOUVRE de nouveaux fonds : d'où un univers
 * figé au catalogue seedé à la main. Ce module comble le trou côté logique pure
 * (parsing + mapping + plan d'insertion), l'I/O réelle vivant dans
 * `discovery.supabase.ts` (INSERT) et le hook (`fetch` réseau injecté).
 *
 * Règle absolue (CLAUDE.md §1.3) : aucune donnée inventée. Un fonds découvert
 * n'est créé qu'avec les champs RÉELLEMENT présents dans l'export de l'émetteur,
 * en `is_active=false` — il n'entre dans l'univers investissable qu'une fois
 * enrichi et sa complétude validée par le cron d'activation existant.
 */

import type { AssetClass } from "@/lib/portfolio/types";
import type { RawData } from "./connectors/types";

/** Un fonds découvert dans l'export d'un émetteur — champs d'IDENTITÉ seulement. */
export interface DiscoveredFund {
  isin: string | null;
  ticker: string;
  name: string;
  issuer: string | null;
  assetClass: AssetClass;
  region: string | null;
  currency: string | null;
  /** Frais courants en fraction (0.002 = 0,20 %/an), ou null si absent. */
  ter: number | null;
  /**
   * Symbole Yahoo construit à partir du ticker d'échange + suffixe de place,
   * ou null si la place n'est pas connue (jamais deviné). Sert à pricer le
   * candidat pour PROUVER qu'il cote réellement avant activation.
   */
  yahooSymbol: string | null;
  sourceKey: string;
  sourceUrl: string;
}

/**
 * Suffixe Yahoo par place de cotation. On ne construit un symbole QUE pour une
 * place connue : un ticker seul (« IWDA ») produit des collisions dangereuses
 * (cf. migration fix_investable_universe) — on ne devine jamais.
 */
const EXCHANGE_SUFFIX: { match: RegExp; suffix: string }[] = [
  { match: /london|lse|\bl\b/i, suffix: ".L" },
  { match: /xetra|deutsche|frankfurt/i, suffix: ".DE" },
  { match: /amsterdam/i, suffix: ".AS" },
  { match: /paris/i, suffix: ".PA" },
  { match: /borsa italiana|milan/i, suffix: ".MI" },
  { match: /six|swiss/i, suffix: ".SW" },
  { match: /brussels/i, suffix: ".BR" },
  { match: /madrid|bme/i, suffix: ".MC" },
  { match: /nasdaq|nyse|new york/i, suffix: "" }, // US : pas de suffixe
];

/** Construit un symbole Yahoo depuis ticker + place, ou null si place inconnue. */
export function buildYahooSymbol(ticker: string, exchange: string): string | null {
  const t = ticker.trim();
  if (!t) return null;
  const ex = exchange.trim();
  if (!ex) return null;
  for (const { match, suffix } of EXCHANGE_SUFFIX) {
    if (match.test(ex)) return `${t}${suffix}`;
  }
  return null; // place non reconnue → on ne fabrique pas de symbole
}

/**
 * Mappe la taxonomie iShares (assetClass + subAssetClass + nom) vers notre enum.
 * Renvoie `null` quand la classe ne peut PAS être déterminée avec confiance : un
 * fonds non mappable n'est jamais créé avec une classe devinée (il polluerait
 * l'optimiseur), il est simplement ignoré et journalisé.
 */
export function mapISharesAssetClass(
  assetClass: string,
  subAssetClass: string,
  name: string,
): AssetClass | null {
  const a = assetClass.toLowerCase();
  const sub = subAssetClass.toLowerCase();
  const n = name.toLowerCase();
  const hay = `${sub} ${n}`;

  // Thématique : mots-clés secteur/thème forts, priment sur equity générique.
  const thematic =
    /clean energy|hydrogen|water|clean|solar|wind|climate|biodivers|circular|timber|agribusiness|ageing|digital|robotic|automation|healthcare innovation|battery|electric vehicle|semiconductor|infrastructure/i;

  if (a.includes("equity") || a.includes("action")) {
    if (thematic.test(hay)) return "thematic";
    if (/emerging|marchés émergents|em\b|china|india|latin/i.test(hay)) return "equity_em";
    return "equity_dev";
  }
  if (a.includes("fixed income") || a.includes("bond") || a.includes("oblig")) {
    if (/green bond|green\b/i.test(hay)) return "green_bond";
    if (/social bond|social\b/i.test(hay)) return "social_bond";
    if (/govern|treasury|sovereign|gilt|bund|oat|govt/i.test(hay)) return "sov_bond";
    if (/corporate|corp\b|credit/i.test(hay)) return "corporate_bond";
    return "corporate_bond"; // repli obligataire le plus courant pour un ETF crédit
  }
  if (a.includes("real estate") || /reit|immobil/i.test(hay)) return "reit";
  if (a.includes("commodit") || /gold|silver|metal|matières premières/i.test(hay)) return "commodity";
  if (a.includes("money market") || /cash|monétaire|liquid/i.test(hay)) return "cash";

  return null; // inconnu → on n'invente pas de classe
}

/** Parse un nombre tolérant (virgule/point, %, espaces), null si vide/non-numérique. */
function parseNum(v: string | undefined): number | null {
  if (v == null) return null;
  const s = v.replace(/[%\s]/g, "").replace(",", ".").trim();
  if (s === "" || s === "-") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Découpe une ligne CSV en respectant les guillemets. */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else q = false;
      } else cur += c;
    } else if (c === '"') q = true;
    else if (c === ",") {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out;
}

/** Trouve l'index d'une colonne par nom d'en-tête (insensible casse/espaces/accents). */
function findCol(headers: string[], ...names: string[]): number {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]/g, "");
  const wanted = names.map(norm);
  return headers.findIndex((h) => wanted.includes(norm(h)));
}

/**
 * Parse l'export « product screener » CSV d'iShares en `DiscoveredFund[]`.
 *
 * Header-driven et tolérant : on lit les colonnes par NOM (pas par position),
 * pour survivre à une évolution de l'export. Une ligne sans ticker/nom, ou dont
 * la classe d'actif n'est pas mappable, est ignorée (jamais devinée). Le TER est
 * converti de pourcentage (0,20) en fraction (0,0020). Aucune donnée inventée :
 * un champ absent devient `null`.
 */
export function parseISharesProductCsv(raw: RawData): DiscoveredFund[] {
  if (raw.contentType !== "csv") return [];
  const lines = raw.content.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length < 2) return [];

  // L'export iShares préfixe parfois des lignes de titre : on cherche la 1ʳᵉ
  // ligne contenant un en-tête « Ticker ».
  let headerIdx = lines.findIndex((l) => /(^|,)\s*"?ticker"?\s*(,|$)/i.test(l));
  if (headerIdx < 0) headerIdx = 0;
  const headers = splitCsvLine(lines[headerIdx]).map((h) => h.trim());

  const iTicker = findCol(headers, "ticker");
  const iName = findCol(headers, "name", "fund name");
  const iIsin = findCol(headers, "isin");
  const iClass = findCol(headers, "asset class", "assetclass");
  const iSub = findCol(headers, "sub asset class", "subassetclass", "sub-asset class");
  const iRegion = findCol(headers, "region", "geography", "market");
  const iCcy = findCol(headers, "base currency", "currency", "fund currency");
  const iTer = findCol(headers, "net expense ratio (%)", "ter", "ongoing charge", "total expense ratio");
  const iExch = findCol(headers, "exchange", "listing exchange", "primary exchange");

  const at = (cols: string[], i: number) => (i >= 0 && i < cols.length ? cols[i].trim() : "");

  const out: DiscoveredFund[] = [];
  for (let r = headerIdx + 1; r < lines.length; r++) {
    const cols = splitCsvLine(lines[r]);
    const ticker = at(cols, iTicker);
    const name = at(cols, iName);
    if (!ticker || !name) continue;

    const assetClass = mapISharesAssetClass(at(cols, iClass), at(cols, iSub), name);
    if (!assetClass) continue; // non mappable → ignoré (pas de classe devinée)

    const terPct = parseNum(at(cols, iTer));
    out.push({
      isin: at(cols, iIsin) || null,
      ticker,
      name,
      issuer: "iShares",
      assetClass,
      region: at(cols, iRegion) || null,
      currency: at(cols, iCcy) || null,
      ter: terPct != null ? terPct / 100 : null, // % → fraction
      yahooSymbol: buildYahooSymbol(ticker, at(cols, iExch)),
      sourceKey: raw.sourceKey,
      sourceUrl: raw.sourceUrl,
    });
  }
  return out;
}

/** Identité minimale d'un actif déjà en base, pour le dédoublonnage. */
export interface ExistingAssetKey {
  ticker: string;
  isin: string | null;
}

export interface AssetInsertPlan {
  /** Fonds à créer (is_active=false), dédoublonnés vs l'existant. */
  toCreate: DiscoveredFund[];
  /** Tickers ignorés car déjà présents (par ticker ou ISIN). */
  skippedExisting: string[];
}

/**
 * Décide quels fonds découverts créer, sans jamais dupliquer un actif existant
 * (match par ticker OU ISIN) ni un doublon interne au lot. Logique PURE, testable
 * sans base — l'INSERT réel vit dans discovery.supabase.ts.
 */
export function planAssetInserts(
  existing: ExistingAssetKey[],
  discovered: DiscoveredFund[],
): AssetInsertPlan {
  const tickers = new Set(existing.map((e) => e.ticker.toUpperCase()));
  const isins = new Set(existing.map((e) => e.isin?.toUpperCase()).filter(Boolean) as string[]);

  const toCreate: DiscoveredFund[] = [];
  const skippedExisting: string[] = [];
  for (const f of discovered) {
    const t = f.ticker.toUpperCase();
    const i = f.isin?.toUpperCase();
    if (tickers.has(t) || (i && isins.has(i))) {
      skippedExisting.push(f.ticker);
      continue;
    }
    toCreate.push(f);
    tickers.add(t);
    if (i) isins.add(i);
  }
  return { toCreate, skippedExisting };
}
