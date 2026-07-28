import { describe, it, expect } from "vitest";
import { buildOrganism, hashSeed, type OrganismHolding } from "../leVivant";
import type { ThemeBreakdown } from "../themeBreakdown";

const breakdown = (
  slices: { cause: string; pct: number }[],
  unclassifiedPct = 0,
): ThemeBreakdown => ({
  slices: slices as ThemeBreakdown["slices"],
  unclassifiedPct,
  holdingsCount: slices.length,
});

const HOLDINGS: OrganismHolding[] = [
  { allocationPct: 60, esgScore: 80, causeExposure: { climat: 1 } },
  { allocationPct: 40, esgScore: 60, causeExposure: { biodiversite: 1 } },
];

describe("hashSeed", () => {
  it("is deterministic for the same id", () => {
    expect(hashSeed("abc")).toBe(hashSeed("abc"));
  });
  it("differs across ids", () => {
    expect(hashSeed("abc")).not.toBe(hashSeed("abd"));
  });
});

describe("buildOrganism", () => {
  it("creates one branch per theme slice", () => {
    const org = buildOrganism({
      portfolioId: "p1",
      breakdown: breakdown([
        { cause: "climat", pct: 60 },
        { cause: "biodiversite", pct: 40 },
      ]),
      holdings: HOLDINGS,
    });
    expect(org.branches).toHaveLength(2);
    expect(org.branches.map((b) => b.kind)).toEqual(["climat", "biodiversite"]);
  });

  it("normalises branch weights to sum to 1", () => {
    const org = buildOrganism({
      portfolioId: "p1",
      breakdown: breakdown([
        { cause: "climat", pct: 60 },
        { cause: "biodiversite", pct: 40 },
      ]),
      holdings: HOLDINGS,
    });
    const sum = org.branches.reduce((s, b) => s + b.weight, 0);
    expect(sum).toBeCloseTo(1, 9);
  });

  it("derives vitality from the real ESG score of the theme's holdings", () => {
    const org = buildOrganism({
      portfolioId: "p1",
      breakdown: breakdown([{ cause: "climat", pct: 100 }]),
      holdings: [{ allocationPct: 100, esgScore: 90, causeExposure: { climat: 1 } }],
    });
    expect(org.branches[0].vitality).toBeCloseTo(0.9, 6);
  });

  it("is fully deterministic for a given portfolio id", () => {
    const args = {
      portfolioId: "stable-id",
      breakdown: breakdown([{ cause: "climat", pct: 100 }]),
      holdings: HOLDINGS,
    };
    expect(buildOrganism(args)).toEqual(buildOrganism(args));
  });

  it("produces a different seed for a different portfolio", () => {
    const a = buildOrganism({
      portfolioId: "a",
      breakdown: breakdown([{ cause: "climat", pct: 100 }]),
      holdings: HOLDINGS,
    });
    const b = buildOrganism({
      portfolioId: "b",
      breakdown: breakdown([{ cause: "climat", pct: 100 }]),
      holdings: HOLDINGS,
    });
    expect(a.seed).not.toBe(b.seed);
  });

  it("opens an honest 'unclassified' branch only above the noise threshold", () => {
    const withNoise = buildOrganism({
      portfolioId: "p1",
      breakdown: breakdown([{ cause: "climat", pct: 98 }], 2),
      holdings: HOLDINGS,
    });
    expect(withNoise.branches.some((b) => b.kind === "unclassified")).toBe(false);

    const withReal = buildOrganism({
      portfolioId: "p1",
      breakdown: breakdown([{ cause: "climat", pct: 70 }], 30),
      holdings: HOLDINGS,
    });
    expect(withReal.branches.some((b) => b.kind === "unclassified")).toBe(true);
  });

  it("returns a germinating organism when there is no exposure", () => {
    const org = buildOrganism({
      portfolioId: "p1",
      breakdown: breakdown([], 0),
      holdings: [],
    });
    expect(org.branches).toHaveLength(0);
    expect(org.totalSeeds).toBe(0);
  });

  it("gives every branch at least one seed", () => {
    const org = buildOrganism({
      portfolioId: "p1",
      breakdown: breakdown([
        { cause: "climat", pct: 96 },
        { cause: "tech", pct: 4 },
      ]),
      holdings: HOLDINGS,
    });
    expect(org.branches.every((b) => b.seedCount >= 1)).toBe(true);
  });
});
