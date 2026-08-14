/**
 * Bornage du coût IA d'Ethi (rationalisation).
 *
 * Ethi est un coût variable non borné par requête (tokens LLM). Deux fuites
 * simples, sans perte de qualité :
 *   - l'HISTORIQUE : on renvoyait jusqu'à 40 messages au modèle à chaque appel ;
 *     seuls les plus récents portent le contexte utile → on tronque.
 *   - la SORTIE : aucune limite de tokens en sortie ; le prompt exige déjà des
 *     réponses courtes (3 blocs / 2-4 phrases) → un plafond borne le pire cas.
 *
 * Fonctions pures (aucune I/O), testables et réutilisables hors de l'endpoint.
 */

export interface EthiMessage {
  role: "user" | "assistant";
  content: string;
}

/** Nb max de messages d'historique envoyés au modèle (les plus récents). */
export const MAX_HISTORY_MESSAGES = 12;

/** Plafond de tokens en sortie : borne le coût sans brider une réponse courte. */
export const MAX_OUTPUT_TOKENS = 700;

/**
 * Ne conserve que les `max` derniers messages (recency = contexte utile).
 * Ne mute pas l'entrée ; renvoie le tableau tel quel s'il est déjà assez court.
 * `max <= 0` renvoie un historique vide (garde-fou, jamais attendu en pratique).
 */
export function trimHistory<T extends EthiMessage>(
  messages: readonly T[],
  max = MAX_HISTORY_MESSAGES,
): T[] {
  if (max <= 0) return [];
  if (messages.length <= max) return [...messages];
  return messages.slice(messages.length - max);
}
