/**
 * Holdings iShares — lecture du classeur officiel BlackRock.
 *
 * ── Pourquoi ce fichier existe ────────────────────────────────────────────
 *
 * Le pipeline d'ingestion des holdings était complet et testé, mais ne
 * ramenait rien : il visait l'ancien endpoint CSV `….ajax?fileType=csv`, que
 * BlackRock a retiré en migrant son site. L'URL répond 200 — avec la page HTML
 * du fonds, pas le fichier. Un téléchargement « réussi » qui ne contient aucune
 * position : le pipeline recevait du HTML et concluait « aucune composition ».
 *
 * La source officielle existe toujours, à une autre adresse et dans un autre
 * format : l'API produit sert un classeur **SpreadsheetML** (XML Excel 2003).
 * Ce module le lit et le rend dans le type `ParsedHoldings` déjà utilisé par
 * `holdings-ingest` — le reste de la chaîne (contrôles qualité, persistance,
 * provenance) n'a pas à savoir que le format a changé.
 *
 * ── Ce qu'on refuse de faire ──────────────────────────────────────────────
 *
 * Le classeur ne porte PAS l'ISIN des titres détenus dans l'export grand
 * public : seulement ticker émetteur et nom. On rend donc `isin: null`. Le
 * déduire d'un ticker serait une correspondance approximative présentée comme
 * un identifiant — exactement le genre d'invention que Seedow s'interdit.
 *
 * De même, les poids sont rendus TELS QUE PUBLIÉS. Leur somme n'est jamais
 * exactement 100 % (arrondis, liquidités, dérivés) : la renormaliser
 * fabriquerait une composition que l'émetteur n'a pas publiée. L'écart est
 * mesuré ailleurs, par les contrôles qualité, et signalé.
 */

import type { ParsedHolding, ParsedHoldings } from "./holdings";

/**
 * Domaine de l'API produit BlackRock. Le site iShares grand public appelle la
 * même adresse : ce n'est pas un contournement, c'est le chemin officiel.
 */
const PRODUCT_API =
  "https://www.blackrock.com/varnish-api/uk-retail01-product-data/product-data/api/v1/get-fund-document";

/**
 * URL du classeur de composition d'un fonds, à partir de son identifiant
 * produit BlackRock. C'est l'URL enregistrée en `source_url` : elle est
 * publique et rejouable, donc vérifiable par quiconque lit la donnée.
 */
export function iSharesHoldingsUrl(portfolioId: string): string {
  const params = new URLSearchParams({
    appType: "PRODUCT_PAGE",
    appSubType: "ISHARES",
    targetSite: "ishares-uk",
    locale: "en_GB",
    component: "fundDownloadV2",
    userType: "individual",
    portfolioId,
  });
  return `${PRODUCT_API}?${params.toString()}`;
}

// ── Lecture du classeur ───────────────────────────────────────────────────

const ROW_RE = /<ss:Row>([\s\S]*?)<\/ss:Row>/g;
const CELL_RE = /<ss:Cell[^>]*>([\s\S]*?)<\/ss:Cell>/g;
const TAG_RE = /<[^>]+>/g;

/** Entités XML présentes dans les noms de titres (« PROCTER &amp; GAMBLE »). */
function decode(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();
}

function cellsOf(row: string): string[] {
  const out: string[] = [];
  CELL_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = CELL_RE.exec(row)) !== null) out.push(decode(m[1].replace(TAG_RE, "")));
  return out;
}

/** `25/Aug/2026` → `2026-08-25`. Rend null sur tout format non reconnu. */
export function parseIsharesDate(raw: string): string | null {
  const m = /^(\d{2})\/([A-Za-z]{3})\/(\d{4})$/.exec(raw.trim());
  if (!m) return null;
  const months = [
    "jan",
    "feb",
    "mar",
    "apr",
    "may",
    "jun",
    "jul",
    "aug",
    "sep",
    "oct",
    "nov",
    "dec",
  ];
  const idx = months.indexOf(m[2].toLowerCase());
  if (idx < 0) return null;
  return `${m[3]}-${String(idx + 1).padStart(2, "0")}-${m[1]}`;
}

/** `'5.33'` → 5.33 ; `'1,234.5'` → 1234.5 ; vide ou illisible → null. */
function parseWeight(raw: string): number | null {
  const cleaned = raw.replace(/[\s,]/g, "");
  if (cleaned === "" || cleaned === "-") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/**
 * Colonnes utiles, repérées par leur intitulé et non par leur position : les
 * fonds obligataires en portent quatorze, les fonds actions neuf, et l'ordre
 * n'est pas garanti d'un export à l'autre.
 */
interface ColumnMap {
  ticker: number;
  name: number;
  sector: number;
  weight: number;
}

function mapColumns(header: string[]): ColumnMap | null {
  const find = (...labels: string[]) =>
    header.findIndex((h) => labels.some((l) => h.toLowerCase() === l.toLowerCase()));
  const name = find("Name");
  const weight = find("Weight (%)");
  if (name < 0 || weight < 0) return null;
  return { ticker: find("Issuer Ticker", "Ticker"), name, sector: find("Sector"), weight };
}

/**
 * Lit un classeur SpreadsheetML iShares et rend sa composition.
 *
 * Le fichier n'est pas un tableau : c'est une fiche produit complète où le
 * tableau des positions est précédé de plusieurs centaines de lignes (VL,
 * performances, répartitions géographiques). On repère donc l'en-tête des
 * positions, et la date « as of » qui le précède immédiatement.
 *
 * Ne lève jamais : un document illisible rend une composition vide, que
 * l'appelant traite comme « pas de source exploitable ».
 */
export function parseISharesHoldings(xml: string): ParsedHoldings {
  const rows: string[][] = [];
  ROW_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ROW_RE.exec(xml)) !== null) rows.push(cellsOf(m[1]));

  let headerIdx = -1;
  let cols: ColumnMap | null = null;
  for (let i = 0; i < rows.length; i++) {
    const c = mapColumns(rows[i]);
    if (c) {
      headerIdx = i;
      cols = c;
      break;
    }
  }
  if (headerIdx < 0 || !cols) return { asOf: null, holdings: [] };

  // La date de référence est annoncée juste avant le tableau (« as of | date »).
  // On remonte de quelques lignes seulement : plus haut, on tomberait sur la
  // date de la valeur liquidative, qui n'est pas celle de la composition.
  let asOf: string | null = null;
  for (let i = headerIdx - 1; i >= Math.max(0, headerIdx - 6) && !asOf; i--) {
    for (const cell of rows[i]) {
      const d = parseIsharesDate(cell);
      if (d) {
        asOf = d;
        break;
      }
    }
  }

  const holdings: ParsedHolding[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const r = rows[i];
    const name = r[cols.name] ?? "";
    if (!name) continue;
    const weightPct = parseWeight(r[cols.weight] ?? "");
    if (weightPct === null) continue;
    holdings.push({
      ticker: cols.ticker >= 0 ? r[cols.ticker] || null : null,
      name,
      sector: cols.sector >= 0 ? r[cols.sector] || null : null,
      country: null,
      // L'export grand public ne porte pas l'ISIN des titres détenus. Le
      // déduire du ticker serait un identifiant fabriqué.
      isin: null,
      weightPct,
    });
  }

  return { asOf, holdings };
}
