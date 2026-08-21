/**
 * Registre CANONIQUE des dimensions de matching (pivot PIU).
 *
 * Ce fichier est la source de vérité unique des dimensions selon lesquelles
 * l'univers est classé pour un utilisateur. Il est partagé :
 *   - par les préférences (`user_preferences.dimension_weights` — CE que
 *     l'utilisateur pondère) ;
 *   - par le futur moteur de matching (`lib/matching/`, étape P0 suivante — qui
 *     ajoutera à chaque dimension sa FORME de satisfaction et ses seuils).
 *
 * Principe non négociable (docs/ARCHITECTURE-PIU.md §6) : Seedow MESURE et fournit
 * une satisfaction par dimension ; l'UTILISATEUR PONDÈRE. Les poids vivent ici et
 * en base ; jamais un poids « choisi par Seedow » n'est présenté comme la vérité.
 * Les quatre familles (`group`) ne doivent JAMAIS être fondues en un seul score
 * (§6 du brief) — elles structurent l'affichage décomposé du « pourquoi ».
 *
 * Fonctions/valeurs PURES, aucune dépendance DB/UI. Les libellés sont en i18n
 * (clés `preferences.dimensions.*`) — pas de texte affichable en dur ici.
 */

/** Identifiants stables des dimensions. Ordre = ordre d'affichage par défaut. */
export const MATCH_DIMENSIONS = [
  "values_alignment", // ce que l'argent finance et qui compte pour l'utilisateur
  "harm_avoidance", // l'exposition résiduelle à ce que l'utilisateur refuse
  "climate", // bas carbone, trajectoire crédible (WACI, ITR)
  "esg_quality", // qualité E/S/G des entreprises financées
  "controversy", // absence de controverse en cours
  "cost", // frais (TER, puis coûts KID)
  "risk_fit", // compatibilité avec la tolérance déclarée
  "diversification", // concentration / overlap réel
  "disclosure", // transparence & fraîcheur des données (dimension-moat)
] as const;

export type MatchDimension = (typeof MATCH_DIMENSIONS)[number];

/**
 * Les quatre familles « jamais fondues ». Elles regroupent les dimensions pour
 * l'affichage, sans jamais les agréger entre familles en un score unique.
 */
export type DimensionGroup = "alignment" | "impact" | "financial" | "disclosure";

export interface DimensionMeta {
  group: DimensionGroup;
  /** Poids par défaut ∈ [0,1] du profil publié (modifiable par l'utilisateur). */
  defaultWeight: number;
  /** Clé i18n du libellé court (`preferences.dimensions.<id>.label`). */
  i18nKey: string;
}

/**
 * Profil de poids par DÉFAUT, publié et modifiable (jamais caché). Il penche vers
 * ce qui compte pour un débutant guidé par ses valeurs (personas Léa/Karim), sans
 * imposer : chaque poids est un point de départ que l'utilisateur ajuste. La somme
 * n'a pas à valoir 1 — la normalisation se fait à l'agrégation (moteur de matching).
 */
export const DIMENSION_META: Record<MatchDimension, DimensionMeta> = {
  values_alignment: {
    group: "alignment",
    defaultWeight: 0.8,
    i18nKey: "preferences.dimensions.values_alignment.label",
  },
  harm_avoidance: {
    group: "alignment",
    defaultWeight: 0.8,
    i18nKey: "preferences.dimensions.harm_avoidance.label",
  },
  climate: { group: "impact", defaultWeight: 0.7, i18nKey: "preferences.dimensions.climate.label" },
  esg_quality: {
    group: "impact",
    defaultWeight: 0.6,
    i18nKey: "preferences.dimensions.esg_quality.label",
  },
  controversy: {
    group: "impact",
    defaultWeight: 0.6,
    i18nKey: "preferences.dimensions.controversy.label",
  },
  cost: { group: "financial", defaultWeight: 0.6, i18nKey: "preferences.dimensions.cost.label" },
  risk_fit: {
    group: "financial",
    defaultWeight: 0.6,
    i18nKey: "preferences.dimensions.risk_fit.label",
  },
  diversification: {
    group: "financial",
    defaultWeight: 0.5,
    i18nKey: "preferences.dimensions.diversification.label",
  },
  disclosure: {
    group: "disclosure",
    defaultWeight: 0.5,
    i18nKey: "preferences.dimensions.disclosure.label",
  },
};

/** Vrai si `x` est un identifiant de dimension connu. */
export function isMatchDimension(x: unknown): x is MatchDimension {
  return typeof x === "string" && (MATCH_DIMENSIONS as readonly string[]).includes(x);
}

/** Dimensions d'une famille donnée, dans l'ordre canonique. */
export function dimensionsByGroup(group: DimensionGroup): MatchDimension[] {
  return MATCH_DIMENSIONS.filter((d) => DIMENSION_META[d].group === group);
}
