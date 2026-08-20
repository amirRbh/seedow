/**
 * Dérivation d'un symbole Yahoo Finance à partir de l'identité catalogue Adanos
 * (`exchange` + `ticker`). Premier maillon du pipeline d'enrichissement : sans
 * `yahoo_symbol`, aucune série de cours ne peut s'accumuler (l'ingestion horaire
 * ne lit que les assets qui en ont un) — donc aucune activation possible.
 *
 * Rien n'est inventé (§1.3) : une place de cotation qu'on ne sait pas mapper avec
 * certitude → `null` (le symbole n'est pas posé). Le symbole DÉRIVÉ n'est jamais
 * écrit tel quel : le script le VALIDE contre Yahoo (une vraie cotation existe)
 * avant de le persister. Un symbole dérivé mais non validé est jeté.
 *
 * Fonctions PURES, sans I/O.
 */

/**
 * Suffixe Yahoo Finance par place de cotation Adanos (`exchange`). US = pas de
 * suffixe (ticker nu). Une place ambiguë (ex. « Euronext » sans ville) ou qu'on ne
 * sait pas mapper de façon sûre est ABSENTE de la table → `null` (jamais deviné).
 */
const EXCHANGE_YAHOO_SUFFIX: Record<string, string> = {
  // US (ticker nu)
  "NYSE ARCA": "",
  NASDAQ: "",
  NYSE: "",
  BATS: "",
  // Europe
  LSE: ".L",
  XETRA: ".DE",
  SIX: ".SW",
  AMS: ".AS",
  STO: ".ST",
  BME: ".MC",
  WSE: ".WA",
  BIST: ".IS",
  // Amériques
  TSX: ".TO",
  B3: ".SA",
  // Asie-Pacifique
  TSE: ".T",
  HKEX: ".HK",
  ASX: ".AX",
  KRX: ".KS",
  TWSE: ".TW",
  SGX: ".SI",
  NSE_IN: ".NS",
  BSE_IN: ".BO",
  SSE: ".SS",
  SZSE: ".SZ",
  NZX: ".NZ",
  // Autres
  TASE: ".TA",
  JSE: ".JO",
};

/**
 * Renvoie le suffixe Yahoo de la place, `""` pour les places US (ticker nu), ou
 * `null` si la place est inconnue/ambiguë (on ne pose alors pas de symbole).
 */
export function exchangeToYahooSuffix(exchange: string | null): string | null {
  const key = (exchange ?? "").trim().toUpperCase();
  if (!key) return null;
  return key in EXCHANGE_YAHOO_SUFFIX ? EXCHANGE_YAHOO_SUFFIX[key] : null;
}

/**
 * Dérive un symbole Yahoo candidat `TICKER[.SUFFIXE]`, ou `null` si le ticker est
 * absent ou la place non mappable. Candidat SEULEMENT : à valider contre Yahoo
 * avant écriture.
 */
export function deriveYahooSymbol(ticker: string | null, exchange: string | null): string | null {
  const t = (ticker ?? "").trim().toUpperCase();
  if (!t) return null;
  const suffix = exchangeToYahooSuffix(exchange);
  if (suffix === null) return null;
  return `${t}${suffix}`;
}
