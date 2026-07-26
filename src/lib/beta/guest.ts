/**
 * Stockage de la simulation « invité » (mode sans compte).
 *
 * Un visiteur peut simuler un portefeuille sans créer de compte ; ses choix
 * (cause, montant, allocation générée) sont conservés côté navigateur, avec une
 * expiration de 7 jours, jusqu'à ce qu'il crée un compte pour les sauvegarder.
 *
 * La logique de lecture/écriture vit ici (pas dans un composant) pour rester le
 * point d'entrée unique du mode invité — l'onboarding (écriture) et le dashboard
 * (lecture via GuestBanner) s'appuient sur les mêmes helpers.
 */

export const GUEST_STORAGE_KEY = "seedow_guest_simulation";

/** Durée de vie d'une simulation invité, en millisecondes (7 jours). */
export const GUEST_SIMULATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface GuestSimulation {
  /** Cause principale choisie (ex. "climat"). */
  cause: string;
  /** Montant simulé, en euros. */
  amount: number;
  /** Allocation générée : ticker/nom + poids en %. */
  allocation: { ticker: string; name: string; allocationPct: number }[];
  /**
   * Réponses brutes de l'onboarding (par étape), pour pouvoir reconstruire le
   * portefeuille réel si l'invité crée un compte — sans lui refaire remplir le
   * questionnaire. Optionnel (rétrocompat des simulations déjà stockées).
   */
  answers?: Record<string, string[]>;
  /** Horodatage de création (Date.now()), sert au calcul d'expiration. */
  createdAt: number;
}

/** Lit la simulation invité si elle existe et n'a pas expiré, sinon `null`. */
export function readGuestSimulation(): GuestSimulation | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(GUEST_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GuestSimulation;
    if (!parsed || typeof parsed.createdAt !== "number") return null;
    if (Date.now() - parsed.createdAt > GUEST_SIMULATION_TTL_MS) {
      clearGuestSimulation();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Écrit la simulation invité (horodatée maintenant). */
export function writeGuestSimulation(sim: Omit<GuestSimulation, "createdAt">): void {
  if (typeof window === "undefined") return;
  try {
    const payload: GuestSimulation = { ...sim, createdAt: Date.now() };
    window.localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Stockage indisponible (mode privé strict, quota) : on continue sans persister.
  }
}

/** Supprime la simulation invité (après création de compte ou expiration). */
export function clearGuestSimulation(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(GUEST_STORAGE_KEY);
  } catch {
    // no-op
  }
}

/** `true` s'il existe une simulation invité valide (non expirée). */
export function hasGuestSimulation(): boolean {
  return readGuestSimulation() !== null;
}
