import { create, all, type Matrix } from "mathjs";
// quadprog has no types but we type the call signature locally
// @ts-expect-error - no published types
import quadprog from "quadprog";
import type { Asset, PillarWeights, PortfolioParams, PortfolioWeights } from "./types";
import {
  compositeEsgScore,
  DEFAULT_PILLAR_WEIGHTS,
  getClassBounds,
  MAX_SINGLE_WEIGHT,
  MIN_PORTFOLIO_ESG,
} from "./types";

const math = create(all, {});

interface QPResult {
  solution: number[];
  Lagrangian: number[];
  value: number[];
  iterations: number[];
  iact: number[];
  message: string;
}

interface QuadprogModule {
  solveQP: (
    Dmat: number[][],
    dvec: number[],
    Amat: number[][],
    bvec: number[],
    meq: number,
  ) => QPResult;
}

const qp = quadprog as QuadprogModule;

/**
 * Solve constrained mean-variance optimisation.
 *
 * Maximises: μᵀw − (λ/2)·wᵀΣw
 * Subject to:
 *   Σwᵢ = 1
 *   wᵢ ≥ 0
 *   wᵢ ≤ MAX_SINGLE_WEIGHT
 *   Σ wᵢ (in class C) ∈ [class_min, class_max]
 *   ESG portfolio score ≥ MIN_PORTFOLIO_ESG (soft → enforced via penalty if needed)
 *
 * quadprog formulation: min (1/2)·wᵀDw − dᵀw  s.t. Aᵀw ≥ b (with first `meq` as equality).
 * So D = λ·Σ, d = μ.
 *
 * quadprog uses 1-indexed arrays — we pad position 0 with dummy values.
 */
export interface OptimizeResult {
  weights: PortfolioWeights;
  esgFloorRelaxed: boolean;
}

