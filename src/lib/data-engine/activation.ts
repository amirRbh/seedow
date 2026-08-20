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
  /**
   * L'asset provient-il du catalogue Adanos (`catalog_listing_key` non nul) ? Ces
   * ETF sont promus EN MASSE avec `esg_score=0` par défaut → soumis à un garde-fou
   * ESG supplémentaire ci-dessous. Optionnel : absent = fonds curé historique.
   */
  isCatalogOrigin?: boolean;
  /** Un score ESG SOURCÉ est-il attaché (`esg_score_source` non nul) ? */
  hasSourcedEsg?: boolean;
}

/**
 * Décide si un fonds inactif doit être activé. Pur, déterministe.
 *
 * Garde-fou catalogue (§1.2, anti-flood) : un ETF issu du catalogue Adanos ne
 * s'active JAMAIS sur la seule tradeabilité prouvée sans ESG sourcé — sinon
 * Découvrir se remplirait de fonds non notés (`esg_score=0`) promus en masse. Les
 * fonds curés hors catalogue gardent la voie historique (tradeabilité seule OK).
 */
export function shouldActivate(input: ActivationInput): boolean {
  if (input.completeness >= ACTIVATION_COMPLETENESS_THRESHOLD) return true;
  if (hasFullIdentity(input.identity) && input.priceObservations >= ACTIVATION_MIN_PRICE_OBS) {
    if (input.isCatalogOrigin && !input.hasSourcedEsg) return false;
    return true;
  }
  return false;
}
