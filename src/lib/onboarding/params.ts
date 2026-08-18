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
export type StepId = "values" | "exclusions" | "objective" | "amount";
export type Phase =
  | "steps"
  | "agency"
  | "preview"
  | "account"
  | "naming"
  | "building"
  | "saving";
export type Answers = Partial<Record<StepId, string[]>>;

export const DRAFT_KEY = "seedow_onboarding_draft";
export const DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 h
/** Montant par défaut (€) si l'utilisateur n'a pas choisi. */
export const DEFAULT_AMOUNT = 10;
/** Intensité appliquée à chaque cause sélectionnée. */
export const CAUSE_INTENSITY = 0.7;
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

/** Dérive les paramètres du moteur de portefeuille depuis les réponses. */
export function answersToParams(answers: Answers): PortfolioParams {
  const causes = ((answers.values ?? []) as CauseTag[]).slice(0, MAX_CAUSES);
  const exclusions = ((answers.exclusions ?? []) as ExclusionTag[]).slice(0, MAX_EXCLUSIONS);
  const { risk, horizon } = objectiveToRiskHorizon(answers.objective?.[0]);
  const amount = Number(answers.amount?.[0] ?? String(DEFAULT_AMOUNT)) || DEFAULT_AMOUNT;
  const cause_intensity: Record<string, number> = {};
  for (const c of causes) cause_intensity[c] = CAUSE_INTENSITY;
  return {
    causes,
    cause_intensity,
    exclusions,
    risk_target: risk,
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

export function isDraftExpired(
  savedAt: unknown,
  now: number,
  maxAge = DRAFT_MAX_AGE_MS,
): boolean {
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