export function optimizeMarkowitz(
  assets: Asset[],
  expectedReturns: number[],
  covariance: number[][],
  params: PortfolioParams,
  riskAversion = 4,
  pillarWeights: PillarWeights = DEFAULT_PILLAR_WEIGHTS,
): OptimizeResult {
  const n = assets.length;
  if (n === 0) return { weights: {}, esgFloorRelaxed: false };

  const bounds = getClassBounds(params.risk_target);
  let esgFloorRelaxed = false;

  // Build D = λ·Σ (with padding)
  const Dmat: number[][] = [Array(n + 1).fill(0)];
  for (let i = 0; i < n; i++) {
    const row = [0];
    for (let j = 0; j < n; j++) {
      row.push(riskAversion * covariance[i][j]);
    }
    Dmat.push(row);
  }

  // Ensure positive-definiteness via small ridge
  for (let i = 1; i <= n; i++) {
    Dmat[i][i] += 1e-6;
  }

  // d vector = expected returns (padded)
  const dvec = [0, ...expectedReturns];

  // Constraints — Aᵀw ≥ b  (quadprog convention)
  // We build Amat with rows = variables (n+1) and cols = constraints (m+1).
  // Constraint k corresponds to column k in Amat (Amat[i][k]).
  //
  // 1 equality: Σw = 1
  // n constraints: w_i ≥ 0
  // n constraints: -w_i ≥ -MAX_SINGLE_WEIGHT  (i.e. w_i ≤ MAX)
  // For each class: Σ_{i∈C} w_i ≥ class_min
  // For each class: -Σ_{i∈C} w_i ≥ -class_max

  const classes = Array.from(new Set(assets.map((a) => a.asset_class)));

  type ConstraintCol = { coefs: number[]; b: number };
  const cols: ConstraintCol[] = [];

  // 1) Equality Σw = 1
  cols.push({
    coefs: Array(n).fill(1),
    b: 1,
  });
  const meq = 1;

  // 2) Lower bounds w_i ≥ 0
  for (let i = 0; i < n; i++) {
    const c = Array(n).fill(0);
    c[i] = 1;
    cols.push({ coefs: c, b: 0 });
  }

  // 3) Upper bounds w_i ≤ MAX
  for (let i = 0; i < n; i++) {
    const c = Array(n).fill(0);
    c[i] = -1;
    cols.push({ coefs: c, b: -MAX_SINGLE_WEIGHT });
  }

  // 4) Class min/max
  for (const cls of classes) {
    const indicator = assets.map((a) => (a.asset_class === cls ? 1 : 0));
    const bnd = bounds[cls];
    if (!bnd) continue;
    // ≥ min
    cols.push({ coefs: indicator, b: bnd.min });
    // ≤ max  →  -indicator ≥ -max
    cols.push({
      coefs: indicator.map((x) => -x),
      b: -bnd.max,
    });
  }

  // 5) ESG floor: Σ esg_i · w_i ≥ MIN_PORTFOLIO_ESG, on the same pillar-weighted
  // composite score reported to the user (not the raw aggregate) — so the
  // constraint the QP solves and the floor checked against metrics.esg_score
  // are the same quantity.
  cols.push({
    coefs: assets.map((a) => compositeEsgScore(a, pillarWeights)),
    b: MIN_PORTFOLIO_ESG,
  });

  const m = cols.length;

  // Build Amat: (n+1) rows × (m+1) cols, padded
  const Amat: number[][] = [];
  for (let i = 0; i <= n; i++) {
    Amat.push(new Array(m + 1).fill(0));
  }
  for (let k = 0; k < m; k++) {
    for (let i = 0; i < n; i++) {
      Amat[i + 1][k + 1] = cols[k].coefs[i];
    }
  }
  const bvec = [0, ...cols.map((c) => c.b)];

  let result: QPResult;
  try {
    result = qp.solveQP(Dmat, dvec, Amat, bvec, meq);
  } catch (err) {
    console.warn("[markowitz] QP failed, falling back to equal-weight:", err);
    return { weights: capConcentration(equalWeight(assets), MAX_SINGLE_WEIGHT), esgFloorRelaxed: true };
  }

  if (!result.solution || result.message) {
    // Try relaxing ESG constraint
    esgFloorRelaxed = true;
    cols.pop();
    const m2 = cols.length;
    const Amat2: number[][] = [];
    for (let i = 0; i <= n; i++) {
      Amat2.push(new Array(m2 + 1).fill(0));
    }
    for (let k = 0; k < m2; k++) {
      for (let i = 0; i < n; i++) {
        Amat2[i + 1][k + 1] = cols[k].coefs[i];
      }
    }
    const bvec2 = [0, ...cols.map((c) => c.b)];
    try {
      result = qp.solveQP(Dmat, dvec, Amat2, bvec2, meq);
    } catch {
      return { weights: capConcentration(equalWeight(assets), MAX_SINGLE_WEIGHT), esgFloorRelaxed: true };
    }
  }

  const sol = result.solution?.slice(1) ?? []; // drop padding
  const weights: PortfolioWeights = {};
  let total = 0;
  for (let i = 0; i < n; i++) {
    const w = Math.max(0, sol[i] ?? 0);
    if (w > 0.001) {
      weights[assets[i].id] = w;
      total += w;
    }
  }
  // If QP returned an empty / degenerate solution, fall back to a sane allocation
  if (total < 0.5) {
    console.warn(
      `[markowitz] QP returned degenerate solution (total=${total.toFixed(3)}), falling back to class-bounded equal-weight`,
    );
    return {
      weights: capConcentration(classBoundedEqualWeight(assets, params), MAX_SINGLE_WEIGHT),
      esgFloorRelaxed: true,
    };
  }
  // Renormalise (numerical drift)
  for (const id in weights) weights[id] /= total;
  return { weights: capConcentration(weights, MAX_SINGLE_WEIGHT), esgFloorRelaxed };
}

