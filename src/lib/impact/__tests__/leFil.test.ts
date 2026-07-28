import { describe, it, expect } from "vitest";
import { buildImpactFeed, type FeedInput } from "../leFil";
import type { PortfolioImpactView } from "../portfolioImpact";
import type { ThemeBreakdown } from "../themeBreakdown";

const NOW = new Date("2026-07-28T10:00:00.000Z");

const breakdown = (
  slices: { cause: string; pct: number }[],
  unclassifiedPct = 0,
): ThemeBreakdown => ({
  slices: slices as ThemeBreakdown["slices"],
  unclassifiedPct,
  holdingsCount: slices.length,
});

const baseImpact = (over: Partial<PortfolioImpactView> = {}): PortfolioImpactView => ({
  measured: false,
  intensityGco2ePerEur: null,
  coverage: 0,
  financedEmissionsKgPerYear: null,
  presentation: { show: false, equivalences: [], coverage: 0, basis: "estimated" },
  intensity: null,
  esgScore: 72,
  ...over,
});

const baseInput = (over: Partial<FeedInput> = {}): FeedInput => ({
  portfolioId: "p1",
  generatedAt: "2026-03-12T09:00:00.000Z",
  now: NOW,
  holdingsCount: 8,
  breakdown: breakdown([
    { cause: "climat", pct: 55 },
    { cause: "biodiversite", pct: 45 },
  ]),
  impact: baseImpact(),
  benchmarkSource: "MSCI ACWI",
  benchmarkAsOf: "2024",
  ...over,
});

describe("buildImpactFeed", () => {
  it("always opens with an identity dispatch anchored to the creation date", () => {
    const feed = buildImpactFeed(baseInput());
    expect(feed[0].id).toBe("identity");
    expect(feed[0].anchored).toBe(true);
    expect(feed[0].dateISO).toBe("2026-03-12T09:00:00.000Z");
    expect(feed[0].headlineParams).toMatchObject({ count: 8, themes: 2 });
  });

  it("every dispatch carries a source and a date (transparency contract)", () => {
    const feed = buildImpactFeed(baseInput());
    for (const d of feed) {
      expect(d.source.length).toBeGreaterThan(0);
      expect(d.dateISO.length).toBeGreaterThan(0);
    }
  });

  it("emits a positive 'cleaner' dispatch when the portfolio beats the benchmark", () => {
    const feed = buildImpactFeed(
      baseInput({
        impact: baseImpact({
          intensity: {
            waci: 100,
            coverage: 0.8,
            benchmarkWaci: 150,
            vsBenchmarkDeltaPct: 0.3,
            cleaner: true,
          },
        }),
      }),
    );
    const cleaner = feed.find((d) => d.id === "cleaner");
    expect(cleaner).toBeDefined();
    expect(cleaner!.tone).toBe("growth");
    expect(cleaner!.headlineParams).toMatchObject({ pct: 30 });
    expect(cleaner!.source).toBe("MSCI ACWI");
  });

  it("reports a caution dispatch honestly when the portfolio is dirtier", () => {
    const feed = buildImpactFeed(
      baseInput({
        impact: baseImpact({
          intensity: {
            waci: 200,
            coverage: 0.8,
            benchmarkWaci: 150,
            vsBenchmarkDeltaPct: -0.33,
            cleaner: false,
          },
        }),
      }),
    );
    const dirtier = feed.find((d) => d.id === "dirtier");
    expect(dirtier).toBeDefined();
    expect(dirtier!.tone).toBe("caution");
  });

  it("falls back to an honest 'measuring' dispatch when nothing is measured", () => {
    const feed = buildImpactFeed(baseInput());
    expect(feed.some((d) => d.id === "measuring")).toBe(true);
    expect(feed.some((d) => d.id === "measured")).toBe(false);
  });

  it("surfaces a measured equivalence dispatch when data is present", () => {
    const feed = buildImpactFeed(
      baseInput({
        impact: baseImpact({
          measured: true,
          coverage: 0.7,
          presentation: {
            show: true,
            coverage: 0.7,
            basis: "measured",
            equivalences: [
              {
                factorId: "car_km",
                labelKey: "impact.equiv.car_km",
                unitKey: "impact.unit.km",
                value: 1234,
                source: "ADEME",
                asOf: 2023,
              },
            ],
          },
        }),
      }),
    );
    const measured = feed.find((d) => d.id === "measured");
    expect(measured).toBeDefined();
    expect(measured!.headlineParams).toMatchObject({ km: 1234, coverage: 70 });
  });
});
