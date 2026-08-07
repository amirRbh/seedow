import { describe, it, expect } from "vitest";
import {
  riskBand,
  diversificationBand,
  feesBand,
  impactScore,
  portfolioGlance,
} from "../plain-language";
import type { PortfolioMetrics } from "../types";

describe("riskBand", () => {
  it("classes low volatility as prudent", () => {
    expect(riskBand(0.04).level).toBe("prudent");
    expect(riskBand(0.079).level).toBe("prudent");
  });
  it("classes mid volatility as modéré", () => {
    expect(riskBand(0.08).level).toBe("modere");
    expect(riskBand(0.139).level).toBe("modere");
  });
  it("classes high volatility as dynamique", () => {
    expect(riskBand(0.14).level).toBe("dynamique");
    expect(riskBand(0.35).level).toBe("dynamique");
  });
  it("clamps and handles non-finite input without throwing", () => {
    expect(riskBand(-1).volatility).toBe(0);
    expect(riskBand(Number.NaN).level).toBe("prudent");
  });
});

describe("diversificationBand", () => {
  it("flags a very concentrated portfolio as limitée", () => {
    // 2 lignes à poids égaux → 1 − HHI = 0.5
    expect(diversificationBand(0.5).band).toBe("limitee");
  });
  it("classes mid diversification as correcte", () => {
    // 3 lignes à poids égaux → 0.667
    expect(diversificationBand(0.667).band).toBe("correcte");
  });
  it("classes broad diversification as bonne", () => {
    // 5+ lignes → ≥ 0.8
    expect(diversificationBand(0.8).band).toBe("bonne");
    expect(diversificationBand(0.9).band).toBe("bonne");
  });
});

describe("feesBand", () => {
  it("classes a cheap ETF as bas", () => {
    expect(feesBand(0.002).level).toBe("bas");
  });
  it("classes mid fees as modéré", () => {
    expect(feesBand(0.004).level).toBe("modere");
  });
  it("classes expensive products as élevé", () => {
    expect(feesBand(0.0075).level).toBe("eleve");
  });
  it("keeps the real ratio for display", () => {
    expect(feesBand(0.0028).ratio).toBeCloseTo(0.0028, 6);
  });
});

describe("impactScore", () => {
  it("rounds the composite ESG score onto /100", () => {
    expect(impactScore(81.6).score).toBe(82);
  });
  it("bands the score qualitatively", () => {
    expect(impactScore(82).level).toBe("fort");
    expect(impactScore(65).level).toBe("solide");
    expect(impactScore(50).level).toBe("modere");
  });
  it("clamps out-of-range scores", () => {
    expect(impactScore(140).score).toBe(100);
    expect(impactScore(-10).score).toBe(0);
  });
});

describe("portfolioGlance", () => {
  const metrics: PortfolioMetrics = {
    expected_return: 0.06,
    volatility: 0.1,
    sharpe: 0.5,
    esg_score: 78,
    ter: 0.0025,
    co2_avoided_tons: 1,
    carbon_intensity_gco2e_per_eur: null,
    carbon_intensity_coverage: 0,
    waci_tco2e_per_musd_sales: null,
    waci_coverage: 0,
    by_class: {} as never,
    by_region: {},
    diversification: 0.85,
  };

  it("returns all four readings for a full metrics object", () => {
    const g = portfolioGlance(metrics);
    expect(g.risk?.level).toBe("modere");
    expect(g.diversification?.band).toBe("bonne");
    expect(g.fees?.level).toBe("bas");
    expect(g.impact?.score).toBe(78);
  });

  it("returns nulls (no fabrication) when metrics are missing", () => {
    const g = portfolioGlance(null);
    expect(g.risk).toBeNull();
    expect(g.diversification).toBeNull();
    expect(g.fees).toBeNull();
    expect(g.impact).toBeNull();
  });
});
