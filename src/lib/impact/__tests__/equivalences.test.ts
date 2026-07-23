import { describe, it, expect } from "vitest";
import {
  co2Equivalences,
  presentImpact,
  ADEME_FACTORS,
  MIN_COVERAGE_FOR_EQUIVALENCES,
  type EmissionFactor,
} from "../equivalences";

const CAR: EmissionFactor = {
  id: "car_km",
  labelKey: "impact.equiv.car_km",
  unitKey: "impact.unit.km",
  kgCo2ePerUnit: 0.2,
  source: "test",
  asOf: 2023,
};

describe("co2Equivalences", () => {
  it("divides the kg figure by each factor", () => {
    const [e] = co2Equivalences(100, [CAR]);
    expect(e.value).toBeCloseTo(500, 9); // 100 / 0.2
    expect(e.factorId).toBe("car_km");
    expect(e.source).toBe("test");
  });

  it("propagates a negative input (no clamping — honest sign)", () => {
    const [e] = co2Equivalences(-100, [CAR]);
    expect(e.value).toBeCloseTo(-500, 9);
  });

  it("returns an empty list for a non-finite input", () => {
    expect(co2Equivalences(NaN, [CAR])).toEqual([]);
  });

  it("ships real ADEME factors with a source and a year", () => {
    expect(ADEME_FACTORS.length).toBeGreaterThan(0);
    for (const f of ADEME_FACTORS) {
      expect(f.kgCo2ePerUnit).toBeGreaterThan(0);
      expect(f.source.length).toBeGreaterThan(0);
      expect(f.asOf).toBeGreaterThan(2000);
    }
  });
});

describe("presentImpact (anti-greenwashing gate)", () => {
  it("shows equivalences when data is measured and coverage is sufficient", () => {
    const p = presentImpact({
      kgCo2ePerYear: 100,
      basis: "measured",
      coverage: MIN_COVERAGE_FOR_EQUIVALENCES,
    });
    expect(p.show).toBe(true);
    expect(p.equivalences.length).toBe(ADEME_FACTORS.length);
    expect(p.reasonKey).toBeUndefined();
  });

  it("refuses equivalences for estimated data even at full coverage", () => {
    const p = presentImpact({ kgCo2ePerYear: 100, basis: "estimated", coverage: 1 });
    expect(p.show).toBe(false);
    expect(p.reasonKey).toBe("impact.reason.estimated_only");
    expect(p.equivalences).toEqual([]);
  });

  it("refuses equivalences when coverage is below the threshold", () => {
    const p = presentImpact({
      kgCo2ePerYear: 100,
      basis: "measured",
      coverage: MIN_COVERAGE_FOR_EQUIVALENCES - 0.01,
    });
    expect(p.show).toBe(false);
    expect(p.reasonKey).toBe("impact.reason.low_coverage");
  });

  it("refuses equivalences when there is no carbon figure", () => {
    const p = presentImpact({ kgCo2ePerYear: null, basis: "measured", coverage: 1 });
    expect(p.show).toBe(false);
    expect(p.reasonKey).toBe("impact.reason.no_data");
  });
});
