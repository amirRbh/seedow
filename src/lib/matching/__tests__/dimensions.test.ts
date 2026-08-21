import { describe, expect, it } from "vitest";
import {
  DIMENSION_SPECS,
  MATCHING_METHODOLOGY_VERSION,
  calibrateMonotoneThreshold,
  percentile,
  type DimensionSpec,
} from "../dimensions";

describe("percentile", () => {
  it("calcule les percentiles linéaires", () => {
    const s = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(percentile(s, 0)).toBe(1);
    expect(percentile(s, 1)).toBe(10);
    expect(percentile(s, 0.5)).toBeCloseTo(5.5, 6);
  });
  it("ignore les non-finis, gère l'échantillon vide/unique", () => {
    expect(percentile([NaN, Infinity], 0.5)).toBeNull();
    expect(percentile([42], 0.9)).toBe(42);
  });
});

describe("DIMENSION_SPECS", () => {
  it("chaque spec porte une provenance et une version (auditable §1.2)", () => {
    for (const spec of Object.values(DIMENSION_SPECS) as DimensionSpec[]) {
      expect(spec.thresholdOrigin.length).toBeGreaterThan(0);
      expect(spec.version).toBe(MATCHING_METHODOLOGY_VERSION);
    }
  });
});

describe("calibrateMonotoneThreshold", () => {
  const cost = DIMENSION_SPECS.cost as DimensionSpec;

  it("recalibre good=p10 / bad=p90 pour une dimension décroissante", () => {
    const sample = [0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.9];
    const calibrated = calibrateMonotoneThreshold(cost, sample);
    expect(calibrated.threshold.form).toBe("monotone_decreasing");
    if (calibrated.threshold.form === "monotone_decreasing") {
      expect(calibrated.threshold.good).toBeLessThan(calibrated.threshold.bad);
    }
    expect(calibrated.thresholdOrigin).toContain("calibré");
    expect(calibrated.version).toContain("+calib");
  });

  it("échantillon insuffisant → spec inchangée (pas de calibration sur du bruit)", () => {
    const calibrated = calibrateMonotoneThreshold(cost, [0.2, 0.3]);
    expect(calibrated).toBe(cost);
  });

  it("ne mute pas la spec d'origine", () => {
    const before = JSON.stringify(cost.threshold);
    calibrateMonotoneThreshold(cost, [0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.9]);
    expect(JSON.stringify(cost.threshold)).toBe(before);
  });
});
