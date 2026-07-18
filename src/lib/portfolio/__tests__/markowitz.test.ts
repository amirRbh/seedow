import { describe, it, expect } from "vitest";
import {
  optimizeMarkowitz,
  applyConvictionAdjustment,
  applyBlackLittermanViews,
} from "../markowitz";
import { MAX_SINGLE_WEIGHT } from "../types";
import { defaultParams, diagonalCovariance, makeAsset } from "./fixtures";

describe("optimizeMarkowitz", () => {
  it("returns an empty result when n=0", () => {
    const res = optimizeMarkowitz([], [], [], defaultParams());
    expect(res.weights).toEqual({});
    expect(res.esgFloorRelaxed).toBe(false);
  });

  it("with n=1 asset either allocates it fully or falls back cleanly", () => {
    // A single equity_dev asset can't satisfy multi-class minimums, so the QP
    // is expected to be infeasible → the code falls back to
    // classBoundedEqualWeight, which allocates 100% to that one asset.
    const a = makeAsset({ id: "solo", asset_class: "equity_dev", esg_score: 90 });
    const res = optimizeMarkowitz(
      [a],
      [a.expected_return],
      diagonalCovariance([a]),
      defaultParams(),
    );
    const sum = Object.values(res.weights).reduce((s, w) => s + w, 0);
    expect(sum).toBeCloseTo(1, 6);
    expect(res.weights["solo"]).toBeCloseTo(1, 6);
  });

  it("does not throw on a near-singular covariance (perfectly correlated pair)", () => {
    const a = makeAsset({ id: "a", asset_class: "equity_dev", esg_score: 80 });
    const b = makeAsset({ id: "b", asset_class: "green_bond", esg_score: 80 });
    const c = makeAsset({ id: "c", asset_class: "sov_bond", esg_score: 80 });
    const vol = 0.15;
    // a and b are perfectly correlated (ρ=1) — off-diagonal = vol*vol
    const cov = [
      [vol * vol, vol * vol, 0],
      [vol * vol, vol * vol, 0],
      [0, 0, vol * vol],
    ];
    const res = optimizeMarkowitz(
      [a, b, c],
      [a.expected_return, b.expected_return, c.expected_return],
      cov,
      defaultParams(),
    );
    const sum = Object.values(res.weights).reduce((s, w) => s + w, 0);
    expect(sum).toBeCloseTo(1, 6);
  });

  it("weights always sum to ≈1 after renormalisation, incl. fallbacks", () => {
    // Force the ESG floor infeasibility to exercise the relax branch.
    const universe = [
      makeAsset({ id: "eq", asset_class: "equity_dev", esg_score: 30 }),
      makeAsset({ id: "gb", asset_class: "green_bond", esg_score: 30 }),
      makeAsset({ id: "sv", asset_class: "sov_bond", esg_score: 30 }),
      makeAsset({ id: "cs", asset_class: "cash", esg_score: 30 }),
    ];
    const res = optimizeMarkowitz(
      universe,
      universe.map((a) => a.expected_return),
      diagonalCovariance(universe),
      defaultParams(),
    );
    const sum = Object.values(res.weights).reduce((s, w) => s + w, 0);
    expect(sum).toBeCloseTo(1, 6);
    expect(res.esgFloorRelaxed).toBe(true);
  });

  it("fallback path also respects MAX_SINGLE_WEIGHT (capConcentration)", () => {
    const universe = [
      makeAsset({ id: "eq", asset_class: "equity_dev", esg_score: 30 }),
      makeAsset({ id: "gb", asset_class: "green_bond", esg_score: 30 }),
      makeAsset({ id: "sv", asset_class: "sov_bond", esg_score: 30 }),
      makeAsset({ id: "cs", asset_class: "cash", esg_score: 30 }),
    ];
    const res = optimizeMarkowitz(
      universe,
      universe.map((a) => a.expected_return),
      diagonalCovariance(universe),
      defaultParams(),
    );
    for (const w of Object.values(res.weights)) {
      expect(w).toBeLessThanOrEqual(MAX_SINGLE_WEIGHT + 1e-6);
    }
  });
});

describe("applyConvictionAdjustment", () => {
  it("returns baseReturns unchanged when causes is empty", () => {
    const assets = [makeAsset({ id: "a" }), makeAsset({ id: "b" })];
    const base = [0.05, 0.07];
    const out = applyConvictionAdjustment(assets, base, [], {});
    expect(out).toEqual(base);
  });

  it("caps the boost at +1.5% per fully-aligned cause (intensity=1, exposure=1)", () => {
    const a = makeAsset({ id: "a", cause_exposure: { climat: 1 } });
    const base = [0.05];
    const out = applyConvictionAdjustment(a ? [a] : [], base, ["climat"], {
      climat: 1,
    });
    expect(out[0]).toBeCloseTo(0.05 + 0.015, 12);
  });

  it("scales linearly with intensity and exposure", () => {
    const a = makeAsset({ id: "a", cause_exposure: { climat: 0.5 } });
    const out = applyConvictionAdjustment([a], [0.05], ["climat"], {
      climat: 0.4,
    });
    // boost = 0.5 * 0.4 * 0.015 = 0.003
    expect(out[0]).toBeCloseTo(0.053, 12);
  });

  it("re-exports the legacy name applyBlackLittermanViews", () => {
    expect(applyBlackLittermanViews).toBe(applyConvictionAdjustment);
  });
});
