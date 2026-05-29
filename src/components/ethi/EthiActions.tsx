export interface EthiAction {
  type: "deposit" | "seed";
  amount?: number;
  ticker?: string;
  name?: string;
}

/**
 * Parses Ethi's response to extract action tags and returns the cleaned content.
 * Les actions de dépôt sont neutralisées (pivot vers audit) : on strip les tags
 * pour ne pas polluer le texte, mais aucun bouton n'est rendu.
 */
export function parseEthiActions(content: string): { cleaned: string; actions: EthiAction[] } {
  const re = /\[(deposit|seed):[^\]]+\]/g;
  return { cleaned: content.replace(re, "").trim(), actions: [] };
}

export function EthiActions(_: { actions: EthiAction[] }) {
  return null;
}

