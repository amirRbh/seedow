/**
 * Sélection d'un POOL d'actifs classés — remplace la proposition d'une allocation
 * pondérée par Seedow (décision produit : on ne propose plus de poids cibles, on
 * présente un pool filtré + classé que l'utilisateur compose lui-même).
 *
 * Contrat de transparence (CLAUDE.md §1.2/§1.3) : le classement combine des
 * signaux RÉELS et attribuables, jamais un chiffre inventé.
 *
 *   1. Filtre dur — les exclusions choisies par l'utilisateur écartent les actifs
 *      concernés (aucun actif hors filtre n'entre dans le pool).
 *   2. Classement « pertinence » 0..100 — moyenne pondérée, renormalisée sur les
 *      seuls piliers exploitables (un pilier absent est retiré, jamais remplacé
 *      par une valeur neutre inventée), de trois signaux :
 *        · PERF — Sharpe réel `(rendement attendu − TER − taux sans risque)/vol`,
 *          calculé UNIQUEMENT quand l'actif a un modèle de risque estimé sur un
 *          historique réel suffisant (`stats_observations`). Sinon la perf est
 *          « en cours » : l'actif n'est PAS classé sur un chiffre de seed —
 *          `relevance = null`, présenté à part (§1.3).
 *        · ESG — le Score Seedow existant (composite ESG/climat/exclusions,
 *          méthode publiée et versionnée). On le réutilise tel quel comme pilier,
 *          sans y mêler la perf (il reste l'artefact ESG publié).
 *        · CAUSES — alignement moyen de l'actif avec les convictions actives de
 *          l'utilisateur (0..1). Pilier retiré si aucune cause active.
 *
 * Rien n'est extrapolé : un actif sans historique de marché apparaît dans le pool
 * mais reste « données en cours », non classé, plutôt que gonflé par un seed.
 */
import type { Asset, CauseTag, DataQualityTier, ExclusionTag, PortfolioParams } from "./types";
import { classifyDataQuality } from "./data-quality";
import {
  deriveSustainabilityProfile,
  type DataCoverage,
} from "@/lib/esg/sustainability-classification";
import { ACWI_WACI_TCO2E_PER_MUSD } from "@/lib/esg/benchmark";

/** Version de la méthode de classement — publiée sur /methodologie, incrémentée à tout changement de formule. */
export const SCREENING_VERSION = "1.0";

/** Taux sans risque aligné sur `metrics.ts` (une seule source pour le Sharpe). */
const RISK_FREE_RATE = 0.025;

/** Sharpe au-delà duquel le sous-score perf plafonne à 100 (lecture bornée et stable). */
const SHARPE_FULL_CREDIT = 1;

// Poids des piliers du classement de pertinence (renormalisés si un pilier manque).
const W_PERF = 0.4;
const W_ESG = 0.4;
const W_CAUSE = 0.2;

export interface ScoredAsset {
  asset: Asset;
  /** Pertinence 0..100, ou null si l'actif n'a pas d'historique réel (non classé, « en cours »). */
  relevance: number | null;
  /** Sharpe réel, ou null si l'historique est insuffisant. */
  sharpe: number | null;
  /** Score Seedow ESG 0..100 (pilier), ou null si aucun signal ESG exploitable. */
  seedow_esg_score: number | null;
  /** Alignement moyen avec les causes actives 0..1 (0 si aucune cause active). */
  cause_match: number;
  /** Palier de fiabilité des stats de l'actif. */
  data_tier: DataQualityTier;
}

/**
 * Entrées RÉELLES du classement — volontairement plus étroites que
 * `PortfolioParams`. Le budget de risque, l'horizon et le montant ne rentrent
 * dans aucune des trois formules ci-dessus : les accepter en paramètre laissait
 * croire, à l'écran comme au code, qu'ils déplaçaient le classement. Ils
 * restent des données du portefeuille (objectifs, comparatif) — pas du
 * screening.
 */
export type ScreeningParams = Pick<PortfolioParams, "causes" | "exclusions">;

export interface PoolResult {
  /** Actifs retenus, classés par pertinence décroissante ; les non classés (« en cours ») en fin. */
  pool: ScoredAsset[];
  /** Nombre d'actifs écartés par les exclusions de l'utilisateur. */
  excluded_count: number;
  /** Taille de l'univers investissable avant filtre. */
  universe_size: number;
  /** Version de la méthode de classement. */
  screening_version: string;
}

/** Sharpe réel d'un actif, ou null si l'historique de marché est insuffisant (jamais sur un seed). */
function realSharpe(asset: Asset, tier: DataQualityTier): number | null {
  if (tier === "insufficient") return null;
  const vol = asset.volatility;
  if (!Number.isFinite(vol) || vol <= 0) return null;
  return (asset.expected_return - asset.ter - RISK_FREE_RATE) / vol;
}

