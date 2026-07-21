/**
 * Onboarding pédagogique néophyte — état minimal, sans backend.
 *
 * Deux clés localStorage : l'étape en cours (pour reprendre où on s'est arrêté)
 * et un drapeau « terminé/passé » (pour ne plus proposer l'intro sur le
 * dashboard). Best-effort : jamais bloquant, silencieux si le stockage est
 * indisponible (mode privé strict).
 */
export const INTRO_DONE_KEY = "seedow.intro.done";
export const INTRO_STEP_KEY = "seedow.intro.step";

export function isIntroDone(): boolean {
  try {
    return window.localStorage.getItem(INTRO_DONE_KEY) === "1";
  } catch {
    return false;
  }
}

export function markIntroDone(): void {
  try {
    window.localStorage.setItem(INTRO_DONE_KEY, "1");
  } catch {
    /* ignore */
  }
}

/** Réinitialise l'intro (utile pour « revoir la présentation » depuis Réglages). */
export function resetIntro(): void {
  try {
    window.localStorage.removeItem(INTRO_DONE_KEY);
    window.localStorage.removeItem(INTRO_STEP_KEY);
  } catch {
    /* ignore */
  }
}

export function readIntroStep(): number {
  try {
    const raw = window.localStorage.getItem(INTRO_STEP_KEY);
    const n = raw ? Number.parseInt(raw, 10) : 0;
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function saveIntroStep(step: number): void {
  try {
    window.localStorage.setItem(INTRO_STEP_KEY, String(step));
  } catch {
    /* ignore */
  }
}
