import { describe, it, expect } from "vitest";
import { deriveCandidates } from "../useAlerts";
import type { ActivePortfolio, ActiveHolding } from "../useActivePortfolio";

function makeHolding(overrides: Partial<ActiveHolding> = {}): ActiveHolding {
  return {
    id: "asset-1",
    ticker: "AST1",
    name: "Asset One",
    category: "equity_dev",
    allocationPct: 10,
    esgScore: 75,
    region: "world",
    ...overrides,
  };
}

function makePortfolio(overrides: Partial<ActivePortfolio> = {}): ActivePortfolio {
  return {
    id: "portfolio-1",
    name: "Mon portefeuille",
    initial_amount: 10000,
    generated_at: new Date().toISOString(),
    holdings: [makeHolding()],
    metrics: null,
    ...overrides,
  };
}

describe("deriveCandidates", () => {
  it("returns nothing when there is no portfolio", () => {
    const out = deriveCandidates({ portfolio: null, exclusions: [], causes: [] });
    expect(out).toEqual([]);
  });

  it("flags concentration when the top holding is >= 40% of the portfolio", () => {
    const portfolio = makePortfolio({
      holdings: [makeHolding({ id: "big", name: "Big Corp", allocationPct: 45 })],
    });
    const out = deriveCandidates({ portfolio, exclusions: [], causes: [] });
    const concentration = out.find((a) => a.kind === "concentration");
    expect(concentration).toBeDefined();
    expect(concentration?.severity).toBe("warn");
    expect(concentration?.dedupKey).toBe("concentration:portfolio-1:big");
  });

  it("does not flag concentration under the 40% threshold", () => {
    const portfolio = makePortfolio({
      holdings: [makeHolding({ allocationPct: 39 })],
    });
    const out = deriveCandidates({ portfolio, exclusions: [], causes: [] });
    expect(out.some((a) => a.kind === "concentration")).toBe(false);
  });

  it("flags a weak-ESG holding only when the user actually holds causes", () => {
    const portfolio = makePortfolio({
      holdings: [makeHolding({ id: "weak", name: "Weak Co", esgScore: 30, allocationPct: 10 })],
    });

    const withCauses = deriveCandidates({ portfolio, exclusions: [], causes: ["climat"] });
    expect(withCauses.some((a) => a.kind === "esg_drift" && a.dedupKey === "esg:portfolio-1:weak")).toBe(
      true,
    );

    const withoutCauses = deriveCandidates({ portfolio, exclusions: [], causes: [] });
    expect(withoutCauses.some((a) => a.dedupKey === "esg:portfolio-1:weak")).toBe(false);
  });

  it("suggests exclusions when causes are set but nothing is excluded", () => {
    const portfolio = makePortfolio();
    const out = deriveCandidates({ portfolio, exclusions: [], causes: ["climat"] });
    expect(out.some((a) => a.dedupKey === "no-exclusions:portfolio-1")).toBe(true);
  });

  it("does not suggest exclusions once at least one is set", () => {
    const portfolio = makePortfolio();
    const out = deriveCandidates({ portfolio, exclusions: ["fossiles"], causes: ["climat"] });
    expect(out.some((a) => a.dedupKey === "no-exclusions:portfolio-1")).toBe(false);
  });

  it("nudges a small, aging portfolio to contribute monthly", () => {
    const oldDate = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString();
    const portfolio = makePortfolio({ generated_at: oldDate, initial_amount: 2000 });
    const out = deriveCandidates({ portfolio, exclusions: [], causes: [] });
    expect(out.some((a) => a.dedupKey === "dca-suggest:portfolio-1")).toBe(true);
  });

  it("does not nudge a large or recent portfolio", () => {
    const recent = makePortfolio({ initial_amount: 2000 });
    expect(
      deriveCandidates({ portfolio: recent, exclusions: [], causes: [] }).some((a) =>
        a.dedupKey.startsWith("dca-suggest"),
      ),
    ).toBe(false);

    const oldDate = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString();
    const large = makePortfolio({ generated_at: oldDate, initial_amount: 10000 });
    expect(
      deriveCandidates({ portfolio: large, exclusions: [], causes: [] }).some((a) =>
        a.dedupKey.startsWith("dca-suggest"),
      ),
    ).toBe(false);
  });
});