/** Sous-score perf 0..100 à partir du Sharpe, borné (SHARPE_FULL_CREDIT → 100). */
function perfSubScore(sharpe: number | null): number | null {
  if (sharpe == null) return null;
  return Math.min(100, Math.max(0, (sharpe / SHARPE_FULL_CREDIT) * 100));
}

/** Score Seedow ESG de l'actif (réutilise la méthode publiée), ou null. */
function seedowEsgScore(asset: Asset): number | null {
  // `dataCoverage` n'entre pas dans le calcul du score (seulement dans le tier) :
  // on dérive une couverture indicative sans l'inventer.
  const hasPillars =
    asset.env_score != null && asset.social_score != null && asset.governance_score != null;
  const hasCarbon = asset.carbon_intensity_gco2e_per_eur != null;
  const coverage: DataCoverage =
    hasPillars && hasCarbon ? "complete" : hasPillars ? "partial" : "estimated";
  return deriveSustainabilityProfile({
    esgScore: Number.isFinite(asset.esg_score) ? asset.esg_score : null,
    climateScore: asset.env_score ?? null,
    waci: asset.waci_tco2e_per_musd_sales ?? null,
    benchmarkWaci: ACWI_WACI_TCO2E_PER_MUSD,
    impliedTempRise: asset.implied_temp_rise ?? null,
    exclusionsCount: asset.excluded_sectors.length,
    dataCoverage: coverage,
    sfdrArticle: asset.sfdr_article,
  }).score;
}

/** Alignement moyen de l'actif avec les causes actives (0..1). 0 si aucune cause. */
function causeMatch(asset: Asset, causes: CauseTag[]): number {
  if (causes.length === 0) return 0;
  let sum = 0;
  for (const c of causes) {
    const exposure = asset.cause_exposure[c];
    if (typeof exposure === "number" && Number.isFinite(exposure)) {
      sum += Math.min(1, Math.max(0, exposure));
    }
  }
  return sum / causes.length;
}

/**
 * Combine les piliers en une pertinence 0..100, renormalisée sur les seuls
 * piliers exploitables. La PERF est requise : sans Sharpe réel, l'actif n'est pas
 * classé (`null`) — il est présenté « en cours » plutôt que noté sur un seed.
 */
function relevance(perf: number | null, esg: number | null, cause: number | null): number | null {
  if (perf == null) return null;
  const pillars: Array<[number, number | null]> = [
    [W_PERF, perf],
    [W_ESG, esg],
    [W_CAUSE, cause],
  ];
  const present = pillars.filter((p): p is [number, number] => p[1] != null);
  const totalWeight = present.reduce((acc, [w]) => acc + w, 0);
  const weighted = present.reduce((acc, [w, v]) => acc + w * v, 0);
  return Math.round(weighted / totalWeight);
}

/**
 * Construit le pool classé à partir de l'univers réel et des préférences.
 * Aucune allocation, aucun poids : uniquement une sélection ordonnée.
 */
export function screenPool(universe: Asset[], params: ScreeningParams): PoolResult {
  const universeSize = universe.length;

  // 1. Filtre dur — exclusions de l'utilisateur.
  const exclusionSet = new Set<ExclusionTag>(params.exclusions);
  const filtered =
    exclusionSet.size === 0
      ? universe
      : universe.filter((a) => !a.excluded_sectors.some((s) => exclusionSet.has(s)));

  // 2. Score de chaque actif retenu.
  const causesActive = params.causes;
  const scored: ScoredAsset[] = filtered.map((asset) => {
    const tier = classifyDataQuality(asset);
    const sharpe = realSharpe(asset, tier);
    const esg = seedowEsgScore(asset);
    const match = causeMatch(asset, causesActive);
    return {
      asset,
      relevance: relevance(perfSubScore(sharpe), esg, causesActive.length ? match * 100 : null),
      sharpe,
      seedow_esg_score: esg,
      cause_match: match,
      data_tier: tier,
    };
  });

  // 3. Tri : classés d'abord (pertinence décroissante), « en cours » en fin
  //    (départagés par leur score ESG puis leur nom pour un ordre stable).
  scored.sort((a, b) => {
    if (a.relevance != null && b.relevance != null) {
      if (b.relevance !== a.relevance) return b.relevance - a.relevance;
    } else if (a.relevance != null) {
      return -1;
    } else if (b.relevance != null) {
      return 1;
    }
    const esgA = a.seedow_esg_score ?? -1;
    const esgB = b.seedow_esg_score ?? -1;
    if (esgB !== esgA) return esgB - esgA;
    return a.asset.name.localeCompare(b.asset.name);
  });

  return {
    pool: scored,
    excluded_count: universeSize - filtered.length,
    universe_size: universeSize,
    screening_version: SCREENING_VERSION,
  };
}
