/**
 * L'action du jour — une seule carte d'action prioritaire sur le dashboard,
 * au lieu de 9 modules qui se disputent l'attention (audit .lovable/plan.md §11).
 *
 * Fonction PURE : elle ne fait que choisir, selon une priorité déterministe et
 * l'état réel de l'utilisateur, LAQUELLE des actions honnêtes déjà disponibles
 * mérite la une. Elle n'invente aucune donnée — chaque branche ne se déclenche
 * que si l'état qui la justifie est réellement établi par l'appelant.
 *
 * Ordre de priorité (du plus urgent au plus routinier) :
 *   1. Profil incomplet         — bloque la personnalisation.
 *   2. Alerte greenwashing      — un écart discours/donnée sur une ligne DÉTENUE.
 *   3. Portefeuille vide        — premier investissement.
 *   4. Cours d'intro non fait   — onboarding pédagogique jamais terminé.
 *   5. Rien de spécial          — l'appelant retombe sur son flux par défaut
 *      (objectif proche ou briefing Ethi), déjà géré ailleurs (NextStepCard).
 */

export interface GreenwashingAlertInfo {
  assetId: string;
  company: string;
}

export interface NextActionInput {
  /** true si l'utilisateur n'a renseigné aucun nom d'affichage. */
  profileIncomplete: boolean;
  /** Alerte greenwashing réelle sur une ligne détenue, ou null si aucune. */
  greenwashingAlert: GreenwashingAlertInfo | null;
  /** true si le portefeuille actif n'a aucune ligne. */
  portfolioEmpty: boolean;
  /** true si le cours d'introduction (/comprendre) a déjà été vu ou passé. */
  introDone: boolean;
}

export type NextAction =
  | { kind: "complete_profile" }
  | { kind: "greenwashing_alert"; assetId: string; company: string }
  | { kind: "empty_portfolio" }
  | { kind: "start_course" }
  | { kind: "default" };

export function pickNextAction(input: NextActionInput): NextAction {
  if (input.profileIncomplete) return { kind: "complete_profile" };
  if (input.greenwashingAlert) {
    return {
      kind: "greenwashing_alert",
      assetId: input.greenwashingAlert.assetId,
      company: input.greenwashingAlert.company,
    };
  }
  if (input.portfolioEmpty) return { kind: "empty_portfolio" };
  if (!input.introDone) return { kind: "start_course" };
  return { kind: "default" };
}
