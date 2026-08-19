import type {
  Asset,
  DataQualitySummary,
  DataQualityTier,
  ExclusionTag,
  PortfolioParams,
  PortfolioResult,
} from "./types";
import { MAX_SINGLE_WEIGHT, MIN_PORTFOLIO_ESG, causeToPillarWeights } from "./types";
import { optimizeMarkowitz, applyConvictionAdjustment, applyCarbonPreference } from "./markowitz";
import { computeMetrics } from "./metrics";
import {
  anchorLowConfidenceReturns,
  classifyDataQuality,
  covarianceFallback,
} from "./data-quality";
import { buildExplanation } from "./explanation";
import { ACWI_WACI_TCO2E_PER_MUSD } from "@/lib/esg/benchmark";

const METHODOLOGY_VERSION = "v1.4";

/**
 * Éligibilité best-in-class ESG (v1.3, desserré).
 *
 * L'ancienne règle jetait la MOITIÉ basse ESG de chaque classe (split médian),
 * alors que le QP impose déjà un plancher ESG≥70 au portefeuille : double
 * filtrage qui rétrécissait inutilement l'univers. On ne retire désormais que
 * le QUART le plus faible de chaque classe, et jamais rien sous
 * `ELIGIBILITY_THIN_CLASS` titres (pour ne pas assécher une classe fine).
 */
const ELIGIBILITY_DROP_FRACTION = 0.25;
const ELIGIBILITY_THIN_CLASS = 5;

/**
 * Garantie anti-concentration finale (v1.3).
 *
 * Le QP borne déjà chaque poids à MAX_SINGLE_WEIGHT, mais les REPLIS (equal-weight
 * borné par classe, filet ≥3 positions) ne le faisaient pas : sur l'univers réel
 * — étroit, avec des classes quasi vides — un repli pouvait sortir une ligne à
 * 45 %. On applique donc un plafonnement + redistribution proportionnelle (water
 * filling) sur TOUS les chemins, juste avant les métriques. Si l'univers est trop
 * petit pour respecter le plafond (cap·n < 1, ex. < 4 lignes à 25 %), on ne peut
 * mathématiquement pas : on laisse tel quel plutôt que d'inventer des lignes.
 */
export function capAndRedistribute(
  weights: Record<string, number>,
  cap: number = MAX_SINGLE_WEIGHT,
): Record<string, number> {
  const ids = Object.keys(weights);
  const n = ids.length;
  if (n === 0 || cap * n < 1 - 1e-9) return weights; // plafond infaisable → inchangé
  const w = { ...weights };
  const EPS = 1e-9;
  for (let iter = 0; iter < n + 1; iter++) {
    let excess = 0;
    const free: string[] = [];
    for (const id of ids) {
      if (w[id] > cap + EPS) {
        excess += w[id] - cap;
        w[id] = cap;
      } else if (w[id] < cap - EPS) {
        free.push(id);
      }
    }
    if (excess <= EPS) break;
    let freeSum = 0;
    for (const id of free) freeSum += w[id];
    if (freeSum <= EPS) break;
    for (const id of free) w[id] += (excess * w[id]) / freeSum;
  }
  return w;
}

/**
 * Stage 1 — Hard exclusions filter.
 */
function applyExclusions(assets: Asset[], exclusions: ExclusionTag[]): Asset[] {
  if (exclusions.length === 0) return assets;
  const set = new Set(exclusions);
  return assets.filter((a) => !a.excluded_sectors.some((s) => set.has(s)));
}

/**
 * Stage 2 — Éligibilité best-in-class ESG (desserré, v1.3).
 * Retire le quart le plus faible en ESG de chaque classe ; garde tout si la
 * classe compte ≤ ELIGIBILITY_THIN_CLASS titres. Le plancher ESG du QP garantit
 * la qualité globale — cet étage ne fait qu'écarter la queue basse évidente.
 */
