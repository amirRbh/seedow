/**
 * Utilitaires ISIN — validation, normalisation, extraction.
 *
 * Un ISIN (ISO 6166) identifie de façon unique un titre : 2 lettres de pays +
 * 9 caractères alphanumériques + 1 chiffre de contrôle (Luhn sur la chaîne
 * convertie A=10..Z=35). C'est la clé de jointure primaire du Data Engine
 * (fonds ↔ documents ↔ holdings ↔ titres sous-jacents).
 *
 * Fonctions pures, sans I/O. On ne « devine » jamais un ISIN : une chaîne qui
 * n'est pas valide au sens Luhn est rejetée (§9 — ne jamais inventer, §21 —
 * détecter les ISIN invalides).
 */

const ISIN_RE = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;

/** Normalise une saisie ISIN : trim, majuscules, suppression des espaces. */
export function normalizeIsin(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(/\s+/g, "").toUpperCase();
  return cleaned.length > 0 ? cleaned : null;
}

/** Convertit chaque lettre en sa valeur (A=10..Z=35), chiffre inchangé. */
function expandToDigits(isin: string): string {
  let out = "";
  for (const ch of isin) {
    if (ch >= "0" && ch <= "9") out += ch;
    else out += (ch.charCodeAt(0) - 55).toString(); // 'A'(65) → 10
  }
  return out;
}

/** Chiffre de contrôle Luhn (mod 10) sur une chaîne de chiffres. */
function luhnCheckDigit(digits: string): number {
  let sum = 0;
  let double = true; // on double en partant de la droite du corps (avant clé)
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return (10 - (sum % 10)) % 10;
}

/**
 * Valide un ISIN : format (2 alpha + 9 alnum + 1 chiffre) ET chiffre de
 * contrôle Luhn. Accepte une saisie brute (normalise avant contrôle).
 */
export function isValidIsin(raw: string | null | undefined): boolean {
  const isin = normalizeIsin(raw);
  if (!isin || isin.length !== 12 || !ISIN_RE.test(isin)) return false;
  const body = expandToDigits(isin.slice(0, 11));
  const expected = luhnCheckDigit(body);
  return expected === isin.charCodeAt(11) - 48;
}

/** Code pays ISO 3166 (2 lettres) d'un ISIN, ou null si invalide. */
export function isinCountry(raw: string | null | undefined): string | null {
  const isin = normalizeIsin(raw);
  return isin && isValidIsin(isin) ? isin.slice(0, 2) : null;
}

/** Renvoie l'ISIN normalisé s'il est valide, sinon null (jamais d'invention). */
export function toCanonicalIsin(raw: string | null | undefined): string | null {
  const isin = normalizeIsin(raw);
  return isin && isValidIsin(isin) ? isin : null;
}
