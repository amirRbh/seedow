/**
 * Ton Argent Vote — sélection de la résolution « moment WOW » de l'onboarding.
 *
 * Après le questionnaire, on montre à l'utilisateur qu'une VRAIE résolution
 * d'assemblée générale l'attend déjà — matchée, si possible, sur la conviction
 * qu'il vient de choisir. Le but est le déclic « ton argent devient une voix »,
 * jamais une promesse creuse : on ne surface que des résolutions encore
 * OUVERTES (« tu pourras peser dessus »), sourcées et datées (§1.2 / §1.3 du
 * CLAUDE.md). Logique pure (aucun réseau/DB) pour vivre hors composant et être
 * testable (§3).
 */
import { isVotable, soonestClosingOpen } from "./bloc";
import type { ResolutionWithBloc } from "./vote.functions";

export interface AgencyTeaser {
  item: ResolutionWithBloc;
  /** Vrai si la résolution correspond à une conviction que l'utilisateur vient de choisir. */
  matchedCause: boolean;
}

/**
 * Choisit la résolution à mettre en avant dans l'onboarding.
 *
 * Priorité : une résolution ouverte alignée sur une conviction choisie, celle
 * qui clôt le plus tôt (le vote le plus « urgent » que l'utilisateur peut
 * rejoindre). À défaut de correspondance, la prochaine résolution ouverte quelle
 * qu'elle soit. `null` si aucune n'est ouverte — l'appelant saute alors la scène
 * plutôt que d'afficher un écran mort.
 */
export function pickAgencyTeaser(
  resolutions: readonly ResolutionWithBloc[],
  causes: readonly string[],
  now: Date = new Date(),
): AgencyTeaser | null {
  const open = resolutions.filter((r) => isVotable(r.resolution, now));
  if (open.length === 0) return null;

  const causeSet = new Set(causes);
  const matched = open.filter(
    (r) => r.resolution.theme != null && causeSet.has(r.resolution.theme),
  );

  const pool = matched.length > 0 ? matched : open;
  const soonest = soonestClosingOpen(
    pool.map((r) => r.resolution),
    now,
  );
  if (!soonest) return null;
  const item = pool.find((r) => r.resolution.id === soonest.id);
  if (!item) return null;

  return { item, matchedCause: matched.length > 0 };
}
