/**
 * Parseur de KID / DIC PRIIPS français (documents GECO) — distinct du parseur
 * MSCI (factsheets émetteurs en anglais, décimales « . »). Ici les documents
 * sont en français : décimales à la **virgule** (« 1,20 % »).
 *
 * Deux formats réels coexistent (calibré sur des KID réels via GECO) :
 *   - DICI classique : une ligne « Frais courants  X % ».
 *   - DIC PRIIPS     : « Frais de gestion et autres frais » (libellé) puis, sur
 *     une ligne voisine, « X % de la valeur de votre investissement par an ».
 *
 * Contrat §1.2 : on n'extrait que ce qui est réellement écrit ; format non
 * reconnu ou valeur ambiguë (DIC multi-parts) → null (jamais d'invention).
 * Fonctions pures, testées.
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

/** Pourcentage (« 1,20 ») → fraction bornée [0, TER_MAX], ou null. */
function pctToFraction(raw: string | null | undefined): number | null {
  const pct = parseFrenchNumber(raw);
  if (pct == null) return null;
  const frac = pct / 100;
  return frac >= 0 && frac <= TER_MAX ? frac : null;
}

/**
 * Frais courants / de gestion récurrents (fraction) d'un KID. null si absent,
 * hors bornes, ou ambigu (DIC multi-parts affichant plusieurs valeurs qu'on ne
 * peut pas attribuer à l'ISIN depuis le seul texte → on n'invente pas).
 */
export function parseKidOngoingCharges(text: string): number | null {
  // 1) DICI classique : « Frais courants  X % » (libellé et valeur rapprochés).
  const dici = text.match(/Frais courants[^%\d]{0,40}?(\d{1,2}(?:[.,]\d{1,2})?)\s*%/i);
  const diciFrac = pctToFraction(dici?.[1]);
  if (diciFrac != null) return diciFrac;

  // 2) DIC PRIIPS : le montant récurrent porte l'ancre « X % de la valeur de
  //    votre investissement par an » (le libellé « Frais de gestion et autres
  //    frais » est sur une autre ligne, souvent séparé par du texte contenant
  //    des chiffres). On exige la présence du libellé, puis on ne renvoie une
  //    valeur que si elle est UNIQUE dans le document (un DIC multi-parts en
  //    affiche plusieurs → non attribuable → null).
  if (/Frais de gestion et autres frais/i.test(text)) {
    const re = /(\d{1,2}(?:[.,]\d{1,2})?)\s*%\s+de la valeur de votre investissement par an/gi;
    const values = new Set<number>();
    for (const m of text.matchAll(re)) {
      const frac = pctToFraction(m[1]);
      if (frac != null) values.add(frac);
    }
    if (values.size === 1) return [...values][0];
  }

  return null;
}
