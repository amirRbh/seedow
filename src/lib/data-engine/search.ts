/**
 * Normalisation de recherche & alias (§16).
 *
 * Objectif : « MSCI World », « iShares MSCI World », « IE00B4L5Y983 », « IWDA »
 * et « World » doivent pouvoir retrouver le même produit. On construit un jeu
 * d'alias normalisés par fonds, et un matcher qui compare une requête
 * normalisée à ces alias. Fonctions pures — la source de vérité reste la base.
 */

import { isValidIsin, normalizeIsin } from "./isin";

/** Minuscule, sans accents, espaces compactés, ponctuation neutralisée. */
export function normalizeText(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // diacritiques (combining marks)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export type QueryKind = "isin" | "ticker" | "text";

export interface ParsedQuery {
  kind: QueryKind;
  /** Valeur normalisée pour la comparaison. */
  normalized: string;
  /** ISIN canonique si la requête en est un valide. */
  isin: string | null;
}

/** Détermine ce que l'utilisateur a tapé : ISIN valide, ticker, ou texte libre. */
export function parseQuery(raw: string): ParsedQuery {
  const compact = raw.replace(/\s+/g, "").toUpperCase();
  const asIsin = normalizeIsin(compact);
  if (asIsin && isValidIsin(asIsin)) return { kind: "isin", normalized: asIsin, isin: asIsin };
  // Ticker : court, alphanumérique, sans espace (ex. IWDA, CW8).
  if (/^[A-Z0-9]{2,6}$/.test(compact)) return { kind: "ticker", normalized: compact, isin: null };
  return { kind: "text", normalized: normalizeText(raw), isin: null };
}

export interface SearchableFund {
  isin: string | null;
  ticker: string | null;
  name: string | null;
  issuer: string | null;
  indexTracked: string | null;
  /** Alias supplémentaires connus (ex. tickers alternatifs par place). */
  extraAliases?: string[];
}

/** Construit l'ensemble des alias normalisés d'un fonds (dédupliqués). */
export function buildAliases(fund: SearchableFund): string[] {
  const out = new Set<string>();
  const canonIsin = normalizeIsin(fund.isin);
  if (canonIsin && isValidIsin(canonIsin)) out.add(canonIsin.toLowerCase());
  if (fund.ticker) out.add(fund.ticker.toLowerCase());
  for (const field of [fund.name, fund.issuer, fund.indexTracked]) {
    if (field) out.add(normalizeText(field));
  }
  for (const a of fund.extraAliases ?? []) if (a) out.add(normalizeText(a));
  return [...out].filter((a) => a.length > 0);
}

/**
 * Un fonds matche-t-il une requête ? ISIN → égalité exacte ; ticker → égalité
 * exacte, sinon repli en recherche texte (« World » n'est pas un ticker mais
 * doit retrouver le fonds) ; texte → tous les mots présents dans les alias.
 */
export function fundMatchesQuery(fund: SearchableFund, raw: string): boolean {
  const q = parseQuery(raw);
  if (q.kind === "isin") return normalizeIsin(fund.isin) === q.isin;
  if (q.kind === "ticker" && (fund.ticker ?? "").toUpperCase() === q.normalized) return true;
  // Repli texte : chaque mot de la requête doit apparaître dans les alias (ordre
  // libre), pour que « iShares MSCI World » matche « iShares Core MSCI World… ».
  const norm = q.kind === "text" ? q.normalized : normalizeText(raw);
  if (norm.length === 0) return false;
  const haystackWords = new Set(buildAliases(fund).join(" ").split(" ").filter(Boolean));
  const tokens = norm.split(" ").filter(Boolean);
  return tokens.every((t) => haystackWords.has(t));
}