function applyBestInClass(assets: Asset[]): Asset[] {
  const byClass = new Map<string, Asset[]>();
  for (const a of assets) {
    const arr = byClass.get(a.asset_class) ?? [];
    arr.push(a);
    byClass.set(a.asset_class, arr);
  }

  const kept: Asset[] = [];
  for (const [, arr] of byClass) {
    if (arr.length <= ELIGIBILITY_THIN_CLASS) {
      kept.push(...arr);
      continue;
    }
    const sorted = [...arr].sort((a, b) => a.esg_score - b.esg_score);
    const dropCount = Math.floor(sorted.length * ELIGIBILITY_DROP_FRACTION);
    kept.push(...sorted.slice(dropCount));
  }
  return kept;
}

/**
 * Stage 2b — Best-in-class carbone (v1.2).
 * Au sein de chaque classe, on écarte le tiers le plus intensif en carbone parmi
 * les actifs qui ONT un WACI réel. On ne juge jamais un actif sans donnée (il est
 * conservé — pas de chiffre inventé), et on ne prune pas une classe qui compte
 * ≤ 3 actifs mesurés (pour ne pas assécher une classe fine).
 */
export function applyCarbonBestInClass(assets: Asset[]): Asset[] {
  const byClass = new Map<string, Asset[]>();
  for (const a of assets) {
    const arr = byClass.get(a.asset_class) ?? [];
    arr.push(a);
    byClass.set(a.asset_class, arr);
  }

  const kept: Asset[] = [];
  for (const [, arr] of byClass) {
    const measured = arr.filter((a) => {
      const w = a.waci_tco2e_per_musd_sales;
      return w != null && Number.isFinite(w) && w >= 0;
    });
    const unmeasured = arr.filter((a) => !measured.includes(a));
    if (measured.length <= 3) {
      kept.push(...arr);
      continue;
    }
    const sorted = [...measured].sort(
      (a, b) => (a.waci_tco2e_per_musd_sales as number) - (b.waci_tco2e_per_musd_sales as number),
    );
    const drop = Math.floor(measured.length / 3); // écarte le tiers le plus sale
    kept.push(...sorted.slice(0, measured.length - drop), ...unmeasured);
  }
  return kept;
}

/**
 * Build covariance sub-matrix for the given asset subset.
 *
 * Diagonale absente de la matrice pré-calculée (actif fraîchement ajouté à
 * l'univers, historique pas encore chargé) : on retombe sur volatility² du
 * seed plutôt que 0 — une variance nulle ferait passer l'actif pour du
 * rendement sans risque et l'optimiseur le surpondérerait massivement.
 * Hors-diagonale absente : prior de corrélation de classe · σ_i · σ_j au lieu
 * de 0 (voir data-quality.covarianceFallback). Retomber sur 0 FABRIQUAIT de la
 * diversification — l'optimiseur croyait pouvoir annuler un risque bien réel et
 * surpondérait les paires « faussement décorrélées ».
 */
function buildCovariance(assets: Asset[], covMap: Map<string, number>): number[][] {
  const n = assets.length;
  const Σ: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row: number[] = [];
    for (let j = 0; j < n; j++) {
      const key = `${assets[i].id}|${assets[j].id}`;
      const real = covMap.get(key);
      row.push(real ?? covarianceFallback(assets[i], assets[j]));
    }
    Σ.push(row);
  }
  return Σ;
}

export interface BuildPortfolioInput {
  universe: Asset[];
  covariance: Map<string, number>;
  params: PortfolioParams;
}

/**
 * Pipeline:
 *   1. Exclusions (hard)
 *   2. Best-in-class ESG (drop weakest quartile per class)
 *   3. Conviction adjustment on expected returns (causes → μ) + carbon tilt
 *      (the ONLY place carbon enters allocation since v1.4 — no more hard prune)
 *   4. Markowitz optimisation under constraints
 *   5. Compute metrics with cause-weighted composite ESG score
 *
 * Note: a previous version applied a second tilt overlay on weights AFTER
 * the QP. This was removed in v1.1 to avoid double-counting convictions.
 * The conviction effect is now expressed once, on expected returns (μ),
 * and let the QP arbitrate against ESG/class constraints.
 */
