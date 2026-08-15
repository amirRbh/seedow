/**
 * Parseur de KID / DIC PRIIPS français (documents GECO) — distinct du parseur
 * MSCI (factsheets émetteurs en anglais, décimales « . »). Ici les documents
 * sont en français : décimales à la **virgule** (« 1,20 % ») et libellés de coûts
 * spécifiques (« Frais courants », « Coûts récurrents », « Frais de gestion »).
 *
 * Contrat §1.2 : on n'extrait que ce qui est réellement écrit ; format non
 * reconnu → null (jamais d'invention). Fonctions pures, testées.
 */

/** Nombre français/anglais → float (« 1,20 » ou « 1.20 » → 1.2), ou null. */
export function parseFrenchNumber(s: string | null | undefined): number | null {
  if (!s) return null;
  const n = Number(s.trim().replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/**
 * Article SFDR (6/8/9) d'un KID : on n'accepte un « Article X » que s'il est en
 * contexte de durabilité (SFDR / règlement 2019/2088 / « durable »), pour éviter
 * de confondre avec un article juridique quelconque. null si absent.
 */
export function parseKidSfdrArticle(text: string): number | null {
  const ctx =
    /(?:SFDR|2019\/2088|durabilit|informations? en mati[èe]re de durabilit)[\s\S]{0,200}?article\s*(6|8|9)\b/i;
  const ctxRev = /article\s*(6|8|9)\b[\s\S]{0,120}?(?:SFDR|2019\/2088|durabilit)/i;
  const m = text.match(ctx) ?? text.match(ctxRev);
  if (!m) return null;
  const n = Number(m[1]);
  return n === 6 || n === 8 || n === 9 ? n : null;
}

const TER_MAX = 0.1; // 10 % : au-delà = erreur de lecture

/**
 * Frais courants annuels (fraction) d'un KID. Couvre les libellés usuels du DIC
 * PRIIPS français, décimales à la virgule. null si absent ou hors bornes.
 */
export function parseKidOngoingCharges(text: string): number | null {
  const re =
    /(?:Frais courants|Co[ûu]ts?\s+r[ée]currents?|Frais de gestion(?:\s+et autres frais administratifs)?|Frais de fonctionnement et de gestion)[^%\d]{0,60}?(\d{1,2}(?:[.,]\d{1,2})?)\s*%/i;
  const m = text.match(re);
  const pct = parseFrenchNumber(m?.[1] ?? null);
  if (pct == null) return null;
  const frac = pct / 100;
  return frac >= 0 && frac <= TER_MAX ? frac : null;
}
