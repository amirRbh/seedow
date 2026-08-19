import { describe, it, expect } from "vitest";
import {
  pairwiseOverlap,
  portfolioOverlap,
  aggregateExposure,
  lookThroughDiversification,
  type HoldingWeights,
} from "../overlap";

const hw = (obj: Record<string, number>): HoldingWeights => new Map(Object.entries(obj));

describe("pairwiseOverlap", () => {
  it("returns 1 for identical compositions", () => {
    const a = hw({ AAPL: 0.5, MSFT: 0.5 });
    expect(pairwiseOverlap(a, hw({ AAPL: 0.5, MSFT: 0.5 }))).toBeCloseTo(1, 12);
  });

  it("returns 0 for disjoint compositions", () => {
    expect(pairwiseOverlap(hw({ AAPL: 1 }), hw({ TSLA: 1 }))).toBe(0);
  });

  it("sums the min share over common holdings", () => {
    const a = hw({ AAPL: 0.6, MSFT: 0.4 });
    const b = hw({ AAPL: 0.3, MSFT: 0.3, NVDA: 0.4 });
    // min(0.6,0.3) + min(0.4,0.3) = 0.3 + 0.3 = 0.6
    expect(pairwiseOverlap(a, b)).toBeCloseTo(0.6, 12);
  });
});

describe("portfolioOverlap", () => {
  it("flags high overlap between two redundant world ETFs", () => {
    const weights = { fundA: 0.5, fundB: 0.5 };
    const holdings = new Map<string, HoldingWeights>([
      ["fundA", hw({ AAPL: 0.5, MSFT: 0.5 })],
      ["fundB", hw({ AAPL: 0.5, MSFT: 0.5 })],
    ]);
    const { overlap, coverage } = portfolioOverlap(weights, holdings);
    expect(overlap).toBeCloseTo(1, 12);
    expect(coverage).toBeCloseTo(1, 12);
  });

  it("returns null overlap when fewer than two funds have known holdings", () => {
    const weights = { fundA: 0.5, fundB: 0.5 };
    const holdings = new Map<string, HoldingWeights>([["fundA", hw({ AAPL: 1 })]]);
    const { overlap, coverage } = portfolioOverlap(weights, holdings);
    expect(overlap).toBeNull();
    expect(coverage).toBeCloseTo(0.5, 12); // only fundA covered
  });

  it("reports coverage on the covered weight only (never inventing holdings)", () => {
    const weights = { fundA: 0.3, fundB: 0.3, fundC: 0.4 };
    const holdings = new Map<string, HoldingWeights>([
      ["fundA", hw({ AAPL: 1 })],
      ["fundB", hw({ AAPL: 1 })],
    ]);
    const { coverage } = portfolioOverlap(weights, holdings);
    expect(coverage).toBeCloseTo(0.6, 12);
  });
});

describe("lookThroughDiversification", () => {
  it("exposes the false-diversification of redundant funds", () => {
    // Two funds, each 50%, both holding the SAME single stock → true HHI = 1.
    const weights = { fundA: 0.5, fundB: 0.5 };
    const holdings = new Map<string, HoldingWeights>([
      ["fundA", hw({ AAPL: 1 })],
      ["fundB", hw({ AAPL: 1 })],
    ]);
    const { diversification } = lookThroughDiversification(weights, holdings);
    expect(diversification).toBeCloseTo(0, 12); // 1 - 1
  });

  it("rewards genuinely distinct underlying exposures", () => {
    const weights = { fundA: 0.5, fundB: 0.5 };
    const holdings = new Map<string, HoldingWeights>([
      ["fundA", hw({ AAPL: 1 })],
      ["fundB", hw({ TSLA: 1 })],
    ]);
    const { diversification } = lookThroughDiversification(weights, holdings);
    // aggregate exposure {AAPL:0.5, TSLA:0.5} → HHI 0.5 → diversification 0.5
    expect(diversification).toBeCloseTo(0.5, 12);
  });

  it("returns null when no fund has known holdings", () => {
    const { diversification, coverage } = lookThroughDiversification(
      { fundA: 1 },
      new Map(),
    );
    expect(diversification).toBeNull();
    expect(coverage).toBe(0);
  });
});

describe("aggregateExposure", () => {
  it("renormalises over covered weight", () => {
    const weights = { fundA: 0.5, fundB: 0.5 };
    const holdings = new Map<string, HoldingWeights>([
      ["fundA", hw({ AAPL: 0.5, MSFT: 0.5 })],
      ["fundB", hw({ AAPL: 1 })],
    ]);
    const exp = aggregateExposure(weights, holdings);
    // AAPL: 0.5*0.5 + 0.5*1 = 0.75 ; MSFT: 0.25 → sum 1
    expect(exp.get("AAPL")).toBeCloseTo(0.75, 12);
    expect(exp.get("MSFT")).toBeCloseTo(0.25, 12);
  });
});
