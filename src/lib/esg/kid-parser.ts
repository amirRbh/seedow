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
 * Article SFDR (6/8/9) d'un fonds. Les documents GECO regroupent KID +
 * prospectus + règlement, truffés d'« article 6/8/9 » hors-sujet (dépositaire,
 * comptes, taxonomie 2020/852…). Un simple « article X près de durabilité » y
 * produit des faux positifs (ex. confondre l'art. 6 de la taxonomie 2020/852
 * avec l'art. 6 SFDR). On n'accepte donc un numéro que s'il est **directement
 * rattaché au règlement SFDR** (2019/2088). null si absent ou ambigu — jamais
 * une classification inventée ou approximative.
 */
export function parseKidSfdrArticle(text: string): number | null {
  // 1) Formulation de classification explicite (« au sens de l'article X … du
  //    règlement SFDR / 2019/2088 ») — la plus fiable.
  const authoritative =
    /au sens de l['’]article\s*(6|8|9)\b[^.\n]{0,40}?\bdu r[èe]glement\s*(?:\(UE\)\s*)?(?:n[°ºo]?\s*)?(?:2019\/2088|SFDR)/i;
  const auth = text.match(authoritative);
  if (auth) return Number(auth[1]);

  // 2) Sinon, toute référence « article X … du règlement SFDR / 2019/2088 » —
  //    retenue uniquement si non ambiguë (une seule valeur distincte).
  const bound =
    /article\s*(6|8|9)\b[^.\n]{0,40}?\bdu r[èe]glement\s*(?:\(UE\)\s*)?(?:n[°ºo]?\s*)?(?:2019\/2088|SFDR)/gi;
  const values = new Set<number>();
  for (const m of text.matchAll(bound)) values.add(Number(m[1]));
  return values.size === 1 ? [...values][0] : null;
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
