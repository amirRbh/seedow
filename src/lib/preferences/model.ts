/**
 * Logique PURE des préférences utilisateur (pivot PIU). Aucune I/O, aucune
 * dépendance DB/UI — testée isolément (`__tests__/model.test.ts`).
 *
 * Rôle : produire, valider et normaliser des poids par dimension de matching, et
 * faire le pont entre l'onboarding existant (causes classées, exclusions) et le
 * nouveau modèle pondéré. On NE réécrit pas la logique d'intensité de cause :
 * on réutilise `rankedCauseIntensity` (déjà testée) de `lib/onboarding/params`.
 *
 * Contrat de robustesse : toute donnée venue de la base (`jsonb` ouvert) passe
 * par `sanitize*` avant usage — clés inconnues ignorées, valeurs bornées, jamais
 * de throw. Une préférence corrompue dégrade vers le défaut, elle ne casse pas
 * le classement de l'univers.
 */

import type { CauseTag, ExclusionTag } from "@/lib/portfolio/types";
import { rankedCauseIntensity } from "@/lib/onboarding/params";
import {
  DIMENSION_META,
  MATCH_DIMENSIONS,
  isMatchDimension,
  type MatchDimension,
} from "./dimensions";

/** Poids complets, un par dimension, ∈ [0,1]. */
export type DimensionWeights = Record<MatchDimension, number>;

/** Provenance d'une version de préférences. Aligné sur le CHECK `source` en base. */
export type PreferenceSource = "default" | "onboarding" | "manual";

/** Charge utile d'écriture (ce que l'app envoie à `save_user_preferences`). */
export interface UserPreferencesInput {
  dimensionWeights: DimensionWeights;
  exclusions: ExclusionTag[];
  riskTolerance: RiskTolerance | null;
  constraints: PreferenceConstraints;
  source: PreferenceSource;
}

/** Version persistée (lecture), = input + métadonnées de version. */
export interface UserPreferences extends UserPreferencesInput {
  id: string;
  version: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type RiskTolerance = "prudent" | "equilibre" | "dynamique";
const RISK_TOLERANCES: readonly RiskTolerance[] = ["prudent", "equilibre", "dynamique"];

/**
 * Contraintes libres réutilisables. Volontairement restreintes et typées : un
 * `jsonb` ouvert en base, mais un contrat clair côté app (on n'y met pas
 * n'importe quoi). Étendre ici quand une contrainte devient un vrai besoin.
 */
export interface PreferenceConstraints {
  /** N'inclure que les actifs confirmés disponibles pour un particulier UE. */
  availableEuOnly?: boolean;
  /** TER maximum souhaité (%), filtre doux exprimé en préférence. */
  maxTerPct?: number;
  /** Régions souhaitées (buckets lisibles, cf. discover/filters). */
  regions?: string[];
}

const VALID_EXCLUSIONS: readonly ExclusionTag[] = [
  "fossiles",
  "armes",
  "tabac",
  "jeux",
  "animaux",
  "fast-fashion",
];

/** Causes à dominante environnementale — orientent la dimension `climate`. */
const ENV_CAUSES: ReadonlySet<CauseTag> = new Set(["climat", "biodiversite", "circulaire"]);
/** Causes à dominante sociale — orientent la qualité ESG (pilier S). */
const SOCIAL_CAUSES: ReadonlySet<CauseTag> = new Set(["humain", "egalite"]);

/** Borne une valeur dans [0,1] ; renvoie 0 pour toute entrée non finie. */
export function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/** Profil de poids par défaut (issu du registre canonique). */
export function defaultDimensionWeights(): DimensionWeights {
  const out = {} as DimensionWeights;
  for (const d of MATCH_DIMENSIONS) out[d] = DIMENSION_META[d].defaultWeight;
  return out;
}

/**
 * Complète un jeu partiel de poids : chaque dimension absente prend son défaut,
 * chaque valeur présente est bornée à [0,1]. Résultat toujours complet.
 */
export function normalizeWeights(
  partial: Partial<Record<MatchDimension, number>>,
): DimensionWeights {
  const out = defaultDimensionWeights();
  for (const d of MATCH_DIMENSIONS) {
    const v = partial[d];
    if (v !== undefined) out[d] = clamp01(v);
  }
  return out;
}

/**
 * Parse défensif d'un `jsonb` de poids venu de la base : ignore les clés
 * inconnues, coerce les nombres, borne à [0,1], complète par les défauts.
 * Ne lève jamais.
 */
export function sanitizeWeights(raw: unknown): DimensionWeights {
  const partial: Partial<Record<MatchDimension, number>> = {};
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (isMatchDimension(k) && typeof v === "number") partial[k] = v;
    }
  }
  return normalizeWeights(partial);
}

