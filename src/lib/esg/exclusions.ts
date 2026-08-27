import type { ExclusionTag } from "@/lib/portfolio/types";

/**
 * Les six exclusions que Seedow sait suivre — une seule liste, écrite ici.
 *
 * Elle sert à répondre à la question qui fait tout l'effet du produit : « ce
 * fonds, qu'est-ce qu'il ne s'interdit PAS ? ». Cette réponse se calcule par
 * différence entre cette liste et les exclusions déclarées par le fonds ; elle
 * n'a donc de sens que si la liste de référence est la même partout. Deux
 * copies qui divergent d'un secteur, et deux écrans affirment deux choses
 * différentes du même fonds.
 *
 * Formulation à tenir partout où elle est affichée : une absence ici est une
 * absence d'ENGAGEMENT déclaré, jamais la preuve qu'une position est détenue —
 * Seedow ne mesure pas la seconde et ne l'affirme donc pas (CLAUDE.md §1.3).
 */
export const TRACKED_EXCLUSIONS = [
  "fossiles",
  "armes",
  "tabac",
  "jeux",
  "animaux",
  "fast-fashion",
] as const satisfies readonly ExclusionTag[];

/**
 * Les secteurs sur lesquels un fonds ne déclare aucune exclusion, dans l'ordre
 * stable de la liste de référence.
 */
export function notExcluded(declared: readonly string[]): ExclusionTag[] {
  return TRACKED_EXCLUSIONS.filter((tag) => !declared.includes(tag));
}
