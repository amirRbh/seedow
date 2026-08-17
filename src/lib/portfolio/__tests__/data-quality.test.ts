import { describe, it, expect } from "vitest";
import {
  classifyDataQuality,
  classCorrelationPrior,
  covarianceFallback,
  anchorLowConfidenceReturns,
  FULL_CONFIDENCE_MIN_OBS,
  PARTIAL_CONFIDENCE_MIN_OBS,
} from "../data-quality";
import type { DataQualityTier } from "../types";
import { makeAsset } from "./fixtures";

describe("classifyDataQuality", () => {
  it("returns 'insufficient' when observations are missing (seed value)", () => {
    expect(classifyDataQuality({ stats_observations: null })).toBe("insufficient");
    expect(classifyDataQuality({ stats_observations: undefined })).toBe("insufficient");
  });

  it("returns 'insufficient' below the partial floor", () => {
    expect(classifyDataQuality({ stats_observations: PARTIAL_CONFIDENCE_MIN_OBS - 1 })).toBe(
      "insufficient",
    );
  });

  it("returns 'partial' between the two thresholds", () => {
    expect(classifyDataQuality({ stats_observations: PARTIAL_CONFIDENCE_MIN_OBS })).toBe("partial");
    expect(classifyDataQuality({ stats_observations: FULL_CONFIDENCE_MIN_OBS - 1 })).toBe("partial");
  });

  it("returns 'full' at or above ~12 months of history", () => {
    expect(classifyDataQuality({ stats_observations: FULL_CONFIDENCE_MIN_OBS })).toBe("full");
    expect(classifyDataQuality({ stats_observations: 800 })).toBe("full");
  });
});

describe("classCorrelationPrior / covarianceFallback", () => {
  it("is 1 on the diagonal (same class)", () => {
    expect(classCorrelationPrior("equity_dev", "equity_dev")).toBe(1);
  });

  it("never fabricates zero correlation between two risky assets of the same family", () => {
    expect(classCorrelationPrior("equity_dev", "equity_em")).toBeGreaterThan(0);
    expect(classCorrelationPrior("green_bond", "sov_bond")).toBeGreaterThan(0);
  });

  it("keeps equity↔bond correlation low but positive", () => {
    const eqBond = classCorrelationPrior("equity_dev", "green_bond");
    expect(eqBond).toBeGreaterThan(0);
    expect(eqBond).toBeLessThan(classCorrelationPrior("equity_dev", "equity_em"));
  });

  it("treats cash as uncorrelated", () => {
    expect(classCorrelationPrior("cash", "equity_dev")).toBe(0);
  });

  it("covarianceFallback equals ρ·σ_i·σ_j, and σ² on the diagonal", () => {
    const a = makeAsset({ asset_class: "equity_dev", volatility: 0.2 });
    const b = makeAsset({ asset_class: "green_bond", volatility: 0.05 });
    expect(covarianceFallback(a, a)).toBeCloseTo(0.04, 12); // σ²
    const rho = classCorrelationPrior("equity_dev", "green_bond");
    expect(covarianceFallback(a, b)).toBeCloseTo(rho * 0.2 * 0.05, 12);
  });
});

describe("anchorLowConfidenceReturns", () => {
  it("leaves 'full' assets untouched", () => {
    const assets = [
      makeAsset({ id: "a", asset_class: "equity_dev", expected_return: 0.08 }),
      makeAsset({ id: "b", asset_class: "equity_dev", expected_return: 0.05 }),
    ];
    const mu = assets.map((a) => a.expected_return);
    const tiers: DataQualityTier[] = ["full", "full"];
    const { mu: out, anchored } = anchorLowConfidenceReturns(assets, mu, tiers);
    expect(out).toEqual(mu);
    expect(anchored).toEqual([]);
  });

  it("anchors a low-confidence asset to the class median of full peers", () => {
    const assets = [
      makeAsset({ id: "full1", asset_class: "equity_dev", expected_return: 0.06 }),
      makeAsset({ id: "full2", asset_class: "equity_dev", expected_return: 0.10 }),
      makeAsset({ id: "seed", asset_class: "equity_dev", expected_return: 0.99 }), // absurd seed
    ];
    const mu = assets.map((a) => a.expected_return);
    const tiers: DataQualityTier[] = ["full", "full", "insufficient"];
    const { mu: out, anchored } = anchorLowConfidenceReturns(assets, mu, tiers);
    expect(out[2]).toBeCloseTo(0.08, 12); // median(0.06, 0.10)
    expect(anchored).toEqual(["seed"]);
    // never invents: full peers preserved
    expect(out[0]).toBe(0.06);
    expect(out[1]).toBe(0.10);
  });

  it("falls back to the GLOBAL full median when the class has no full peer", () => {
    const assets = [
      makeAsset({ id: "eqfull", asset_class: "equity_dev", expected_return: 0.09 }),
      makeAsset({ id: "bondseed", asset_class: "green_bond", expected_return: 0.5 }),
    ];
    const mu = assets.map((a) => a.expected_return);
    const tiers: DataQualityTier[] = ["full", "partial"];
    const { mu: out } = anchorLowConfidenceReturns(assets, mu, tiers);
    expect(out[1]).toBeCloseTo(0.09, 12); // global median of full = {0.09}
  });

  it("leaves values untouched when there is NO full asset anywhere (invents nothing)", () => {
    const assets = [
      makeAsset({ id: "x", expected_return: 0.2 }),
      makeAsset({ id: "y", expected_return: 0.3 }),
    ];
    const mu = assets.map((a) => a.expected_return);
    const tiers: DataQualityTier[] = ["insufficient", "partial"];
    const { mu: out, anchored } = anchorLowConfidenceReturns(assets, mu, tiers);
    expect(out).toEqual(mu);
    expect(anchored).toEqual([]);
  });
});
