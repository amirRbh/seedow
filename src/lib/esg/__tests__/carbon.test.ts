import { describe, it, expect } from "vitest";
import {
  computePortfolioCarbon,
  financedEmissionsKgPerYear,
  avoidedVsBenchmarkKgPerYear,
  type AssetCarbonInput,
} from "../carbon";

describe("computePortfolioCarbon", () => {
  it("weights intensity only over covered assets (intensive measure)", () => {
    const assets: AssetCarbonInput[] = [
      { weight: 0.4, intensityGco2ePerEur: 100, dataQuality: 2 },
      { weight: 0.6, intensityGco2ePerEur: null },
    ];
    const c = computePortfolioCarbon(assets);
    expect(c.coverage).toBeCloseTo(0.4, 12);
    // (0.4*100)/0.4 = 100
    expect(c.intensityGco2ePerEur).toBeCloseTo(100, 12);
    expect(c.dataQualityScore).toBeCloseTo(2, 12);
  });

  it("returns null intensity and zero coverage when no asset has data", () => {
    const c = computePortfolioCarbon([
      { weight: 0.5, intensityGco2ePerEur: null },
      { weight: 0.5, intensityGco2ePerEur: null },
    ]);
    expect(c.intensityGco2ePerEur).toBeNull();
    expect(c.coverage).toBe(0);
    expect(c.dataQualityScore).toBeNull();
  });

  it("ignores negative intensities and out-of-range PCAF scores", () => {
    const c = computePortfolioCarbon([
      { weight: 0.5, intensityGco2ePerEur: -10, dataQuality: 1 }, // négatif → ignoré
      { weight: 0.5, intensityGco2ePerEur: 200, dataQuality: 9 }, // score hors 1..5 → null
    ]);
    expect(c.coverage).toBeCloseTo(0.5, 12);
    expect(c.intensityGco2ePerEur).toBeCloseTo(200, 12);
    // seul l'actif couvert a un score hors plage → aucune qualité exploitable
    expect(c.dataQualityScore).toBeNull();
  });

  it("weights the PCAF quality score over the assets that have one", () => {
    const c = computePortfolioCarbon([
      { weight: 0.5, intensityGco2ePerEur: 100, dataQuality: 1 },
      { weight: 0.5, intensityGco2ePerEur: 100, dataQuality: 5 },
    ]);
    expect(c.dataQualityScore).toBeCloseTo(3, 12); // (0.5*1 + 0.5*5)/1
  });
});

describe("financedEmissionsKgPerYear", () => {
  it("scales intensity by the covered amount and converts g → kg", () => {
    const carbon = { intensityGco2ePerEur: 100, coverage: 0.5, dataQualityScore: 2 };
    // 100 gCO2e/€/an * (10000€ * 0.5) / 1000 = 500 kg
    expect(financedEmissionsKgPerYear(carbon, 10000)).toBeCloseTo(500, 9);
  });

  it("returns null when intensity is unknown or amount invalid", () => {
    expect(
      financedEmissionsKgPerYear(
        { intensityGco2ePerEur: null, coverage: 0, dataQualityScore: null },
        1000,
      ),
    ).toBeNull();
    expect(
      financedEmissionsKgPerYear(
        { intensityGco2ePerEur: 100, coverage: 1, dataQualityScore: null },
        0,
      ),
    ).toBeNull();
  });
});

describe("avoidedVsBenchmarkKgPerYear", () => {
  const carbon = { intensityGco2ePerEur: 80, coverage: 1, dataQualityScore: 2 };

  it("is positive when the portfolio is cleaner than the benchmark", () => {
    // (150 - 80) * 10000 / 1000 = 700 kg évités
    expect(avoidedVsBenchmarkKgPerYear(carbon, 150, 10000)).toBeCloseTo(700, 9);
  });

  it("is negative (shown honestly) when the portfolio is dirtier", () => {
    // (50 - 80) * 10000 / 1000 = -300 kg
    expect(avoidedVsBenchmarkKgPerYear(carbon, 50, 10000)).toBeCloseTo(-300, 9);
  });

  it("returns null when portfolio intensity is unknown", () => {
    expect(
      avoidedVsBenchmarkKgPerYear(
        { intensityGco2ePerEur: null, coverage: 0, dataQualityScore: null },
        150,
        10000,
      ),
    ).toBeNull();
  });
});
