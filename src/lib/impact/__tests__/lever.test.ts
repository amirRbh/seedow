import { describe, expect, it } from "vitest";
import { estimateClimateExposureLever } from "@/lib/impact/lever";

const holdings = [
  { weight: 0.6, waci: 150, volatility: 0.2 },
  { weight: 0.4, waci: 50, volatility: 0.1 },
];

describe("estimateClimateExposureLever", () => {
  it("est masqué si le WACI du portefeuille n'est pas mesuré", () => {
    expect(
      estimateClimateExposureLever({
        currentWaci: null,
        waciCoverage: 0,
        currentVolatility: 0.15,
        holdings,
        exposureIncreasePct: 20,
      }),
    ).toEqual({ available: false });
  });

  it("est masqué si la couverture WACI est trop faible", () => {
    expect(
      estimateClimateExposureLever({
        currentWaci: 110,
        waciCoverage: 0.2,
        currentVolatility: 0.15,
        holdings,
        exposureIncreasePct: 20,
      }),
    ).toEqual({ available: false });
  });

  it("est masqué si aucune ligne réelle n'est plus propre que la moyenne", () => {
    expect(
      estimateClimateExposureLever({
        currentWaci: 30,
        waciCoverage: 1,
        currentVolatility: 0.15,
        holdings,
        exposureIncreasePct: 20,
      }),
    ).toEqual({ available: false });
  });

  it("à 0%, renvoie exactement les valeurs actuelles", () => {
    const r = estimateClimateExposureLever({
      currentWaci: 110,
      waciCoverage: 1,
      currentVolatility: 0.18,
      holdings,
      exposureIncreasePct: 0,
    });
    expect(r.available).toBe(true);
    if (r.available) {
      expect(r.estimatedWaci).toBeCloseTo(110);
      expect(r.estimatedVolatility).toBeCloseTo(0.18);
    }
  });

  it("à 100%, converge vers la ligne la plus propre détenue", () => {
    const r = estimateClimateExposureLever({
      currentWaci: 110,
      waciCoverage: 1,
      currentVolatility: 0.18,
      holdings,
      exposureIncreasePct: 100,
    });
    expect(r.available).toBe(true);
    if (r.available) {
      expect(r.estimatedWaci).toBeCloseTo(50);
      expect(r.estimatedVolatility).toBeCloseTo(0.1);
    }
  });

  it("interpole linéairement entre les deux points réels", () => {
    const r = estimateClimateExposureLever({
      currentWaci: 100,
      waciCoverage: 1,
      currentVolatility: 0.2,
      holdings,
      exposureIncreasePct: 50,
    });
    expect(r.available).toBe(true);
    if (r.available) {
      expect(r.estimatedWaci).toBeCloseTo(75);
      expect(r.estimatedVolatility).toBeCloseTo(0.15);
    }
  });

  it("borne le curseur à [0, 100]", () => {
    const r = estimateClimateExposureLever({
      currentWaci: 100,
      waciCoverage: 1,
      currentVolatility: 0.2,
      holdings,
      exposureIncreasePct: 250,
    });
    expect(r.available).toBe(true);
    if (r.available) expect(r.exposureIncreasePct).toBe(100);
  });
});
