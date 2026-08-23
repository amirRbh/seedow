/**
 * Logique PURE du tunnel d'onboarding — extraite de `routes/onboarding.tsx`
 * (1600+ lignes, sans test) pour être fiabilisée et couverte.
 *
 * Deux responsabilités critiques, toutes deux hors UI :
 *  1. Mapping des réponses → paramètres du moteur de portefeuille
 *     (`answersToParams` / `objectiveToRiskHorizon`). Une erreur ici = un
 *     portefeuille faux généré silencieusement pour l'utilisateur.
 *  2. Persistance du brouillon (reprise après confirmation d'email / OAuth,
 *     souvent dans un nouvel onglet). Une erreur ici = progression perdue au
 *     pire point d'abandon du tunnel de conversion.
 *
 * Le stockage est INJECTÉ (pas de dépendance directe à `localStorage`) pour être
 * testable en environnement Node, et pour dégrader proprement quand le stockage
 * est indisponible (mode privé strict, quota).
 */

import type { CauseTag, ExclusionTag, PortfolioParams } from "@/lib/portfolio/types";

/** IDs d'étape — alignés sur les enums DB. */
export type StepId = "values" | "exclusions" | "objective" | "amount" | "risk";
/**
 * Phases du tunnel. « building » / « saving » ont disparu avec la génération
 * d'allocation : Seedow ne fabrique plus de portefeuille pendant que
 * l'utilisateur attend — l'aperçu montre un pool classé (`preview`) et la
 * composition se fait ensuite dans le builder (`/construire`).
 */
export type Phase = "steps" | "agency" | "preview" | "account" | "naming";
export type Answers = Partial<Record<StepId, string[]>>;

export const DRAFT_KEY = "seedow_onboarding_draft";
export const DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 h
/** Montant par défaut (€) si l'utilisateur n'a pas choisi. */
export const DEFAULT_AMOUNT = 10;
/** Intensité appliquée à chaque cause sélectionnée (mode uniforme, défaut). */
export const CAUSE_INTENSITY = 0.7;

/**
 * X2 — Appétence au risque, DISTINCTE du but (faiblesse n°8 de l'audit : le
 * risque ne doit pas être déduit du seul objectif). Facteur multiplicatif
 * appliqué au risque dérivé du but. Absent → 1.0 (comportement inchangé).
 */
export const RISK_APPETITE_FACTORS: Record<string, number> = {
  prudent: 0.7,
  equilibre: 1.0,
  dynamique: 1.35,
};
/** Bornes de sécurité du risque cible annualisé (aucun profil hors de [3%,16%]). */
export const RISK_TARGET_MIN = 0.03;
export const RISK_TARGET_MAX = 0.16;

/**
 * X2 — Intensité de cause RELATIVE (faiblesse n°6 : intensité uniforme = pas de
 * hiérarchie). Les causes sont classées par ordre de priorité (ordre de sélection) :
 * la 1re reçoit `top`, chaque suivante `step` de moins, plancher `floor`. Bornée
 * dans [floor, 1]. Utilisée quand l'onboarding fournit une priorité ; sinon on
 * conserve l'intensité uniforme (rétrocompatibilité).
 */
export function rankedCauseIntensity(
  orderedCauses: CauseTag[],
  { top = 0.9, step = 0.12, floor = 0.45 }: { top?: number; step?: number; floor?: number } = {},
): Partial<Record<CauseTag, number>> {
  const out: Partial<Record<CauseTag, number>> = {};
  orderedCauses.forEach((c, i) => {
    out[c] = Math.min(1, Math.max(floor, top - i * step));
  });
  return out;
}

/** Applique l'appétence au risque dérivé du but, borné dans [MIN, MAX]. */
export function applyRiskAppetite(baseRisk: number, appetite: string | undefined): number {
  const factor = appetite ? (RISK_APPETITE_FACTORS[appetite] ?? 1.0) : 1.0;
  return Math.min(RISK_TARGET_MAX, Math.max(RISK_TARGET_MIN, baseRisk * factor));
}
/** Bornes défensives (le moteur en attend au plus 6 de chaque). */
export const MAX_CAUSES = 6;
export const MAX_EXCLUSIONS = 6;

export interface OnboardingDraft {
  phase: Phase;
  stepIndex: number;
  answers: Answers;
  portfolioName: string;
  isAdditive: boolean;
}

