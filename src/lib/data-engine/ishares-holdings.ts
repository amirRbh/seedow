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
import type { ISharesSite } from "./ishares-funds";

/**
 * API produit BlackRock, par place de cotation. Le site iShares grand public
 * appelle ces mêmes adresses : ce n'est pas un contournement, c'est le chemin
 * officiel — chacune a été relevée dans la page produit correspondante.
 *
 * Les deux hôtes ne sont PAS interchangeables, et l'erreur est silencieuse :
 * demander un fonds britannique à l'hôte américain rend bien un classeur, avec
 * les mêmes lignes — mais des poids tronqués à l'entier (« 5 » au lieu de
 * « 5,33 »), dont la somme tombe à 37 %. Un fichier qui a l'air juste et qui ne
 * l'est pas. D'où une adresse par place, et la place portée par le registre.
 */
const PRODUCT_API: Record<ISharesSite, { host: string; targetSite: string; locale: string }> = {
  uk: {
    host: "https://www.blackrock.com/varnish-api/uk-retail01-product-data/product-data/api/v1/get-fund-document",
    targetSite: "ishares-uk",
    locale: "en_GB",
  },
  us: {
    host: "https://www.blackrock.com/varnish-api/blk-one01-product-data/product-data/api/v1/get-fund-document",
    targetSite: "us-ishares",
    locale: "en_US",
  },
};

/**
 * URL du classeur de composition d'un fonds. C'est l'URL enregistrée en
 * `source_url` : elle est publique et rejouable, donc vérifiable par quiconque
 * lit la donnée.
 */
export function iSharesHoldingsUrl(portfolioId: string, site: ISharesSite = "uk"): string {
  const api = PRODUCT_API[site];
  const params = new URLSearchParams({
    appType: "PRODUCT_PAGE",
    appSubType: "ISHARES",
    targetSite: api.targetSite,
    locale: api.locale,
    component: "fundDownloadV2",
    userType: "individual",
    portfolioId,
  });
  return `${api.host}?${params.toString()}`;
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

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/**
 * Date de référence d'un classeur, dans les deux formes que BlackRock publie :
 * `25/Aug/2026` sur le site britannique, `Aug 26, 2026` sur le site américain.
 *
 * La seconde n'était pas reconnue. La conséquence n'avait rien de cosmétique :
 * sans date, `runHoldingsQualityChecks` rejette le lot (§12 — une composition
 * sans date de référence n'est pas publiable) et `buildHoldingRows` ne rend
 * aucune ligne. Tout fonds américain était donc lu correctement, puis jeté.
 *
 * Rend null sur tout format non reconnu — on ne devine pas une date.
 */
export function parseIsharesDate(raw: string): string | null {
  const text = raw.trim();

  // Britannique : 25/Aug/2026
  const uk = /^(\d{2})\/([A-Za-z]{3})\/(\d{4})$/.exec(text);
  if (uk) {
    const idx = MONTHS.indexOf(uk[2].toLowerCase());
    return idx < 0 ? null : `${uk[3]}-${String(idx + 1).padStart(2, "0")}-${uk[1]}`;
  }

  // Américain : Aug 26, 2026 (le jour peut n'avoir qu'un chiffre)
  const us = /^([A-Za-z]{3})[a-z]* (\d{1,2}), (\d{4})$/.exec(text);
  if (us) {
    const idx = MONTHS.indexOf(us[1].toLowerCase());
    return idx < 0
      ? null
      : `${us[3]}-${String(idx + 1).padStart(2, "0")}-${us[2].padStart(2, "0")}`;
  }

  return null;
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
  /** Présentes sur les fonds obligataires (14 colonnes), absentes en actions (9). */
  maturity: number;
  coupon: number;
  assetClass: number;
}

function mapColumns(header: string[]): ColumnMap | null {
  const find = (...labels: string[]) =>
    header.findIndex((h) => labels.some((l) => h.toLowerCase() === l.toLowerCase()));
  const name = find("Name");
  const weight = find("Weight (%)");
  if (name < 0 || weight < 0) return null;
  return {
    ticker: find("Issuer Ticker", "Ticker"),
    name,
    sector: find("Sector"),
    weight,
    // Échéance et coupon sont ce qui sépare deux obligations du même émetteur.
    // Elles étaient lues et jetées ; sans elles, quatre-vingts obligations AT&T
    // se confondent en une seule ligne.
    maturity: find("Maturity"),
    coupon: find("Coupon (%)"),
    assetClass: find("Asset Class"),
  };
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

    // Fin du tableau. Le classeur enchaîne les tableaux SANS ligne vide entre
    // eux : la composition est immédiatement suivie d'un « As Of | NAV per
    // Share | … » de cinq colonnes. Une ligne trop courte pour porter la
    // colonne des poids n'appartient donc pas à ce tableau — et si on se
    // contente de la SAUTER, la lecture se poursuit dans les tableaux
    // suivants et ramasse leurs lignes.
    //
    // C'est ce qui arrivait sur l'export américain complet : quarante lignes
    // d'un historique de distributions rejoignaient la composition, avec une
    // date en guise de nom de titre (« Jun 15, 2026 ») et un nombre en guise
    // de classe d'actif. On s'arrête au lieu de sauter.
    if (r.length <= cols.weight) break;

    const name = r[cols.name] ?? "";
    if (!name) continue;
    const weightPct = parseWeight(r[cols.weight] ?? "");
    if (weightPct === null) continue;
    // « - » est la façon dont l'export note « sans objet » (une ligne de
    // liquidités n'a pas d'échéance). On le rend absent, pas littéral.
    const cell = (idx: number): string | null => {
      if (idx < 0) return null;
      const v = (r[idx] ?? "").trim();
      return v === "" || v === "-" ? null : v;
    };
    const coupon = parseWeight(r[cols.coupon] ?? "");

    holdings.push({
      ticker: cols.ticker >= 0 ? r[cols.ticker] || null : null,
      name,
      sector: cols.sector >= 0 ? r[cols.sector] || null : null,
      country: null,
      // L'export grand public ne porte pas l'ISIN des titres détenus. Le
      // déduire du ticker serait un identifiant fabriqué.
      isin: null,
      weightPct,
      maturity: cell(cols.maturity),
      couponPct: coupon,
      assetClass: cell(cols.assetClass),
    });
  }

  return { asOf, holdings };
}
