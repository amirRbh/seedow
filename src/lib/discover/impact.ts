/**
 * Lecture immédiate d'un score d'impact ESG (principe « Yuka » : un chiffre nu
 * comme « 7,4/10 » ne veut rien dire pour un débutant tant qu'il n'est pas
 * ancré par un mot et une couleur). On traduit le score 0..10 en un niveau
 * qualitatif lisible en une seconde.
 *
 * Sémantique couleur (DA §4) : le vert (mint) = positif ; le neutre (ink) = ni
 * bon ni mauvais ; le gris atténué = plus faible. On n'utilise PAS le rouge
 * `alert` : un score d'impact plus bas n'est pas un « danger », seule une vraie
 * alerte (greenwashing élevé) mérite ce rouge — il reste distinct.
 *
 * Le niveau ne repose jamais sur la couleur seule : il est toujours doublé du
 * mot ET du score chiffré côté UI (accessibilité daltoniens, DA §4).
 *
 * Fonction pure, sans dépendance UI — testée.
 */
export type ImpactLevel = "limite" | "correct" | "solide" | "fort";

export type ImpactTone = "mint" | "ink" | "muted";

export interface ImpactRating {
  level: ImpactLevel;
  tone: ImpactTone;
}

/** Seuils sur l'échelle ESG 0..10 (plus haut = meilleur impact). */
export function impactRating(score: number): ImpactRating {
  if (score >= 8) return { level: "fort", tone: "mint" };
  if (score >= 6.5) return { level: "solide", tone: "mint" };
  if (score >= 5) return { level: "correct", tone: "ink" };
  return { level: "limite", tone: "muted" };
}
