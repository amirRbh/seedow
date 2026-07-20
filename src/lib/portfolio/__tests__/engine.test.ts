import { describe, it, expect } from "vitest";
import { buildPortfolio } from "../engine";
import { MAX_SINGLE_WEIGHT, MIN_PORTFOLIO_ESG } from "../types";
import { balancedUniverse, defaultParams, diagonalCovMap, makeAsset } from "./fixtures";

describe("buildPortfolio", () => {
  it("returns an empty result on an empty universe without throwing", () => {
    const result = buildPortfolio({
      universe: [],
      covariance: new Map(),
      params: defaultParams(),
    });
    expect(result.weights).toEqual({});
    expect(result.selected_assets).toEqual([]);
    expect(result.excluded_count).toBe(0);
    expect(result.esg_floor_relaxed).toBe(false);
    expect(result.metrics.expected_return).toBe(0);
    expect(result.metrics.volatility).toBe(0);
  });

  it("falls back to volatility² on the diagonal when covariance rows are missing", () => {
    // Actif fraîchement ajouté à l'univers : aucune ligne dans asset_covariance.
    // Sans repli, sa variance serait 0 → faux "rendement sans risque" que
    // l'optimiseur surpondérerait. Le portefeuille doit garder une volatilité
    // strictement positive même avec une matrice de covariance vide.
    const universe = balancedUniverse();
    const result = buildPortfolio({
      universe,
      covariance: new Map(),
      params: defaultParams(),
    });
    expect(result.selected_assets.length).toBeGreaterThan(0);
    expect(result.metrics.volatility).toBeGreaterThan(0);
  });

  it("returns an empty result when every asset is excluded", () => {
    const universe = [
      makeAsset({ id: "a", excluded_sectors: ["fossiles"] }),
      makeAsset({ id: "b", excluded_sectors: ["armes"] }),
      makeAsset({ id: "c", excluded_sectors: ["tabac"] }),
    ];
    const result = buildPortfolio({
      universe,
      covariance: diagonalCovMap(universe),
      params: defaultParams({ exclusions: ["fossiles", "armes", "tabac"] }),
    });
    expect(result.weights).toEqual({});
    expect(result.selected_assets).toEqual([]);
    expect(result.excluded_count).toBe(universe.length);
  });

  it("keeps all assets when an asset class has ≤3 titles (no median filter)", () => {
    // 3 equity_dev assets — all should survive best-in-class regardless of ESG.
    const universe = [
      makeAsset({ id: "eq-1", asset_class: "equity_dev", esg_score: 20 }),
      makeAsset({ id: "eq-2", asset_class: "equity_dev", esg_score: 40 }),
      makeAsset({ id: "eq-3", asset_class: "equity_dev", esg_score: 80 }),
      // add other classes so build doesn't fully collapse
      makeAsset({ id: "gb-1", asset_class: "green_bond", esg_score: 75 }),
      makeAsset({ id: "sb-1", asset_class: "sov_bond", esg_score: 75 }),
    ];
    const result = buildPortfolio({
      universe,
      covariance: diagonalCovMap(universe),
      params: defaultParams({ risk_target: 0.09 }),
    });
    // best-in-class kept all 5 → excluded_count === 0
    expect(result.excluded_count).toBe(0);
  });

  it("keeps only the top 50% per class when many titles are present", () => {
    // 6 equity_dev assets: best-in-class keeps top 50% => 3 assets (indices 3,4,5)
    const universe = Array.from({ length: 6 }, (_, i) =>
      makeAsset({
        id: `eq-${i}`,
        asset_class: "equity_dev",
        esg_score: 50 + i * 5,
      }),
    );
    const result = buildPortfolio({
      universe,
      covariance: diagonalCovMap(universe),
      params: defaultParams(),
    });
    // 6 in, top 50% (floor(6*0.5)=3) kept → 3 dropped
    expect(result.excluded_count).toBe(3);
  });

  it("returns weights that sum to 1 and respect MAX_SINGLE_WEIGHT", () => {
    const universe = balancedUniverse();
    const result = buildPortfolio({
      universe,
      covariance: diagonalCovMap(universe),
      params: defaultParams(),
    });
    const sum = Object.values(result.weights).reduce((s, w) => s + w, 0);
    expect(sum).toBeCloseTo(1, 6);
    for (const w of Object.values(result.weights)) {
      // MAX_SINGLE_WEIGHT is a QP constraint; allow tiny numerical slack.
      expect(w).toBeLessThanOrEqual(MAX_SINGLE_WEIGHT + 1e-6);
    }
    // selected_assets only contains ids present in weights
    for (const a of result.selected_assets) {
      expect(result.weights[a.id]).toBeGreaterThan(0);
    }
    for (const id of Object.keys(result.weights)) {
      expect(result.selected_assets.some((a) => a.id === id)).toBe(true);
    }
  });

  it("triggers the class-balanced safety net when the pool is tiny", () => {
    // Only 4 assets across 4 different classes, all with ≤3 per class → no best-in-class filter.
    // After optimisation the safety net may or may not fire; either way we must
    // never end up with < 3 positions when the pool has ≥ 3 assets.
    const universe = [
      makeAsset({ id: "a", asset_class: "equity_dev", esg_score: 80 }),
      makeAsset({ id: "b", asset_class: "green_bond", esg_score: 80 }),
      makeAsset({ id: "c", asset_class: "sov_bond", esg_score: 80 }),
      makeAsset({ id: "d", asset_class: "cash", esg_score: 80 }),
    ];
    const result = buildPortfolio({
      universe,
      covariance: diagonalCovMap(universe),
      params: defaultParams(),
    });
    expect(Object.keys(result.weights).length).toBeGreaterThanOrEqual(3);
    const sum = Object.values(result.weights).reduce((s, w) => s + w, 0);
    expect(sum).toBeCloseTo(1, 6);
  });

  it("flags esg_floor_relaxed when the universe cannot meet the ESG floor", () => {
    // All assets well below the 70 floor.
    const classes = ["equity_dev", "green_bond", "sov_bond", "cash"] as const;
    const universe = classes.flatMap((cls, k) =>
      Array.from({ length: 2 }, (_, i) =>
        makeAsset({
          id: `${cls}-${i}`,
          asset_class: cls,
          esg_score: 20 + k, // way below MIN_PORTFOLIO_ESG=70
        }),
      ),
    );
    const result = buildPortfolio({
      universe,
      covariance: diagonalCovMap(universe),
      params: defaultParams(),
    });
    expect(result.esg_floor_relaxed).toBe(true);
    expect(result.metrics.esg_score).toBeLessThan(MIN_PORTFOLIO_ESG);
  });

  it("respects excluded_count = initial_universe - pool.length", () => {
    const universe = [
      makeAsset({ id: "x1", excluded_sectors: ["armes"] }),
      makeAsset({ id: "x2", excluded_sectors: [] }),
      makeAsset({ id: "x3", asset_class: "green_bond" }),
      makeAsset({ id: "x4", asset_class: "sov_bond" }),
    ];
    const result = buildPortfolio({
      universe,
      covariance: diagonalCovMap(universe),
      params: defaultParams({ exclusions: ["armes"] }),
    });
    // 1 removed by exclusion, ≤3 per class so no best-in-class drop → excluded_count = 1
    expect(result.excluded_count).toBe(1);
  });
});
