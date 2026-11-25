/**
 * Lecture d'une liste d'ISIN collée ou d'un CSV. Pur, testé.
 */

export const MAX_ISINS_PER_REPORT = 200;

const ISIN_SHAPE = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;

/** Clé de contrôle ISIN (ISO 6166) : Luhn sur la conversion lettres → nombres. */
export function isValidIsin(isin: string): boolean {
  if (!ISIN_SHAPE.test(isin)) return false;
  const digits = [...isin]
    .map((c) => (c >= "A" && c <= "Z" ? String(c.charCodeAt(0) - 55) : c))
    .join("");
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

export interface ParsedIsinList {
  /** ISIN valides, dédoublonnés, dans l'ordre d'apparition. */
  isins: string[];
  /** Jetons ayant la forme d'un ISIN mais une clé de contrôle fausse. */
  invalid: string[];
  /** ISIN au-delà de la limite par rapport. */
  truncated: number;
}

/**
 * Extrait les ISIN d'un texte libre : un par ligne, séparés par des virgules,
 * points-virgules ou tabulations, ou colonnes d'un CSV (en-têtes et noms de
 * fonds ignorés).
 */
export function parseIsinList(text: string, max = MAX_ISINS_PER_REPORT): ParsedIsinList {
  const seen = new Set<string>();
  const isins: string[] = [];
  const invalid: string[] = [];
  let truncated = 0;
  for (const raw of text.split(/[\s,;|]+/)) {
    const token = raw.replace(/^["']+|["']+$/g, "").toUpperCase();
    if (!ISIN_SHAPE.test(token)) continue;
    if (!isValidIsin(token)) {
      if (!invalid.includes(token)) invalid.push(token);
      continue;
    }
    if (seen.has(token)) continue;
    seen.add(token);
    if (isins.length >= max) truncated++;
    else isins.push(token);
  }
  return { isins, invalid, truncated };
}

/**
 * Nom d'un dépôt d'annexe dans `pro-annexes/inbox/<uid>/` : l'ISIN est porté
 * par le nom de fichier, seul canal entre l'interface et le script d'ingestion.
 */
export function inboxFileName(isin: string, timestamp: number): string {
  return `${isin}__${timestamp}.pdf`;
}

export function parseInboxFileName(name: string): string | null {
  const m = /^([A-Z0-9]{12})__[A-Za-z0-9._-]*\.pdf$/.exec(name);
  return m && isValidIsin(m[1]) ? m[1] : null;
}

/** « 12 500,50 », « 12500.5 », « 12 500 € » → 12500.5 ; null si ce n'est pas un montant. */
export function parseAmount(raw: string): number | null {
  const t = raw
    .replace(/[\s\u00a0\u202f\u20ac]/g, "")
    .replace(/,(\d{1,2})$/, ".$1")
    .replace(/,/g, "");
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  const n = Number(t);
  return n > 0 && Number.isFinite(n) ? n : null;
}

export interface ParsedAllocation extends ParsedIsinList {
  /** Montants dans l'ordre des ISIN, si CHAQUE ligne en porte un ; sinon null. */
  amounts: number[] | null;
  /** ISIN sans montant alors que d'autres en ont : allocation incomplète. */
  missing_amounts: string[];
}

/**
 * Lit une allocation « une ligne par fonds » : ISIN puis, facultativement, un
 * montant (« FR0010592022 ; 12 500 »). Sans aucun montant : évaluation fonds
 * par fonds. Avec des montants sur toutes les lignes : approche portefeuille.
 */
export function parseAllocation(text: string, max = MAX_ISINS_PER_REPORT): ParsedAllocation {
  const base = parseIsinList(text, max);
  const amountByIsin = new Map<string, number>();
  for (const line of text.split(/\r?\n/)) {
    const m = /\b([A-Za-z]{2}[A-Za-z0-9]{9}[0-9])\b/.exec(line);
    if (!m) continue;
    const isin = m[1].toUpperCase();
    const rest = line.slice(m.index + m[0].length).split(/[;\t|]/);
    for (const cell of rest) {
      const a = parseAmount(cell.replace(/^["']+|["']+$/g, ""));
      if (a !== null) {
        amountByIsin.set(isin, (amountByIsin.get(isin) ?? 0) + a);
        break;
      }
    }
  }
  const withAmount = base.isins.filter((i) => amountByIsin.has(i));
  const amounts =
    withAmount.length > 0 && withAmount.length === base.isins.length
      ? base.isins.map((i) => amountByIsin.get(i)!)
      : null;
  return {
    ...base,
    amounts,
    missing_amounts: withAmount.length > 0 ? base.isins.filter((i) => !amountByIsin.has(i)) : [],
  };
}
