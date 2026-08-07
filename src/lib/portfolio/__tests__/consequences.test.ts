import { describe, it, expect } from "vitest";
import {
  normalizeWeights,
  herfindahl,
  liteSnapshot,
  describeConsequences,
  type WeightedLine,
} from "../consequences";

describe("normalizeWeights", () => {
  it("scales weights to sum to 1", () => {
    const out = normalizeWeights({ a: 2, b: 2 });
    expect(out.a).toBeCloseTo(0.5, 10);
    expect(out.b).toBeCloseTo(0.5, 10);
  });
  it("drops non-positive weights and returns empty on a zero total", () => {
    expect(normalizeWeights({ a: 0, b: -1 })).toEqual({});
  });
});

describe("herfindahl", () => {
  it("is 1 for a single line and 1/n for n equal lines", () => {
    expect(herfindahl([1])).toBeCloseTo(1, 10);
    expect(herfindahl([0.25, 0.25, 0.25, 0.25])).toBeCloseTo(0.25, 10);
  });
});

describe("liteSnapshot", () => {
  const lines: WeightedLine[] = [
    { id: "a", esgScore: 80, weight: 0.5 },
    { id: "b", esgScore: 60, weight: 0.5 },
  ];
  it("computes diversification, impact and max weight", () => {
    const s = liteSnapshot(lines);
    expect(s.diversification).toBeCloseTo(0.5, 10);
    expect(s.impact).toBeCloseTo(70, 10);
    expect(s.maxWeight).toBeCloseTo(0.5, 10);
    expect(s.positions).toBe(2);
  });
  it("renormalises defensively when weights do not sum to 1", () => {
    const s = liteSnapshot([
      { id: "a", esgScore: 100, weight: 3 },
      { id: "b", esgScore: 0, weight: 1 },
    ]);
    expect(s.maxWeight).toBeCloseTo(0.75, 10);
    expect(s.impact).toBeCloseTo(75, 10);
  });
  it("ignores zero-weight lines", () => {
    const s = liteSnapshot([
      { id: "a", esgScore: 80, weight: 1 },
      { id: "b", esgScore: 60, weight: 0 },
    ]);
    expect(s.positions).toBe(1);
    expect(s.diversification).toBeCloseTo(0, 10);
  });
});

describe("describeConsequences", () => {
  it("flags a more concentrated portfolio", () => {
    const before = liteSnapshot([
      { id: "a", esgScore: 70, weight: 0.5 },
      { id: "b", esgScore: 70, weight: 0.5 },
    ]);
    const after = liteSnapshot([
      { id: "a", esgScore: 70, weight: 0.9 },
      { id: "b", esgScore: 70, weight: 0.1 },
    ]);
    const keys = describeConsequences(before, after).map((c) => c.key);
    expect(keys).toContain("portfolio_customizer.consequence.more_concentrated");
  });

  it("reports a diversification-band improvement when spreading out", () => {
    const before = liteSnapshot([
      { id: "a", esgScore: 70, weight: 0.5 },
      { id: "b", esgScore: 70, weight: 0.5 },
    ]); // div 0.5 → limitee
    const after = liteSnapshot([
      { id: "a", esgScore: 70, weight: 0.2 },
      { id: "b", esgScore: 70, weight: 0.2 },
      { id: "c", esgScore: 70, weight: 0.2 },
      { id: "d", esgScore: 70, weight: 0.2 },
      { id: "e", esgScore: 70, weight: 0.2 },
    ]); // div 0.8 → bonne
    const conseq = describeConsequences(before, after);
    const keys = conseq.map((c) => c.key);
    expect(keys).toContain("portfolio_customizer.consequence.diversification_up");
    expect(keys).toContain("portfolio_customizer.consequence.less_concentrated");
  });

  it("reports an impact drop when replacing a high-impact line with a low one", () => {
    const before = liteSnapshot([{ id: "a", esgScore: 90, weight: 1 }]);
    const after = liteSnapshot([{ id: "b", esgScore: 50, weight: 1 }]);
    const impact = describeConsequences(before, after).find((c) =>
      c.key.endsWith("impact_down"),
    );
    expect(impact).toBeDefined();
    expect(impact?.vars?.pts).toBe(40);
  });

  it("returns nothing for an unchanged allocation", () => {
    const s = liteSnapshot([
      { id: "a", esgScore: 70, weight: 0.5 },
      { id: "b", esgScore: 70, weight: 0.5 },
    ]);
    expect(describeConsequences(s, s)).toHaveLength(0);
  });
});
