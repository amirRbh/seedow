import { describe, it, expect } from "vitest";
import { buildThemeBreakdown } from "../themeBreakdown";

describe("buildThemeBreakdown", () => {
  it("agrège l'exposition par cause pondérée par le poids d'allocation", () => {
    const b = buildThemeBreakdown([
      { allocationPct: 40, causeExposure: { climat: 1 } },
      { allocationPct: 30, causeExposure: { biodiversite: 0.5, climat: 0.5 } },
      { allocationPct: 20, causeExposure: { humain: 1 } },
      { allocationPct: 10, causeExposure: {} },
    ]);
    const byCause = Object.fromEntries(b.slices.map((s) => [s.cause, s.pct]));
    // climat = 40 + 30*0.5 = 55
    expect(byCause.climat).toBeCloseTo(55, 5);
    // biodiv = 30*0.5 = 15
    expect(byCause.biodiversite).toBeCloseTo(15, 5);
    expect(byCause.humain).toBeCloseTo(20, 5);
    expect(b.unclassifiedPct).toBeCloseTo(10, 5);
    expect(b.holdingsCount).toBe(4);
    // Trié desc
    expect(b.slices[0].cause).toBe("climat");
  });

  it("classe 100% en non-classé quand aucun holding n'a d'exposition", () => {
    const b = buildThemeBreakdown([
      { allocationPct: 60, causeExposure: {} },
      { allocationPct: 40, causeExposure: {} },
    ]);
    expect(b.slices).toHaveLength(0);
    expect(b.unclassifiedPct).toBeCloseTo(100, 5);
  });

  it("est défensif face aux entrées invalides", () => {
    const b = buildThemeBreakdown([
      { allocationPct: Number.NaN, causeExposure: { climat: 1 } },
      { allocationPct: -10, causeExposure: { climat: 1 } },
      { allocationPct: 50, causeExposure: { climat: Number.POSITIVE_INFINITY } },
    ]);
    expect(b.slices).toHaveLength(0);
    expect(b.unclassifiedPct).toBeCloseTo(50, 5);
  });
});
