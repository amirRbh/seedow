/**
 * Passe-plat « pool → builder » (bascule produit : Seedow ne propose plus
 * d'allocation, il présente un pool classé que l'utilisateur compose).
 *
 * L'aperçu d'onboarding écrit ici la sélection du pool, puis navigue vers le
 * builder (`/construire`) — qui la relit pour pré-remplir ses lignes (à 0 %,
 * l'utilisateur alloue lui-même). Écrit côté navigateur pour survivre au mur
 * d'inscription (l'invité doit créer un compte avant de composer/sauvegarder) :
 * localStorage persiste à travers la redirection d'auth. Toujours sans exception
 * levée (mode privé strict, quota) — l'absence de seed dégrade proprement vers un
 * builder vide.
 */

import type { CauseTag, ExclusionTag } from "@/lib/portfolio/types";

const KEY = "seedow_pool_handoff";
/** Au-delà, le seed est considéré périmé (l'utilisateur a changé de contexte). */
const MAX_AGE_MS = 60 * 60 * 1000; // 1 h

export interface PoolHandoffAsset {
  id: string;
  ticker: string;
  name: string;
  esgScore: number;
}

/**
 * Intention de composition transmise avec le pool : mode (premier portefeuille
 * « replace » vs ajout « create »), convictions à conserver, nom éventuel, et
 * le cadre chiffré que l'utilisateur vient de poser dans le questionnaire
 * (montant, cible de risque et horizon dérivés de son objectif).
 *
 * Ce cadre traverse le passe-plat parce que rien d'autre ne le transporte :
 * sans lui, le portefeuille composé repartait sur des valeurs fabriquées
 * (100 €, 9 %, 10 ans) et « Mon argent » affichait un montant que l'utilisateur
 * n'avait jamais saisi (CLAUDE.md §1.3).
 */
export interface PoolHandoffIntent {
  mode: "replace" | "create";
  causes: CauseTag[];
  exclusions: ExclusionTag[];
  name?: string;
  /** Montant de départ (€) saisi à l'étape « amount ». */
  initialAmount?: number;
  /** Cible de volatilité annualisée dérivée de l'objectif (fraction). */
  riskTarget?: number;
  /** Horizon en années dérivé de l'objectif. */
  horizonYears?: number;
  /**
   * Intensité par cause (0..1) telle que calculée au questionnaire. Sans elle,
   * le portefeuille enregistré repartait sur `{}` : le pool reclassé plus tard
   * (réglages, aval) ne pondérait plus les causes comme l'aperçu vu à
   * l'onboarding.
   */
  causeIntensity?: Partial<Record<CauseTag, number>>;
}

/**
 * Bornes de relecture, alignées sur le schéma serveur (`CreateInputSchema`) :
 * une valeur hors bornes est ignorée plutôt que transmise, pour ne jamais faire
 * échouer l'enregistrement sur un seed corrompu ou périmé.
 */
const AMOUNT_MAX = 10_000_000;
const RISK_MIN = 0.02;
const RISK_MAX = 0.3;
const HORIZON_MIN = 1;
const HORIZON_MAX = 40;

/** Ne garde que les intensités exploitables (0..1) ; sinon `undefined`. */
function cleanIntensity(value: unknown): Partial<Record<CauseTag, number>> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const out: Partial<Record<CauseTag, number>> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1) {
      out[k as CauseTag] = v;
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/** Nombre fini dans les bornes, sinon `undefined` (on retombe sur le défaut). */
function inRange(value: unknown, min: number, max: number): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max
    ? value
    : undefined;
}

export interface PoolHandoff extends PoolHandoffIntent {
  assets: PoolHandoffAsset[];
}

interface StoredHandoff extends PoolHandoff {
  savedAt: number;
}

/** Accès sûr au localStorage, ou null si indisponible (SSR, mode privé strict). */
function safeStorage(): Pick<Storage, "getItem" | "setItem" | "removeItem"> | null {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
}

/** Mémorise la sélection du pool + l'intention de composition. Ne lève jamais. */
export function writePoolHandoff(assets: PoolHandoffAsset[], intent: PoolHandoffIntent): void {
  const storage = safeStorage();
  if (!storage) return;
  try {
    const payload: StoredHandoff = { assets, ...intent, savedAt: Date.now() };
    storage.setItem(KEY, JSON.stringify(payload));
  } catch {
    // Stockage indisponible (quota, mode privé) : on continue sans seed.
  }
}

/**
 * Relit le passe-plat (assets + intention) et le purge (usage unique). Retourne
 * `null` si absent, périmé ou illisible. Ne lève jamais.
 */
export function readPoolHandoff(now: number = Date.now()): PoolHandoff | null {
  const storage = safeStorage();
  if (!storage) return null;
  let raw: string | null = null;
  try {
    raw = storage.getItem(KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  // Purge en lecture : le seed est à usage unique (une entrée dans le builder).
  try {
    storage.removeItem(KEY);
  } catch {
    /* purge best-effort */
  }
  try {
    const parsed = JSON.parse(raw) as StoredHandoff;
    if (
      !parsed ||
      !Array.isArray(parsed.assets) ||
      typeof parsed.savedAt !== "number" ||
      now - parsed.savedAt > MAX_AGE_MS
    ) {
      return null;
    }
    // Garde-fou : on ne garde que des entrées bien formées.
    const clean = parsed.assets.filter(
      (a): a is PoolHandoffAsset =>
        a != null &&
        typeof a.id === "string" &&
        typeof a.ticker === "string" &&
        typeof a.name === "string" &&
        typeof a.esgScore === "number",
    );
    // On garde l'intention même sans actif (parcours « page blanche » : le
    // builder démarre vide mais doit connaître le mode — create ne doit jamais
    // écraser un portefeuille existant).
    return {
      assets: clean,
      mode: parsed.mode === "create" ? "create" : "replace",
      causes: Array.isArray(parsed.causes) ? parsed.causes : [],
      exclusions: Array.isArray(parsed.exclusions) ? parsed.exclusions : [],
      name: typeof parsed.name === "string" ? parsed.name : undefined,
      initialAmount: inRange(parsed.initialAmount, 0, AMOUNT_MAX),
      riskTarget: inRange(parsed.riskTarget, RISK_MIN, RISK_MAX),
      horizonYears: inRange(parsed.horizonYears, HORIZON_MIN, HORIZON_MAX),
      causeIntensity: cleanIntensity(parsed.causeIntensity),
    };
  } catch {
    return null;
  }
}

/** Efface tout seed en attente (best-effort). */
export function clearPoolHandoff(): void {
  const storage = safeStorage();
  if (!storage) return;
  try {
    storage.removeItem(KEY);
  } catch {
    /* best-effort */
  }
}
