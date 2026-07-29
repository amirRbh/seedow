import { describe, it, expect } from "vitest";
import {
  buildConvictions,
  convictionTier,
  buildImpactSignal,
  type ConvictionHolding,
} from "../narrative";
import type { ThemeBreakdown } from "../themeBreakdown";
import type { PortfolioImpactView } from "../portfolioImpact";

const breakdown = (
  slices: { cause: string; pct: number }[],
  unclassifiedPct = 0,
): ThemeBreakdown => ({
  slices: slices as ThemeBreakdown["slices"],
  unclassifiedPct,
  holdingsCount: slices.length,
});

const HOLDINGS: ConvictionHolding[] = [
  { allocationPct: 60, esgScore: 80, causeExposure: { climat: 1 } },
  { allocationPct: 40, esgScore: 50, causeExposure: { biodiversite: 1 } },
];

/** Vue d'impact minimale pour tester la sélection de signal. */
const impactView = (over: Partial<PortfolioImpactView> = {}): PortfolioImpactView => ({
  measured: false,
  intensityGco2ePerEur: null,
  coverage: 0,
  financedEmissionsKgPerYear: null,
  presentation: { show: false, equivalences: [], coverage: 0, basis: "estimated" },
  intensity: null,
  esgScore: 62,
  ...over,
});

describe("convictionTier", () => {
  it("returns unknown when vitality is null or invalid", () => {
    expect(convictionTier(null)).toBe("unknown");
    expect(convictionTier(Number.NaN)).toBe("unknown");
  });
  it("maps ESG vitality bands to labelled tiers", () => {
    expect(convictionTier(0.8)).toBe("solid");
    expect(convictionTier(0.66)).toBe("solid");
    expect(convictionTier(0.5)).toBe("growing");
    expect(convictionTier(0.4)).toBe("growing");
    expect(convictionTier(0.2)).toBe("watch");
  });
});

describe("buildConvictions", () => {
  it("keeps the theme breakdown order and weights untouched", () => {
    const model = buildConvictions(
      HOLDINGS,
      breakdown([
        { cause: "climat", pct: 60 },
        { cause: "biodiversite", pct: 40 },
      ]),
    );
    expect(model.convictions.map((c) => c.cause)).toEqual(["climat", "biodiversite"]);
    expect(model.convictions[0].pct).toBe(60);
    expect(model.topCause).toBe("climat");
    expect(model.themesCount).toBe(2);
  });

  it("derives vitality from the real ESG score of exposed holdings", () => {
    const model = buildConvictions(HOLDINGS, breakdown([{ cause: "climat", pct: 100 }]));
    expect(model.convictions[0].vitality).toBeCloseTo(0.8, 6);
    expect(model.convictions[0].tier).toBe("solid");
    expect(model.convictions[0].holdingsCount).toBe(1);
  });

  it("reports unknown vitality when no ESG data backs a theme", () => {
    const model = buildConvictions(
      [{ allocationPct: 100, esgScore: 70, causeExposure: {} }],
      breakdown([{ cause: "tech", pct: 100 }]),
    );
    expect(model.convictions[0].vitality).toBeNull();
    expect(model.convictions[0].tier).toBe("unknown");
    expect(model.convictions[0].holdingsCount).toBe(0);
  });

  it("passes through the honest unclassified share", () => {
    const model = buildConvictions(HOLDINGS, breakdown([{ cause: "climat", pct: 70 }], 30));
    expect(model.unclassifiedPct).toBe(30);
  });

  it("returns an empty model for a portfolio with no themes", () => {
    const model = buildConvictions([], breakdown([], 0));
    expect(model.convictions).toHaveLength(0);
    expect(model.topCause).toBeNull();
  });
});

describe("buildImpactSignal", () => {
  it("prefers a real 'cleaner than an ETF World' signal", () => {
    const signal = buildImpactSignal(
      impactView({
        intensity: {
          waci: 80,
          coverage: 0.9,
          benchmarkWaci: 115,
          vsBenchmarkDeltaPct: 0.3,
          cleaner: true,
        },
      }),
    );
    expect(signal.kind).toBe("cleaner");
    expect(signal.tone).toBe("positive");
    expect(signal.params.pct).toBe(30);
    expect(signal.asOf).toBeDefined();
  });

  it("states the bad news calmly when the portfolio is more intensive", () => {
    const signal = buildImpactSignal(
      impactView({
        intensity: {
          waci: 150,
          coverage: 0.9,
          benchmarkWaci: 115,
          vsBenchmarkDeltaPct: -0.3,
          cleaner: false,
        },
      }),
    );
    expect(signal.kind).toBe("dirtier");
    expect(signal.tone).toBe("caution");
    expect(signal.params.pct).toBe(30);
  });

  it("falls back to a tangible measured footprint when there is no benchmark delta", () => {
    const signal = buildImpactSignal(
      impactView({
        measured: true,
        coverage: 0.8,
        presentation: {
          show: true,
          coverage: 0.8,
          basis: "measured",
          equivalences: [
            {
              factorId: "car_km",
              labelKey: "impact.equiv.car_km",
              unitKey: "impact.unit.km",
              value: 1200,
              source: "ADEME Base Carbone",
              asOf: 2023,
            },
          ],
        },
      }),
    );
    expect(signal.kind).toBe("footprint");
    expect(signal.params.km).toBe(1200);
  });

  it("falls back to the honest ESG score when nothing is measured", () => {
    const signal = buildImpactSignal(impactView({ esgScore: 62 }));
    expect(signal.kind).toBe("esg");
    expect(signal.params.score).toBe(62);
    expect(signal.source).toBe("Moteur Seedow");
  });
});
