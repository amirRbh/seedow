/**
 * Recommandation de cours contextuelle à partir de la cause principale d'un
 * portefeuille. Sert la boucle « faire → comprendre » : après avoir simulé un
 * portefeuille orienté (climat, biodiversité…), on propose les 2 cours les plus
 * pertinents pour comprendre ce qui vient d'être fait.
 *
 * Fonction pure (hors composant), testée contre le catalogue réel de cours.
 */

// Slugs réels du catalogue (src/content/courses). Un test vérifie qu'ils
// résolvent tous, pour attraper toute faute de frappe.
const BY_CAUSE: Record<string, [string, string]> = {
  climat: ["greenwashing-6-signaux", "mesurer-impact"],
  biodiversite: ["mesurer-impact", "exclusions-sectorielles"],
  humain: ["labels-isr-greenfin-sfdr", "exclusions-sectorielles"],
  egalite: ["labels-isr-greenfin-sfdr", "portefeuille-aligne-valeurs"],
  tech: ["esg-cest-quoi", "greenwashing-6-signaux"],
  circulaire: ["mesurer-impact", "exclusions-sectorielles"],
};

const DEFAULT: [string, string] = ["esg-cest-quoi", "diversification"];

/** Renvoie 2 slugs de cours pertinents pour une cause (défaut si inconnue). */
export function recommendCourseSlugs(cause?: string | null): string[] {
  return (cause && BY_CAUSE[cause]) || DEFAULT;
}
