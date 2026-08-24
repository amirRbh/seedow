import { describe, it, expect } from "vitest";
import { computeMetrics } from "../metrics";
import { DEFAULT_PILLAR_WEIGHTS, compositeEsgScore, causeToPillarWeights } from "../types";
import { makeAsset } from "./fixtures";

describe("computeMetrics", () => {
  it("returns zeroed metrics when weights is empty (no NaN, no crash)", () => {
    const a = makeAsset({ id: "a" });
    const m = computeMetrics([a], {}, [[a.volatility ** 2]], [a.expected_return]);
    expect(m.expected_return).toBe(0);
    expect(m.volatility).toBe(0);
    expect(m.sharpe).toBe(0);
    expect(m.esg_score).toBe(0);
    expect(m.ter).toBe(0);
    // La réserve notée ici (« diversification devrait valoir 0 sur un portefeuille
    // vide, pas 1 ») est levée : depuis que les poids ne somment plus forcément à
    // 1, la diversification se lit sur la part allouée. Rien d'alloué → 0.
    expect(m.diversification).toBe(0);
    expect(m.allocated_share).toBe(0);
    expect(m.carbon_intensity_gco2e_per_eur).toBeNull();
    expect(m.carbon_intensity_coverage).toBe(0);
    expect(Number.isFinite(m.sharpe)).toBe(true);
    expect(Number.isNaN(m.sharpe)).toBe(false);
  });

  it("agrège le WACI sur la seule part couverte (données émetteurs réelles)", () => {
    const a = makeAsset({ id: "a", waci_tco2e_per_musd_sales: 100 });
    const b = makeAsset({ id: "b" }); // pas de WACI
    const cov = [
      [0.01, 0],
      [0, 0.01],
    ];
    const m = computeMetrics([a, b], { a: 0.6, b: 0.4 }, cov, [0.05, 0.05]);
    // Moyenne pondérée sur la part couverte (a seul) : 100.
    expect(m.waci_tco2e_per_musd_sales).toBeCloseTo(100, 6);
    expect(m.waci_coverage).toBeCloseTo(0.6, 6);
  });

  it("WACI null quand aucun actif ne le renseigne", () => {
    const a = makeAsset({ id: "a" });
    const m = computeMetrics([a], { a: 1 }, [[0.01]], [0.05]);
    expect(m.waci_tco2e_per_musd_sales).toBeNull();
    expect(m.waci_coverage).toBe(0);
  });

  it("computes wᵀΣw exactly for a hand-worked 2-asset case", () => {
    const a = makeAsset({ id: "a", volatility: 0.1 });
    const b = makeAsset({ id: "b", volatility: 0.2 });
    // cov[0][1] = 0.01 (ρ = 0.5)
    const cov = [
      [0.01, 0.01],
      [0.01, 0.04],
    ];
    const weights = { a: 0.6, b: 0.4 };
    const mu = [0.05, 0.08];
    const m = computeMetrics([a, b], weights, cov, mu);
    // variance = 0.36*0.01 + 2*0.24*0.01 + 0.16*0.04 = 0.0036+0.0048+0.0064 = 0.0148
    const expectedVar = 0.0148;
    expect(m.volatility * m.volatility).toBeCloseTo(expectedVar, 12);
    // expected return = 0.6*0.05 + 0.4*0.08 = 0.062
    expect(m.expected_return).toBeCloseTo(0.062, 12);
  });

  it("computes carbon intensity only over covered weight (intensive measure)", () => {
    const a = makeAsset({ id: "a", carbon_intensity_gco2e_per_eur: 100 });
    const b = makeAsset({ id: "b", carbon_intensity_gco2e_per_eur: null });
    const cov = [
      [a.volatility ** 2, 0],
      [0, b.volatility ** 2],
    ];
    const m = computeMetrics([a, b], { a: 0.4, b: 0.6 }, cov, [
      a.expected_return,
      b.expected_return,
    ]);
    expect(m.carbon_intensity_coverage).toBeCloseTo(0.4, 12);
    // Weighted avg over covered assets = (0.4*100)/0.4 = 100
    expect(m.carbon_intensity_gco2e_per_eur).toBeCloseTo(100, 12);
  });

  it("returns null carbon intensity when no asset has data", () => {
    const a = makeAsset({ id: "a" });
    const b = makeAsset({ id: "b" });
    const cov = [
      [a.volatility ** 2, 0],
      [0, b.volatility ** 2],
    ];
    const m = computeMetrics([a, b], { a: 0.5, b: 0.5 }, cov, [
      a.expected_return,
      b.expected_return,
    ]);
    expect(m.carbon_intensity_gco2e_per_eur).toBeNull();
    expect(m.carbon_intensity_coverage).toBe(0);
  });

  it("computes diversification = 1 - HHI on 4 equal-weight assets", () => {
    const assets = [1, 2, 3, 4].map((i) => makeAsset({ id: `a${i}` }));
    const cov = assets.map((_, i) =>
      assets.map((_, j) => (i === j ? assets[i].volatility ** 2 : 0)),
    );
    const weights = Object.fromEntries(assets.map((a) => [a.id, 0.25]));
    const m = computeMetrics(
      assets,
      weights,
      cov,
      assets.map((a) => a.expected_return),
    );
    // 1 - 4 * 0.25² = 0.75
    expect(m.diversification).toBeCloseTo(0.75, 12);
  });
});