export function buildPortfolio(input: BuildPortfolioInput): PortfolioResult {
  const { universe, covariance, params } = input;
  const initialCount = universe.length;

  // Stage 1
  let pool = applyExclusions(universe, params.exclusions);
  // Stage 2 — best-in-class ESG (score)
  pool = applyBestInClass(pool);
  // NOTE (v1.4, N5) — le carbone n'agit plus qu'UNE fois dans l'allocation, via le
  // tilt de préférence sur μ (`applyCarbonPreference`, étage 3b). L'ancien
  // best-in-class carbone (filtrage dur par classe) a été retiré du pipeline pour
  // supprimer le double/triple comptage carbone (filtre dur + tilt + affichage) :
  // c'était une pondération arbitraire non maîtrisée qui assèchait en plus des
  // classes fines. `applyCarbonBestInClass` reste exportée (testée isolément) mais
  // n'est plus appliquée ici — le tilt continu, borné et réversible est plus
  // défendable qu'un filtre dur, et ne détruit pas la diversification.

  if (pool.length === 0) {
    const emptyMetrics = {
      expected_return: 0,
      volatility: 0,
      sharpe: 0,
      esg_score: 0,
      ter: 0,
      carbon_intensity_gco2e_per_eur: null,
      carbon_intensity_coverage: 0,
      waci_tco2e_per_musd_sales: null,
      waci_coverage: 0,
      by_class: {} as never,
      by_region: {},
      diversification: 0,
    };
    const emptyDq: DataQualitySummary = {
      full: 0,
      partial: 0,
      insufficient: 0,
      full_weight_share: 0,
      anchored_ids: [],
    };
    return {
      weights: {},
      metrics: emptyMetrics,
      selected_assets: [],
      excluded_count: initialCount,
      esg_floor_relaxed: false,
      methodology_version: METHODOLOGY_VERSION,
      data_quality: emptyDq,
      explanation: buildExplanation({
        weights: {},
        metrics: emptyMetrics,
        params,
        dataQuality: emptyDq,
        esgFloorRelaxed: false,
      }),
    };
  }

  const Σ = buildCovariance(pool, covariance);

  // Stage 2c — Data Quality : classe chaque actif selon la fiabilité réelle de
  // ses stats, puis ANCRE le μ des actifs peu fiables (< ~12 mois d'historique,
  // ou valeur de seed) sur la médiane des μ de leurs pairs `full` de classe.
  // On ne laisse jamais un μ inventé/bruité piloter l'optimiseur.
  const tiers: DataQualityTier[] = pool.map((a) => classifyDataQuality(a));
  const rawReturns = pool.map((a) => a.expected_return);
  const { mu: baseReturns, anchored } = anchorLowConfidenceReturns(pool, rawReturns, tiers);

  // Stage 3 — conviction adjustment (was misnamed "Black-Litterman")
  const μConviction = applyConvictionAdjustment(
    pool,
    baseReturns,
    params.causes,
    params.cause_intensity,
  );
  // Stage 3b — préférence carbone (v1.2) : incline vers les actifs plus propres
  // que la référence, à l'écart des plus sales, pour que le portefeuille soit
  // RÉELLEMENT moins intensif — pas seulement présenté comme tel.
  const μ = applyCarbonPreference(pool, μConviction, ACWI_WACI_TCO2E_PER_MUSD);

  // Stage 4 — optimise
  const riskAversion = Math.max(2, 0.6 / Math.max(params.risk_target, 0.02));
  const { weights, esgFloorRelaxed } = optimizeMarkowitz(pool, μ, Σ, params, riskAversion);

  // Final filter — drop dust positions
  let cleaned: Record<string, number> = {};
  let total = 0;
  for (const id in weights) {
    if (weights[id] >= 0.001) {
      cleaned[id] = weights[id];
      total += weights[id];
    }
  }
  // Safety net 1: dust filter wiped everything
  if (Object.keys(cleaned).length === 0) {
    console.warn("[engine] Dust filter wiped all weights; keeping raw");
    total = 0;
    for (const id in weights) {
      if (weights[id] > 0) {
        cleaned[id] = weights[id];
        total += weights[id];
      }
    }
  }
  // Safety net 2: ABSOLUTE guarantee — never return < 3 positions when pool > 0
  if (Object.keys(cleaned).length < 3 && pool.length > 0) {
    console.warn(
      `[engine] Only ${Object.keys(cleaned).length} positions after optimisation; falling back to class-balanced equal-weight across ${pool.length} assets`,
    );
    cleaned = {};
    total = 0;
    const byClass = new Map<string, Asset[]>();
    for (const a of pool) {
      const arr = byClass.get(a.asset_class) ?? [];
      arr.push(a);
      byClass.set(a.asset_class, arr);
    }
    const classCount = byClass.size;
    for (const [, arr] of byClass) {
      const share = 1 / classCount / arr.length;
      for (const a of arr) {
        cleaned[a.id] = share;
        total += share;
      }
    }
  }
  if (total > 0) for (const id in cleaned) cleaned[id] /= total;

  // Stage 5 (contrainte) — garantie anti-concentration sur TOUS les chemins (QP
  // comme replis) : aucune ligne au-dessus de MAX_SINGLE_WEIGHT tant que l'univers
  // le permet. C'est ce qui empêche un portefeuille absurde (ligne à 45 %) quand
  // l'univers réel est étroit et force un repli.
  cleaned = capAndRedistribute(cleaned);

  const selectedAssets = pool.filter((a) => cleaned[a.id] !== undefined);
  // Rendement REPORTÉ : on utilise les μ ancrés (non les seed/μ bruités), jamais
  // les tilts de préférence (conviction/carbone) — cf. markowitz.ts. Le chiffre
  // montré à l'utilisateur reste ainsi honnête et non gonflé.
  const μFinal = baseReturns;
  // Pillar weights derived from active causes; passed to metrics for composite ESG
  const pillarWeights = causeToPillarWeights(params.causes);
  const metrics = computeMetrics(pool, cleaned, Σ, μFinal, pillarWeights);

  // Stage 8 — Data Quality summary + Explanation, à partir des poids finaux.
  const tierById = new Map(pool.map((a, i) => [a.id, tiers[i]]));
  const dataQuality: DataQualitySummary = {
    full: 0,
    partial: 0,
    insufficient: 0,
    full_weight_share: 0,
    anchored_ids: anchored.filter((id) => cleaned[id] !== undefined),
  };
  for (const id in cleaned) {
    const t = tierById.get(id) ?? "insufficient";
    dataQuality[t] += 1;
    if (t === "full") dataQuality.full_weight_share += cleaned[id];
  }

  // The QP-side relax flag covers infeasibility; we also flag when the final
  // realised composite ESG score lands below the floor (e.g. after fallbacks).
  const finalEsgBelowFloor = metrics.esg_score < MIN_PORTFOLIO_ESG;
  if (finalEsgBelowFloor) {
    console.warn(
      `[engine] Portfolio ESG ${metrics.esg_score.toFixed(1)} below floor ${MIN_PORTFOLIO_ESG}`,
    );
  }

  const esgRelaxed = esgFloorRelaxed || finalEsgBelowFloor;
  return {
    weights: cleaned,
    metrics,
    selected_assets: selectedAssets,
    excluded_count: initialCount - pool.length,
    esg_floor_relaxed: esgRelaxed,
    methodology_version: METHODOLOGY_VERSION,
    data_quality: dataQuality,
    explanation: buildExplanation({
      weights: cleaned,
      metrics,
      params,
      dataQuality,
      esgFloorRelaxed: esgRelaxed,
    }),
  };
}
