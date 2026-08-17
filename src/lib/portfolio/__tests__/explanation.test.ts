import { describe, it, expect } from "vitest";
import { buildExplanation, diversificationScore10 } from "../explanation";
import type { PortfolioMetrics } from "../types";
import { defaultParams } from "./fixtures";

function metrics(overrides: Partial<PortfolioMetrics> = {}): PortfolioMetrics {
  return {
    expected_return: 0.06,
    volatility: 0.1,
    sharpe: 0.3,
    esg_score: 78,
    ter: 0.003,
    carbon_intensity_gco2e_per_eur: null,
    carbon_intensity_coverage: 0,
    waci_tco2e_per_musd_sales: null,
    waci_coverage: 0,
    by_class: {} as never,
    by_region: {},
    diversification: 0.85,
    ...overrides,
  };
}

describe("diversificationScore10", () => {
  it("maps 1 − HHI onto a 0..10 score", () => {
    expect(diversificationScore10(0)).toBe(0);
    expect(diversificationScore10(0.8)).toBe(8);
    expect(diversificationScore10(0.875)).toBe(8.8);
    expect(diversificationScore10(1)).toBe(10);
  });
});

describe("buildExplanation", () => {
  const dq = { full: 8, partial: 2, insufficient: 0, full_weight_share: 0.9, anchored_ids: [] };

  it("derives risk, diversification, position count and max weight from real values", () => {
    const weights = { a: 0.15, b: 0.15, c: 0.2, d: 0.2, e: 0.3 };
    const exp = buildExplanation({
      weights,
      metrics: metrics({ volatility: 0.1, diversification: 0.78 }),
      params: defaultParams(),
      dataQuality: dq,
      esgFloorRelaxed: false,
    });
    expect(exp.risk_level).toBe("modere");
    expect(exp.position_count).toBe(5);
    expect(exp.max_weight).toBeCloseTo(0.3, 12);
    expect(exp.diversification_10).toBe(7.8);
    expect(exp.real_data_share).toBe(0.9);
  });

  it("surfaces active constraints and the data-quality share as highlights", () => {
    const exp = buildExplanation({
      weights: { a: 1 },
      metrics: metrics(),
      params: defaultParams({ causes: ["climat"], exclusions: ["fossiles", "armes"] }),
      dataQuality: dq,
      esgFloorRelaxed: false,
    });
    const keys = exp.highlights.map((h) => h.key);
    expect(keys).toContain("portfolio_explain.exclusions");
    expect(keys).toContain("portfolio_explain.causes");
    expect(keys).toContain("portfolio_explain.real_data");
    expect(exp.summary_key).toBe("portfolio_explain.summary.aligned");
  });

  it("flags a relaxed ESG floor honestly", () => {
    const exp = buildExplanation({
      weights: { a: 1 },
      metrics: metrics(),
      params: defaultParams(),
      dataQuality: dq,
      esgFloorRelaxed: true,
    });
    expect(exp.highlights.map((h) => h.key)).toContain("portfolio_explain.esg_relaxed");
  });
});
