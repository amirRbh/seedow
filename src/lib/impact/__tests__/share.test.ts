import { describe, it, expect } from "vitest";
import { impactShareData } from "../share";
import type { PortfolioImpactMetrics } from "../portfolioImpact";

// Benchmark ACWI = 115 tCO₂e/M$ ; seuil de couverture pour un verdict = 0.5.
const base: PortfolioImpactMetrics = {
  carbon_intensity_gco2e_per_eur: null,
  carbon_intensity_coverage: 0,
  waci_tco2e_per_musd_sales: null,
  waci_coverage: 0,
  esg_score: 82.4,
};

describe("impactShareData", () => {
  it("returns null figures when metrics are absent", () => {
    expect(impactShareData(null)).toEqual({ score: null, cleanerDeltaPct: null });
  });

  it("shares the rounded ESG score, no carbon figure when no WACI data", () => {
    expect(impactShareData(base)).toEqual({ score: 82, cleanerDeltaPct: null });
  });

  it("shares a carbon advantage only when cleaner AND coverage is representative", () => {
    const clean = { ...base, waci_tco2e_per_musd_sales: 70, waci_coverage: 0.8 };
    const r = impactShareData(clean);
    expect(r.score).toBe(82);
    // (115 − 70) / 115 ≈ 0.391
    expect(r.cleanerDeltaPct).not.toBeNull();
    expect(r.cleanerDeltaPct!).toBeGreaterThan(0.3);
  });

  it("hides the carbon figure when coverage is below the verdict threshold", () => {
    const thin = { ...base, waci_tco2e_per_musd_sales: 70, waci_coverage: 0.3 };
    expect(impactShareData(thin).cleanerDeltaPct).toBeNull();
  });

  it("never shares a carbon 'gain' when the portfolio is dirtier than the index", () => {
    const dirty = { ...base, waci_tco2e_per_musd_sales: 200, waci_coverage: 0.9 };
    expect(impactShareData(dirty).cleanerDeltaPct).toBeNull();
  });
});