// ── Mapping réponses → paramètres du moteur ──────────────────────────────────

/** Objectif d'onboarding → (cible de risque annualisée, horizon en années). */
export function objectiveToRiskHorizon(obj: string | undefined): {
  risk: number;
  horizon: number;
} {
  switch (obj) {
    case "retraite":
      return { risk: 0.13, horizon: 25 };
    case "maison":
      return { risk: 0.1, horizon: 8 };
    case "court":
      return { risk: 0.06, horizon: 2 };
    case "epargne":
    default:
      return { risk: 0.09, horizon: 10 };
  }
}

export interface AnswersToParamsOptions {
  /**
   * X2 — active l'intensité de cause RELATIVE (classée par ordre de sélection)
   * plutôt qu'uniforme. Par défaut false : comportement historique préservé
   * (l'onboarding l'activera une fois la priorité collectée dans l'UI).
   */
  rankedIntensity?: boolean;
}

/** Dérive les paramètres du moteur de portefeuille depuis les réponses. */
export function answersToParams(
  answers: Answers,
  opts: AnswersToParamsOptions = {},
): PortfolioParams {
  const causes = ((answers.values ?? []) as CauseTag[]).slice(0, MAX_CAUSES);
  const exclusions = ((answers.exclusions ?? []) as ExclusionTag[]).slice(0, MAX_EXCLUSIONS);
  const { risk, horizon } = objectiveToRiskHorizon(answers.objective?.[0]);
  // X2 — appétence au risque distincte du but (absente → risque du but inchangé).
  const risk_target = applyRiskAppetite(risk, answers.risk?.[0]);
  const amount = Number(answers.amount?.[0] ?? String(DEFAULT_AMOUNT)) || DEFAULT_AMOUNT;
  // X2 — intensité relative si demandée (et si une priorité existe), sinon uniforme.
  const cause_intensity: Partial<Record<CauseTag, number>> = opts.rankedIntensity
    ? rankedCauseIntensity(causes)
    : Object.fromEntries(causes.map((c) => [c, CAUSE_INTENSITY]));
  return {
    causes,
    cause_intensity,
    exclusions,
    risk_target,
    horizon_years: horizon,
    initial_amount: amount,
  };
}

// ── Persistance du brouillon (stockage injecté) ──────────────────────────────

/** Sous-ensemble de l'API Storage réellement utilisé. */
export interface DraftStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Accès sûr au localStorage global, ou null si indisponible. */
function defaultStorage(): DraftStorage | null {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null; // accès au stockage bloqué (mode privé strict)
  }
}

export function isDraftExpired(savedAt: unknown, now: number, maxAge = DRAFT_MAX_AGE_MS): boolean {
  return typeof savedAt === "number" && now - savedAt > maxAge;
}

/**
 * Charge le brouillon correspondant au contexte (`isAdditive`) :
 *  - expiré → purgé et null ;
 *  - contexte différent (premier portefeuille vs additionnel) ou sans phase → null ;
 *  - sinon → brouillon complété par des valeurs par défaut sûres.
 * Ne lève jamais.
 */
export function loadDraft(
  isAdditive: boolean,
  now: number = Date.now(),
  storage: DraftStorage | null = defaultStorage(),
): OnboardingDraft | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<OnboardingDraft> & { savedAt?: number };
    if (isDraftExpired(parsed.savedAt, now)) {
      clearDraft(storage);
      return null;
    }
    // Un brouillon "nouveau portefeuille" ne doit pas être repris par le flux du
    // premier portefeuille, et inversement.
    if (!parsed.phase || Boolean(parsed.isAdditive) !== isAdditive) return null;
    return {
      phase: parsed.phase,
      stepIndex: parsed.stepIndex ?? 0,
      answers: parsed.answers ?? {},
      portfolioName: parsed.portfolioName ?? "",
      isAdditive,
    };
  } catch {
    return null;
  }
}

export function saveDraft(
  draft: OnboardingDraft,
  now: number = Date.now(),
  storage: DraftStorage | null = defaultStorage(),
): void {
  if (!storage) return;
  try {
    storage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, savedAt: now }));
  } catch {
    // Stockage indisponible (quota, mode privé) : on continue sans persister.
  }
}

export function clearDraft(storage: DraftStorage | null = defaultStorage()): void {
  if (!storage) return;
  try {
    storage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}
