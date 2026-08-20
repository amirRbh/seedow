/**
 * Garde-fou de conformité en SORTIE d'Ethi (CLAUDE.md §5, non négociable §1.1).
 *
 * Le prompt système interdit déjà les recommandations personnalisées, mais un
 * LLM peut déraper. Comme l'endpoint `/api/ethi` n'est PAS en streaming (on
 * reçoit la réponse complète avant de la renvoyer), on peut la valider et
 * remplacer toute recommandation d'investissement personnalisée/chiffrée par un
 * message sûr, AVANT qu'elle n'atteigne l'utilisateur. Défense en profondeur.
 *
 * Le détecteur vise la HAUTE PRÉCISION (n'attrape que des directives claires),
 * pour ne pas censurer une explication pédagogique légitime : le prompt reste la
 * première barrière, ce filtre est le filet de sécurité pour les cas nets.
 *
 * Purement fonctionnel, entièrement testable — la vérité vit dans les tests.
 */

export type EthiLang = "fr" | "en";

/**
 * Motifs de recommandation d'investissement PERSONNALISÉE (directive adressée à
 * l'utilisateur). On ne bloque jamais une simple mention pédagogique d'un
 * concept ("acheter des actions comporte un risque", "un ETF regroupe…").
 */
const PATTERNS: { re: RegExp; reason: string }[] = [
  // Cadre explicite « je te recommande / tu devrais … <action> » (FR).
  {
    re: /\b(je te (recommande|conseille|sugg[eè]re)|tu devrais|tu dois|il faut (que tu|absolument))\b[^.!?\n]{0,40}\b(ach[eè]t\w*|acheter|vend\w*|vendre|d[eé]pos\w*|d[eé]poser|investi\w*|investir|plac\w*|placer|mets|mettre|arbitr\w*|sors|sortir)\b/i,
    reason: "directive personnalisée (cadre « je te recommande / tu devrais »)",
  },
  // Explicit "I recommend / you should … <action>" (EN).
  {
    re: /\b(i (recommend|suggest|advise)|you (should|ought to|must|need to)|my advice)\b[^.!?\n]{0,40}\b(buy|sell|deposit|invest|put|allocate|move|switch)\b/i,
    reason: 'personalized directive ("I recommend / you should")',
  },
  // Impératif « achète/vends … ce/tes/cet [… ] ETF|fonds|action|obligation… » (FR).
  {
    re: /\b(ach[eè]tes?|vends?|revends?)\b[^.!?\n]{0,30}\b(ce|cet|cette|ces|tes|ton|ta|le|la|les|du|des|un|une)\s+(?:[\w'’-]+\s+){0,3}(etf|fonds|action|actions|titre|titres|obligation|obligations|bitcoin|crypto|or)\b/i,
    reason: "impératif d'achat/vente sur un instrument précis",
  },
  // Imperative "buy/sell … this/your [… ] ETF|fund|stock|bond…" (EN).
  {
    re: /\b(buy|sell)\b[^.!?\n]{0,30}\b(this|that|these|those|your|the|a|an)\s+(?:[\w'-]+\s+){0,3}(etf|fund|stock|stocks|share|shares|bond|bonds|bitcoin|crypto|gold)\b/i,
    reason: "imperative buy/sell of a specific instrument",
  },
  // Impératif en tête de clause + montant chiffré (« Dépose 50 € », « Invest €200 »).
  {
    re: /(^|[.!?:]\s+)(d[eé]poses?|investis|places?|mets|ach[eè]tes?|vends?|deposit|invest|put|buy|sell|allocate)\s+[^.!?\n]{0,20}[$€]?\s?\d[\d\s.,]*\s?(€|euros?|k€|\$|dollars?|%)?/i,
    reason: "impératif chiffré (montant/action précis)",
  },
];

/**
 * Renvoie la raison de non-conformité si la réponse contient une recommandation
 * d'investissement personnalisée, sinon `null`.
 */
export function detectPersonalizedRecommendation(content: string): string | null {
  const text = content ?? "";
  for (const { re, reason } of PATTERNS) {
    if (re.test(text)) return reason;
  }
  return null;
}

/** Message de repli sûr, on-brand, quand une réponse est filtrée. */
export const SAFE_FALLBACK: Record<EthiLang, string> = {
  fr: "Je ne peux pas te dire quoi acheter, vendre ou déposer précisément — ce serait une recommandation personnalisée, et ce n'est pas mon rôle. En revanche je peux t'expliquer les facteurs qui comptent (horizon, tolérance au risque, diversification, frais) et t'aider à explorer des scénarios avec le simulateur. Sur quoi veux-tu qu'on creuse ? 💡",
  en: "I can't tell you exactly what to buy, sell or deposit — that would be a personalized recommendation, which isn't my role. I can explain the factors that matter (horizon, risk tolerance, diversification, fees) and help you explore scenarios with the simulator. What would you like to dig into? 💡",
};

export interface EthiEvaluation {
  /** true si la réponse d'origine est conforme et peut être renvoyée telle quelle. */
  safe: boolean;
  /** Contenu à renvoyer à l'utilisateur (d'origine si sûr, repli sinon). */
  content: string;
  /** Raison du filtrage (pour les logs/monitoring), si filtré. */
  reason?: string;
}

/**
 * Évalue et, si nécessaire, remplace la réponse d'Ethi. Une réponse vide est
 * renvoyée telle quelle (l'endpoint gère déjà ce cas d'erreur).
 */
export function evaluateEthiReply(content: string, lang: EthiLang): EthiEvaluation {
  if (!content || content.trim() === "") return { safe: true, content };
  const reason = detectPersonalizedRecommendation(content);
  if (reason) return { safe: false, content: SAFE_FALLBACK[lang], reason };
  return { safe: true, content };
}
