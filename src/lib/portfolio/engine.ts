import type { Asset, ExclusionTag, PortfolioParams, PortfolioResult } from "./types";
import { MIN_PORTFOLIO_ESG, causeToPillarWeights } from "./types";
import { optimizeMarkowitz, applyConvictionAdjustment } from "./markowitz";
import { computeMetrics } from "./metrics";

const METHODOLOGY_VERSION = "v1.1";

/**
 * Stage 1 — Hard exclusions filter.
 */
function applyExclusions(assets: Asset[], exclusions: ExclusionTag[]): Asset[] {
  if (exclusions.length === 0) return assets;
  const set = new Set(exclusions);
  return assets.filter((a) => !a.excluded_sectors.some((s) => set.has(s)));
}

/**
 * Stage 2 — Best-in-class.
 * Keep the top 50% (median split) of each asset class by ESG score.
 * Class with ≤3 assets: keep all (avoids killing thin classes).
 * Threshold is the median, not Q3 — naming aligned with implementation.
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
    if (arr.length <= 3) {
      kept.push(...arr);
      continue;
    }
    const sorted = [...arr].sort((a, b) => a.esg_score - b.esg_score);
    const medianIndex = Math.floor(sorted.length * 0.5); // top 50%
    kept.push(...sorted.slice(medianIndex));
  }
  return kept;
}

/**
 * Build covariance sub-matrix for the given asset subset.
 */
function buildCovariance(assets: Asset[], covMap: Map<string, number>): number[][] {
  const n = assets.length;
  const Σ: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row: number[] = [];
    for (let j = 0; j < n; j++) {
      const key = `${assets[i].id}|${assets[j].id}`;
      row.push(covMap.get(key) ?? 0);
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
 *   2. Best-in-class (top 50% ESG per class)
 *   3. Conviction adjustment on expected returns (causes → μ)
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
  // Stage 2
  pool = applyBestInClass(pool);

  if (pool.length === 0) {
    return {
      weights: {},
      metrics: {
        expected_return: 0,
        volatility: 0,
        sharpe: 0,
        esg_score: 0,
        ter: 0,
        co2_avoided_tons: 0,
        carbon_intensity_gco2e_per_eur: null,
        carbon_intensity_coverage: 0,
        by_class: {} as never,
        by_region: {},
        diversification: 0,
      },
      selected_assets: [],
      excluded_count: initialCount,
      esg_floor_relaxed: false,
      methodology_version: METHODOLOGY_VERSION,
    };
  }

  const Σ = buildCovariance(pool, covariance);
  const baseReturns = pool.map((a) => a.expected_return);

  // Stage 3 — conviction adjustment (was misnamed "Black-Litterman")
  const μ = applyConvictionAdjustment(pool, baseReturns, params.causes, params.cause_intensity);

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

  const selectedAssets = pool.filter((a) => cleaned[a.id] !== undefined);
  const μFinal = pool.map((a) => a.expected_return);
  // Pillar weights derived from active causes; passed to metrics for composite ESG
  const pillarWeights = causeToPillarWeights(params.causes);
  const metrics = computeMetrics(pool, cleaned, Σ, μFinal, pillarWeights);

  // The QP-side relax flag covers infeasibility; we also flag when the final
  // realised composite ESG score lands below the floor (e.g. after fallbacks).
  const finalEsgBelowFloor = metrics.esg_score < MIN_PORTFOLIO_ESG;
  if (finalEsgBelowFloor) {
    console.warn(
      `[engine] Portfolio ESG ${metrics.esg_score.toFixed(1)} below floor ${MIN_PORTFOLIO_ESG}`,
    );
  }

  return {
    weights: cleaned,
    metrics,
    selected_assets: selectedAssets,
    excluded_count: initialCount - pool.length,
    esg_floor_relaxed: esgFloorRelaxed || finalEsgBelowFloor,
    methodology_version: METHODOLOGY_VERSION,
  };
}
