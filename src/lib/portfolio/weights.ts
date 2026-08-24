/**
 * Les poids sont ceux de l'utilisateur — on ne les réécrit pas.
 *
 * Jusqu'ici, une composition 50 / 20 / 10 était divisée par son total et
 * enregistrée 62,5 / 25 / 12,5 : le portefeuille stocké n'était pas celui que
 * la personne avait saisi. Seedow structure sans décider — la part non
 * attribuée est une information à montrer, pas une erreur à corriger dans son
 * dos.
 *
 * Vocabulaire de ce module :
 *  - **poids** : fraction du montant déclaré placée sur une ligne (0..1) ;
 *  - **part allouée** : leur somme ;
 *  - **part non attribuée** : ce qui reste, du liquide qui ne bouge pas.
 *
 * Une somme SUPÉRIEURE à 1 n'est pas une part non attribuée négative : c'est un
 * état impossible (on ne place pas plus que ce qu'on a). Il est signalé, jamais
 * rattrapé silencieusement.
 */

/**
 * Tolérance de sur-allocation — 0,01 %.
 *
 * Volontairement plus large que la précision d'enregistrement (6 décimales) :
 * une composition de n lignes arrondies chacune à 1e-6 peut sommer à
 * 1 + n × 5e-7. Avec une tolérance à 1e-6, un portefeuille de douze lignes
 * parfaitement valide serait refusé pour un arrondi. 1e-4 couvre deux cents
 * lignes, et personne ne sur-alloue de 0,01 % volontairement.
 */
export const WEIGHT_EPSILON = 1e-4;

/** Somme des poids strictement positifs. Ignore le bruit (NaN, négatifs). */
export function sumWeights(weights: Record<string, number>): number {
  let total = 0;
  for (const id in weights) {
    const w = weights[id];
    if (Number.isFinite(w) && w > 0) total += w;
  }
  return total;
}

/** Part réellement placée (0..1+). Peut dépasser 1 — voir `isOverAllocated`. */
export function allocatedShare(weights: Record<string, number>): number {
  return sumWeights(weights);
}

/**
 * Part non attribuée (0..1) : ce que l'utilisateur n'a pas placé. Jamais
 * négative — une sur-allocation ne « mange » pas la réserve, elle est traitée à
 * part.
 */
export function unallocatedShare(weights: Record<string, number>): number {
  return Math.max(0, 1 - sumWeights(weights));
}

/** true si la somme dépasse 1 au-delà de l'arrondi : état à corriger par l'utilisateur. */
export function isOverAllocated(weights: Record<string, number>): boolean {
  return sumWeights(weights) > 1 + WEIGHT_EPSILON;
}

/**
 * Nettoie une carte de poids SANS la renormaliser :
 *  - ne garde que les lignes strictement positives et finies ;
 *  - ne garde que les identifiants connus (`isKnown`), les autres sont écartés
 *    plutôt que de fausser la somme ;
 *  - arrondit à 6 décimales, la précision d'enregistrement ;
 *  - borne chaque ligne à 1 (une ligne ne peut pas dépasser le montant total).
 *
 * La somme n'est jamais ramenée à 1 : c'est tout l'objet de ce module.
 */
export function sanitizeWeights(
  raw: Record<string, number>,
  isKnown: (id: string) => boolean = () => true,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const id in raw) {
    const w = raw[id];
    if (!Number.isFinite(w) || w <= 0) continue;
    if (!isKnown(id)) continue;
    out[id] = Math.min(1, Math.round(w * 1e6) / 1e6);
  }
  return out;
}

/**
 * Répartition normalisée sur la seule part allouée — pour les lectures qui sont
 * des MOYENNES et non des montants : diversification, score ESG moyen,
 * intensité carbone. Sans ça, laisser 90 % de côté ferait passer un portefeuille
 * d'une seule ligne pour parfaitement diversifié.
 *
 * Retourne un objet vide si rien n'est alloué.
 */
export function normalizedForAverages(weights: Record<string, number>): Record<string, number> {
  const total = sumWeights(weights);
  if (total <= 0) return {};
  const out: Record<string, number> = {};
  for (const id in weights) {
    const w = weights[id];
    if (Number.isFinite(w) && w > 0) out[id] = w / total;
  }
  return out;
}