describe("compositeEsgScore", () => {
  it("falls back to the global esg_score only for missing pillars", () => {
    const a = makeAsset({
      id: "a",
      esg_score: 60,
      env_score: 90,
      social_score: null, // missing → falls back to 60
      governance_score: 40,
    });
    // With defaults 40/40/20: 0.4*90 + 0.4*60 + 0.2*40 = 36 + 24 + 8 = 68
    expect(compositeEsgScore(a, DEFAULT_PILLAR_WEIGHTS)).toBeCloseTo(68, 12);
  });

  it("uses the aggregate score for every pillar when all are missing", () => {
    const a = makeAsset({
      id: "a",
      esg_score: 55,
      env_score: null,
      social_score: null,
      governance_score: null,
    });
    expect(compositeEsgScore(a, DEFAULT_PILLAR_WEIGHTS)).toBeCloseTo(55, 12);
  });
});

describe("causeToPillarWeights", () => {
  it("returns defaults for no causes", () => {
    const w = causeToPillarWeights([]);
    expect(w).toEqual(DEFAULT_PILLAR_WEIGHTS);
  });

  it("shifts weight to E for climat/biodiversite and renormalises to 1", () => {
    const w = causeToPillarWeights(["climat", "biodiversite"]);
    const sum = w.env + w.social + w.governance;
    expect(sum).toBeCloseTo(1, 12);
    // Raw: env=0.6, social=0.4, gov=0.2 → sum=1.2
    expect(w.env).toBeCloseTo(0.6 / 1.2, 12);
    expect(w.social).toBeCloseTo(0.4 / 1.2, 12);
    expect(w.governance).toBeCloseTo(0.2 / 1.2, 12);
  });

  it("shifts weight to S for humain/egalite", () => {
    const w = causeToPillarWeights(["humain"]);
    expect(w.social).toBeGreaterThan(DEFAULT_PILLAR_WEIGHTS.social);
    expect(w.env + w.social + w.governance).toBeCloseTo(1, 12);
  });

  it("gives a smaller boost to G for tech/circulaire (STEP*0.5)", () => {
    const w = causeToPillarWeights(["tech"]);
    // raw: env=0.4, social=0.4, gov=0.25 → sum=1.05
    expect(w.governance).toBeCloseTo(0.25 / 1.05, 12);
    expect(w.env + w.social + w.governance).toBeCloseTo(1, 12);
  });

  describe("composition partielle — 80 % reste 80 %", () => {
    const cov = [
      [0.04, 0],
      [0, 0.09],
    ];

    it("expose la part allouée telle quelle", () => {
      const a = makeAsset({ id: "a", esg_score: 80 });
      const b = makeAsset({ id: "b", esg_score: 40 });
      const m = computeMetrics([a, b], { a: 0.5, b: 0.3 }, cov, [
        a.expected_return,
        b.expected_return,
      ]);
      expect(m.allocated_share).toBeCloseTo(0.8, 9);
    });

    it("lit le score ESG sur la part allouée, sans prêter un 0 au liquide", () => {
      const a = makeAsset({ id: "a", esg_score: 80 });
      const b = makeAsset({ id: "b", esg_score: 40 });
      const partial = computeMetrics([a, b], { a: 0.5, b: 0.3 }, cov, [
        a.expected_return,
        b.expected_return,
      ]);
      // Moyenne pondérée sur 0,8 : (0,5×80 + 0,3×40) / 0,8 = 65.
      expect(partial.esg_score).toBeCloseTo(65, 6);
      // Les mêmes proportions à 100 % donnent exactement le même score : la part
      // non attribuée ne dégrade pas l'impact mesuré.
      const full = computeMetrics([a, b], { a: 0.625, b: 0.375 }, cov, [
        a.expected_return,
        b.expected_return,
      ]);
      expect(full.esg_score).toBeCloseTo(partial.esg_score, 6);
    });

    it("ne récompense pas le fait de laisser de l'argent de côté", () => {
      const a = makeAsset({ id: "a" });
      // Une seule ligne à 10 % : concentration maximale sur la part allouée.
      const m = computeMetrics([a], { a: 0.1 }, [[0.04]], [a.expected_return]);
      expect(m.diversification).toBeCloseTo(0, 9);
    });

    it("garde les montants proportionnels : rendement et frais suivent la part placée", () => {
      const a = makeAsset({ id: "a", ter: 0.002, expected_return: 0.06 });
      const half = computeMetrics([a], { a: 0.5 }, [[0.04]], [0.06]);
      const full = computeMetrics([a], { a: 1 }, [[0.04]], [0.06]);
      expect(half.ter).toBeCloseTo(full.ter / 2, 9);
      expect(half.expected_return).toBeCloseTo(full.expected_return / 2, 9);
      // La volatilité aussi : la part non placée ne bouge pas.
      expect(half.volatility).toBeCloseTo(full.volatility / 2, 9);
    });

    it("laisse by_class refléter la part réelle du montant, pas un total forcé à 1", () => {
      const a = makeAsset({ id: "a", asset_class: "equity_dev" });
      const m = computeMetrics([a], { a: 0.4 }, [[0.04]], [a.expected_return]);
      expect(m.by_class.equity_dev).toBeCloseTo(0.4, 9);
    });
  });
});