/**
 * Cap any weight above `max` and redistribute the excess proportionally
 * across positions still below the cap (iterative water-filling). Preserves
 * the total sum exactly, so no renormalisation is needed afterwards.
 *
 * If the cap is mathematically infeasible for this many positions
 * (n·max < 1 — e.g. 3 names can't each stay ≤25% and still sum to 1),
 * the weights are returned unchanged: forcing the cap would either loop
 * forever or produce a sum < 1, both worse than a single named line
 * temporarily exceeding the target concentration.
 */
export function capConcentration(weights: PortfolioWeights, max: number): PortfolioWeights {
  const ids = Object.keys(weights);
  if (ids.length === 0 || ids.length * max < 1 - 1e-9) return weights;

  const w: PortfolioWeights = { ...weights };
  for (let iter = 0; iter < 20; iter++) {
    const over = ids.filter((id) => w[id] > max + 1e-9);
    if (over.length === 0) break;
    let excess = 0;
    for (const id of over) {
      excess += w[id] - max;
      w[id] = max;
    }
    const under = ids.filter((id) => w[id] < max - 1e-9);
    const underTotal = under.reduce((s, id) => s + w[id], 0);
    if (underTotal <= 1e-9) break;
    for (const id of under) {
      w[id] += (w[id] / underTotal) * excess;
    }
  }
  return w;
}

/**
 * Allocate by class minimums, then split the remainder equally across all
 * assets weighted by class. Guarantees a non-empty, feasible portfolio.
 */
function classBoundedEqualWeight(assets: Asset[], params: PortfolioParams): PortfolioWeights {
  const bounds = getClassBounds(params.risk_target);
  const byClass = new Map<string, Asset[]>();
  for (const a of assets) {
    const arr = byClass.get(a.asset_class) ?? [];
    arr.push(a);
    byClass.set(a.asset_class, arr);
  }
  const targets: Record<string, number> = {};
  let assigned = 0;
  for (const [cls, arr] of byClass) {
    const bnd = bounds[cls as keyof typeof bounds];
    const target = bnd ? (bnd.min + bnd.max) / 2 : 1 / byClass.size;
    targets[cls] = target;
    assigned += target;
  }
  // Renormalise class targets to sum to 1
  for (const cls in targets) targets[cls] /= assigned;

  const weights: PortfolioWeights = {};
  for (const [cls, arr] of byClass) {
    const share = targets[cls] / arr.length;
    for (const a of arr) weights[a.id] = share;
  }
  return weights;
}

function equalWeight(assets: Asset[]): PortfolioWeights {
  const w: PortfolioWeights = {};
  const n = assets.length;
  if (n === 0) return w;
  for (const a of assets) w[a.id] = 1 / n;
  return w;
}

/**
 * Conviction-based expected-return adjustment.
 *
 * NOTE — this is NOT a full Black-Litterman implementation (no τ·Σ prior, no
 * P/Q/Ω view matrices). It is a deliberately simple linear shift on expected
 * returns to express user convictions before the QP runs. Documented as
 * "ajustement par convictions" in the methodology page.
 *
 * Boost is capped at +1.5% per perfectly-aligned, fully-weighted cause.
 */
export function applyConvictionAdjustment(
  assets: Asset[],
  baseReturns: number[],
  causes: PortfolioParams["causes"],
  intensity: PortfolioParams["cause_intensity"],
): number[] {
  return baseReturns.map((r, i) => {
    const a = assets[i];
    let boost = 0;
    for (const c of causes) {
      const w = intensity[c] ?? 0.5;
      const exp = a.cause_exposure[c] ?? 0;
      boost += exp * w * 0.015;
    }
    return r + boost;
  });
}

/** @deprecated Renamed to applyConvictionAdjustment. Kept for back-compat. */
export const applyBlackLittermanViews = applyConvictionAdjustment;

// Keep export to silence unused-import warning if mathjs functions aren't used
// in trivial paths — mathjs may be useful for future extensions.
export const _math: typeof math = math;
export type _Matrix = Matrix;
