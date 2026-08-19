/**
 * Politique d'activation d'un fonds découvert (§8, décision PURE et testable).
 *
 * Un fonds créé par la découverte est `is_active=false` : il n'entre dans
 * l'univers investissable que lorsqu'il est « présentable ». Deux voies, l'une
 * OU l'autre :
 *
 *  1. Complétude ≥ seuil : assez de champs sourcés (identité + impact/holdings…),
 *     voie historique inchangée.
 *  2. Tradeabilité prouvée : identité complète (ISIN, nom, émetteur, domicile,
 *     devise, frais) ET une série de cours réelle suffisante. C'est exactement
 *     le critère de la vérification ISIN manuelle (migration
 *     fix_investable_universe), mais automatisé : un fonds qui cote vraiment ET
 *     qu'on identifie sans ambiguïté est légitimement investissable, même avant
 *     que son ESG ne soit ingéré. À l'inverse, un ISIN placeholder/erroné n'a
 *     jamais de série de prix → il n'est JAMAIS activé (anti-fonds-fictif).
 *
 * Aucune donnée inventée : les deux voies s'appuient sur des faits mesurés
 * (complétude sourcée, nombre d'observations de cours réelles).
 */

export const ACTIVATION_COMPLETENESS_THRESHOLD = 50;
/** Aligné sur MIN_OBSERVATIONS du modèle de risque (~2 mois de bourse). */
export const ACTIVATION_MIN_PRICE_OBS = 40;

export interface IdentityFlags {
  hasIsin: boolean;
  hasName: boolean;
  hasIssuer: boolean;
  hasDomicile: boolean;
  hasCurrency: boolean;
  hasTer: boolean;
}

/** Identité « complète » = tous les champs d'identité + frais présents. */
export function hasFullIdentity(f: IdentityFlags): boolean {
  return f.hasIsin && f.hasName && f.hasIssuer && f.hasDomicile && f.hasCurrency && f.hasTer;
}

export interface ActivationInput {
  completeness: number;
  identity: IdentityFlags;
  /** Nombre d'observations de cours réelles disponibles pour ce fonds. */
  priceObservations: number;
}

/** Décide si un fonds inactif doit être activé. Pur, déterministe. */
export function shouldActivate(input: ActivationInput): boolean {
  if (input.completeness >= ACTIVATION_COMPLETENESS_THRESHOLD) return true;
  if (hasFullIdentity(input.identity) && input.priceObservations >= ACTIVATION_MIN_PRICE_OBS) {
    return true;
  }
  return false;
}