/** Parse défensif d'exclusions (drop des valeurs hors enum, dédup). */
export function sanitizeExclusions(raw: unknown): ExclusionTag[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<ExclusionTag>();
  for (const v of raw) {
    if (typeof v === "string" && (VALID_EXCLUSIONS as string[]).includes(v)) {
      seen.add(v as ExclusionTag);
    }
  }
  return [...seen];
}

/** Parse défensif de la tolérance au risque. Inconnue → null. */
export function sanitizeRiskTolerance(raw: unknown): RiskTolerance | null {
  return typeof raw === "string" && (RISK_TOLERANCES as string[]).includes(raw)
    ? (raw as RiskTolerance)
    : null;
}

/** Parse défensif des contraintes (ne garde que les champs connus et bien typés). */
export function sanitizeConstraints(raw: unknown): PreferenceConstraints {
  const out: PreferenceConstraints = {};
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    if (typeof o.availableEuOnly === "boolean") out.availableEuOnly = o.availableEuOnly;
    if (typeof o.maxTerPct === "number" && Number.isFinite(o.maxTerPct) && o.maxTerPct >= 0) {
      out.maxTerPct = o.maxTerPct;
    }
    if (Array.isArray(o.regions)) {
      const regions = o.regions.filter((r): r is string => typeof r === "string");
      if (regions.length) out.regions = regions;
    }
  }
  return out;
}

/**
 * Part relative de chaque dimension (somme = 1), pour l'affichage « quel poids
 * a quoi ». Si tous les poids sont nuls, renvoie une répartition uniforme plutôt
 * qu'une division par zéro.
 */
export function weightShares(weights: DimensionWeights): DimensionWeights {
  let total = 0;
  for (const d of MATCH_DIMENSIONS) total += weights[d];
  const out = {} as DimensionWeights;
  if (total <= 0) {
    const uniform = 1 / MATCH_DIMENSIONS.length;
    for (const d of MATCH_DIMENSIONS) out[d] = uniform;
    return out;
  }
  for (const d of MATCH_DIMENSIONS) out[d] = weights[d] / total;
  return out;
}

/**
 * Pont onboarding → poids par dimension. Modeste par construction : l'ordre des
 * causes et les exclusions inclinent quelques dimensions au-dessus du défaut ;
 * la personnalisation fine reste les curseurs (réglage `manual`). On réutilise
 * `rankedCauseIntensity` (intensité décroissante selon la priorité déclarée).
 *
 * - `values_alignment` monte avec l'intensité de la cause n°1 (plus l'utilisateur
 *   tient à ses causes, plus « financer ce qui compte » pèse) ;
 * - `climate` monte avec la plus forte cause environnementale ;
 * - `esg_quality` reçoit un léger appui si une cause sociale est présente ;
 * - `harm_avoidance` monte avec le nombre d'exclusions posées.
 */
