import { describe, it, expect } from "vitest";
import { assetBucket, assetRoleKey, explainHolding, explainPortfolio } from "../rationale";
import type { PortfolioMetrics } from "../types";

describe("assetBucket", () => {
  it("maps equities to actions", () => {
    expect(assetBucket("equity_dev")).toBe("actions");
    expect(assetBucket("equity_em")).toBe("actions");
    expect(assetBucket("thematic")).toBe("actions");
  });
  it("maps bonds to obligations", () => {
    expect(assetBucket("green_bond")).toBe("obligations");
    expect(assetBucket("sov_bond")).toBe("obligations");
    expect(assetBucket("corporate_bond")).toBe("obligations");
  });
  it("maps the rest to autres", () => {
    expect(assetBucket("reit")).toBe("autres");
    expect(assetBucket("commodity")).toBe("autres");
    expect(assetBucket("cash")).toBe("autres");
  });
});

describe("assetRoleKey", () => {
  it("builds a stable i18n key per class", () => {
    expect(assetRoleKey("equity_dev")).toBe("portfolio_glance.role.equity_dev");
    expect(assetRoleKey("cash")).toBe("portfolio_glance.role.cash");
  });
});

describe("explainHolding", () => {
  it("returns the role key and no cause match when exposure is absent", () => {
    const r = explainHolding({ asset_class: "sov_bond" }, ["climat"]);
    expect(r.roleKey).toBe("portfolio_glance.role.sov_bond");
    expect(r.matchedCause).toBeNull();
  });
  it("matches an active cause only when the asset is really exposed to it", () => {
    const r = explainHolding(
      { asset_class: "thematic", causeExposure: { climat: 0.6, humain: 0.05 } },
      ["climat", "humain"],
    );
    expect(r.matchedCause).toBe("climat");
  });
  it("does not match a cause below the exposure threshold", () => {
    const r = explainHolding({ asset_class: "thematic", causeExposure: { climat: 0.05 } }, [
      "climat",
    ]);
    expect(r.matchedCause).toBeNull();
  });
  it("ignores exposure to causes the user did not choose", () => {
    const r = explainHolding({ asset_class: "thematic", causeExposure: { biodiversite: 0.9 } }, [
      "climat",
    ]);
    expect(r.matchedCause).toBeNull();
  });
});

describe("explainPortfolio", () => {
  const baseMetrics: PortfolioMetrics = {
    expected_return: 0.06,
    volatility: 0.1,
    sharpe: 0.5,
    esg_score: 78,
    ter: 0.0025,
    carbon_intensity_gco2e_per_eur: null,
    carbon_intensity_coverage: 0,
    waci_tco2e_per_musd_sales: null,
    waci_coverage: 0,
    by_class: {} as never,
    by_region: {},
    diversification: 0.85,
  };

  it("derives a long-horizon reason and a risk reason from real inputs", () => {
    const reasons = explainPortfolio({
      causes: ["climat"],
      exclusions: ["fossiles"],
      horizon_years: 25,
      risk_target: 0.13,
      metrics: baseMetrics,
    });
    const keys = reasons.map((r) => r.key);
    expect(keys).toContain("portfolio_glance.why.horizon_long");
    expect(keys).toContain("portfolio_glance.why.risk_modere");
    expect(keys).toContain("portfolio_glance.why.causes");
    expect(keys).toContain("portfolio_glance.why.exclusions");
  });

  it("omits causes/exclusions reasons when the user picked none", () => {
    const reasons = explainPortfolio({
      causes: [],
      exclusions: [],
      horizon_years: 3,
      risk_target: 0.06,
      metrics: null,
    });
    const keys = reasons.map((r) => r.key);
    expect(keys).toContain("portfolio_glance.why.horizon_short");
    expect(keys).not.toContain("portfolio_glance.why.causes");
    expect(keys).not.toContain("portfolio_glance.why.exclusions");
  });

  it("falls back to risk_target for the risk reason when metrics are missing", () => {
    const reasons = explainPortfolio({
      causes: [],
      exclusions: [],
      horizon_years: 8,
      risk_target: 0.04,
      metrics: null,
    });
    const keys = reasons.map((r) => r.key);
    expect(keys).toContain("portfolio_glance.why.horizon_medium");
    expect(keys).toContain("portfolio_glance.why.risk_prudent");
  });
});
