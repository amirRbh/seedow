import { describe, it, expect } from "vitest";
import {
  riskParityWeights,
  inverseVolatilityWeights,
  riskContributions,
} from "../riskparity";

describe("inverseVolatilityWeights", () => {
  it("weights inversely to volatility (σ from variance)", () => {
    // variances [0.04, 0.01] → σ [0.2, 0.1] → w ∝ [5, 10] → [1/3, 2/3]
    const w = inverseVolatilityWeights([0.04, 0.01]);
    expect(w[0]).toBeCloseTo(1 / 3, 6);
    expect(w[1]).toBeCloseTo(2 / 3, 6);
  });

  it("ignores non-positive variances without dividing by zero", () => {
    const w = inverseVolatilityWeights([0.04, 0, -1]);
    expect(w[1]).toBe(0);
    expect(w[2]).toBe(0);
    expect(w[0]).toBeCloseTo(1, 6);
  });
});

describe("riskParityWeights (ERC)", () => {
  it("equals inverse-vol on a diagonal covariance", () => {
    const w = riskParityWeights([
      [0.04, 0],
      [0, 0.01],
    ]);
    expect(w[0]).toBeCloseTo(1 / 3, 4);
    expect(w[1]).toBeCloseTo(2 / 3, 4);
  });

  it("gives equal weights for equal vols and equal correlations", () => {
    const s = 0.2;
    const c = 0.3 * s * s;
    const w = riskParityWeights([
      [s * s, c, c],
      [c, s * s, c],
      [c, c, s * s],
    ]);
    for (const x of w) expect(x).toBeCloseTo(1 / 3, 4);
  });

  it("equalises risk contributions (the defining property)", () => {
    const S = [
      [0.09, 0.01, 0.02],
      [0.01, 0.04, 0.005],
      [0.02, 0.005, 0.16],
    ];
    const w = riskParityWeights(S);
    const rc = riskContributions(w, S);
    for (const x of rc) expect(x).toBeCloseTo(1 / 3, 3);
    expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
    expect(w.every((x) => x > 0)).toBe(true);
    // The highest-volatility asset (index 2) receives the least weight.
    expect(w[2]).toBeLessThan(w[0]);
    expect(w[2]).toBeLessThan(w[1]);
  });

  it("respects custom risk budgets", () => {
    const S = [
      [0.04, 0],
      [0, 0.04],
    ];
    // Asset 0 gets 75% of the risk budget → more weight than asset 1.
    const w = riskParityWeights(S, { budgets: [0.75, 0.25] });
    const rc = riskContributions(w, S);
    expect(rc[0]).toBeCloseTo(0.75, 3);
    expect(rc[1]).toBeCloseTo(0.25, 3);
    expect(w[0]).toBeGreaterThan(w[1]);
  });

  it("handles trivial sizes", () => {
    expect(riskParityWeights([])).toEqual([]);
    expect(riskParityWeights([[0.04]])).toEqual([1]);
  });
});