export function deriveWeightsFromCauses(
  orderedCauses: CauseTag[],
  exclusions: ExclusionTag[] = [],
): DimensionWeights {
  const w = defaultDimensionWeights();
  const intensity = rankedCauseIntensity(orderedCauses);

  const all = Object.values(intensity).filter((v): v is number => typeof v === "number");
  const top = all.length ? Math.max(...all) : 0;
  if (top > 0) w.values_alignment = clamp01(Math.max(w.values_alignment, top));

  let envMax = 0;
  let hasSocial = false;
  for (const c of orderedCauses) {
    const i = intensity[c] ?? 0;
    if (ENV_CAUSES.has(c)) envMax = Math.max(envMax, i);
    if (SOCIAL_CAUSES.has(c)) hasSocial = true;
  }
  if (envMax > 0) w.climate = clamp01(Math.max(w.climate, envMax));
  if (hasSocial) w.esg_quality = clamp01(w.esg_quality + 0.1);

  const exCount = sanitizeExclusions(exclusions).length;
  if (exCount > 0) w.harm_avoidance = clamp01(Math.max(w.harm_avoidance, 0.6 + 0.1 * exCount));

  return w;
}

/** Préférences par défaut, prêtes à persister (`source: 'default'`). */
export function buildDefaultPreferences(): UserPreferencesInput {
  return {
    dimensionWeights: defaultDimensionWeights(),
    exclusions: [],
    riskTolerance: null,
    constraints: {},
    source: "default",
  };
}

/** Assemble une charge d'écriture depuis l'onboarding (`source: 'onboarding'`). */
export function buildOnboardingPreferences(
  orderedCauses: CauseTag[],
  exclusions: ExclusionTag[],
  riskTolerance: RiskTolerance | null = null,
): UserPreferencesInput {
  return {
    dimensionWeights: deriveWeightsFromCauses(orderedCauses, exclusions),
    exclusions: sanitizeExclusions(exclusions),
    riskTolerance,
    constraints: {},
    source: "onboarding",
  };
}

const WEIGHT_EPSILON = 1e-6;

/**
 * Deux jeux de préférences sont-ils équivalents ? Sert au versionnage : on
 * n'insère PAS une nouvelle version pour une sauvegarde sans changement réel
 * (évite de polluer l'historique). Compare les poids à ε près, les exclusions
 * comme des ensembles, la tolérance et les contraintes par valeur.
 */
export function preferencesEqual(a: UserPreferencesInput, b: UserPreferencesInput): boolean {
  for (const d of MATCH_DIMENSIONS) {
    if (Math.abs(a.dimensionWeights[d] - b.dimensionWeights[d]) > WEIGHT_EPSILON) return false;
  }
  if (a.riskTolerance !== b.riskTolerance) return false;
  const exA = [...a.exclusions].sort();
  const exB = [...b.exclusions].sort();
  if (exA.length !== exB.length || exA.some((x, i) => x !== exB[i])) return false;
  return stableStringify(a.constraints) === stableStringify(b.constraints);
}

/** Sérialisation JSON à clés triées (comparaison stable de `constraints`). */
function stableStringify(obj: PreferenceConstraints): string {
  const keys = Object.keys(obj).sort();
  return JSON.stringify(obj, keys);
}

/** Forme brute d'une ligne `user_preferences` telle que lue en base. */
export interface PreferencesRow {
  id: string;
  version: number;
  is_active: boolean;
  dimension_weights: unknown;
  exclusions: unknown;
  risk_tolerance: unknown;
  constraints: unknown;
  source: unknown;
  created_at: string;
  updated_at: string;
}

const VALID_SOURCES: readonly PreferenceSource[] = ["default", "onboarding", "manual"];

/**
 * Mappe une ligne DB (bruts) vers le modèle app, en assainissant chaque champ.
 * Pur : réutilisable côté client (hook) comme côté serveur (server function),
 * sans dépendance TanStack/Supabase.
 */
export function rowToPreferences(row: PreferencesRow): UserPreferences {
  const source = (
    typeof row.source === "string" && (VALID_SOURCES as string[]).includes(row.source)
      ? row.source
      : "manual"
  ) as PreferenceSource;
  return {
    id: row.id,
    version: row.version,
    isActive: row.is_active,
    dimensionWeights: sanitizeWeights(row.dimension_weights),
    exclusions: sanitizeExclusions(row.exclusions),
    riskTolerance: sanitizeRiskTolerance(row.risk_tolerance),
    constraints: sanitizeConstraints(row.constraints),
    source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
