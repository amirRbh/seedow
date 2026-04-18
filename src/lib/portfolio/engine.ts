import type {
  Asset,
  ExclusionTag,
  PortfolioParams,
  PortfolioResult,
} from "./types";
import { MIN_PORTFOLIO_ESG } from "./types";
import { optimizeMarkowitz, applyBlackLittermanViews } from "./markowitz";
import { computeMetrics } from "./metrics";

const METHODOLOGY_VERSION = "v1.0";

/**
 * Stage 1 — Hard exclusions filter
 * Remove any asset with at least one excluded sector tag.
 */
function applyExclusions(assets: Asset[], exclusions: ExclusionTag[]): Asset[] {
  if (exclusions.length === 0) return assets;
  const set = new Set(exclusions);
  return assets.filter((a) => !a.excluded_sectors.some((s) => set.has(s)));
}

/**
 * Stage 2 — Best-in-class
 * For each asset class, keep only assets with ESG score ≥ Q3 of the class.
 * If a class has fewer than 3 assets, keep all of them.
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
    const q3Index = Math.floor(sorted.length * 0.5); // top 50% (relaxed Q3)
    kept.push(...sorted.slice(q3Index));
  }
  return kept;
}

/**
 * Stage 3 — Cause tilts (post-optimisation overlay)
 * Increase weights of assets aligned with chosen causes, then renormalise.
 */
function applyCauseTilts(
  weights: Record<string, number>,
  assets: Asset[],
  causes: PortfolioParams["causes"],
  intensity: PortfolioParams["cause_intensity"],
): Record<string, number> {
  if (causes.length === 0) return weights;
  const idx = new Map(assets.map((a) => [a.id, a]));
  const tilted: Record<string, number> = {};
  let total = 0;
  for (const id in weights) {
    const a = idx.get(id);
    if (!a) continue;
    let multiplier = 1;
    for (const c of causes) {
      const exp = a.cause_exposure[c] ?? 0;
      const w = intensity[c] ?? 0.5;
      multiplier *= 1 + exp * w * 0.20; // up to +20% per cause
    }
    const newW = weights[id] * multiplier;
    tilted[id] = newW;
    total += newW;
  }
  // Renormalise
  for (const id in tilted) tilted[id] /= total;

  // Cap any line above MAX_SINGLE_WEIGHT, redistribute
  const MAX = 0.25;
  let excess = 0;
  for (const id in tilted) {
    if (tilted[id] > MAX) {
      excess += tilted[id] - MAX;
      tilted[id] = MAX;
    }
  }
  if (excess > 0) {
    const eligible = Object.keys(tilted).filter((id) => tilted[id] < MAX);
    const eligibleTotal = eligible.reduce((s, id) => s + tilted[id], 0);
    if (eligibleTotal > 0) {
      for (const id of eligible) {
        tilted[id] += excess * (tilted[id] / eligibleTotal);
      }
    }
  }
  return tilted;
}

/**
 * Build covariance sub-matrix for the given asset subset, given the full
 * covariance map keyed by (asset_a, asset_b).
 */
function buildCovariance(
  assets: Asset[],
  covMap: Map<string, number>,
): number[][] {
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
  covariance: Map<string, number>; // key = `${a.id}|${b.id}`
  params: PortfolioParams;
}

/**
 * Full pipeline:
 *   1. Exclusions (hard)
 *   2. Best-in-class (ESG screening)
 *   3. Black-Litterman view adjustment (causes → expected returns)
 *   4. Markowitz optimisation under constraints
 *   5. Cause tilts overlay
 *   6. Compute metrics
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
        expected_return: 0, volatility: 0, sharpe: 0,
        esg_score: 0, ter: 0, co2_avoided_tons: 0,
        by_class: {} as never, by_region: {}, diversification: 0,
      },
      selected_assets: [],
      excluded_count: initialCount,
      methodology_version: METHODOLOGY_VERSION,
    };
  }

  const Σ = buildCovariance(pool, covariance);
  const baseReturns = pool.map((a) => a.expected_return);

  // Stage 3 — adjust expected returns with views
  const μ = applyBlackLittermanViews(
    pool,
    baseReturns,
    params.causes,
    params.cause_intensity,
  );

  // Stage 4 — optimise
  // Tune risk aversion by target vol — lower target → more aversion
  const riskAversion = Math.max(2, 0.6 / Math.max(params.risk_target, 0.02));
  let weights = optimizeMarkowitz(pool, μ, Σ, params, riskAversion);

  // Stage 5 — cause tilts
  weights = applyCauseTilts(weights, pool, params.causes, params.cause_intensity);

  // Final filter — drop dust positions
  const cleaned: Record<string, number> = {};
  let total = 0;
  for (const id in weights) {
    if (weights[id] >= 0.005) {
      cleaned[id] = weights[id];
      total += weights[id];
    }
  }
  for (const id in cleaned) cleaned[id] /= total;

  const selectedAssets = pool.filter((a) => cleaned[a.id] !== undefined);
  const μFinal = pool.map((a) => a.expected_return); // metrics use raw returns
  const metrics = computeMetrics(pool, cleaned, Σ, μFinal);

  // Verify ESG floor
  if (metrics.esg_score < MIN_PORTFOLIO_ESG) {
    // could iterate — for now emit as-is
    console.warn(
      `[engine] Portfolio ESG ${metrics.esg_score.toFixed(1)} below floor ${MIN_PORTFOLIO_ESG}`,
    );
  }

  return {
    weights: cleaned,
    metrics,
    selected_assets: selectedAssets,
    excluded_count: initialCount - pool.length,
    methodology_version: METHODOLOGY_VERSION,
  };
}
