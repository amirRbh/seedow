import { describe, expect, it } from "vitest";
import {
  clamp01,
  satMonotoneDecreasing,
  satMonotoneIncreasing,
  satOrdinal,
  satTarget,
} from "../satisfaction";

describe("clamp01", () => {
  it("borne et neutralise le non-fini", () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(2)).toBe(1);
    expect(clamp01(0.5)).toBe(0.5);
    expect(clamp01(NaN)).toBe(0);
  });
});

describe("satMonotoneDecreasing (moins = mieux)", () => {
  it("1 sous good, 0 au-dessus de bad, linéaire entre", () => {
    expect(satMonotoneDecreasing(0.1, 0.15, 0.75)).toBe(1);
    expect(satMonotoneDecreasing(0.75, 0.15, 0.75)).toBe(0);
    expect(satMonotoneDecreasing(0.45, 0.15, 0.75)).toBeCloseTo(0.5, 6);
  });
  it("bornes dégénérées → pas net", () => {
    expect(satMonotoneDecreasing(5, 3, 3)).toBe(0);
    expect(satMonotoneDecreasing(2, 3, 3)).toBe(1);
  });
  it("reproduit le sous-score carbone 1 − WACI/(2·réf)", () => {
    const ref = 115;
    expect(satMonotoneDecreasing(ref, 0, 2 * ref)).toBeCloseTo(0.5, 6);
    expect(satMonotoneDecreasing(0, 0, 2 * ref)).toBe(1);
    expect(satMonotoneDecreasing(2 * ref, 0, 2 * ref)).toBe(0);
  });
});

describe("satMonotoneIncreasing (plus = mieux)", () => {
  it("0 sous bad, 1 au-dessus de good", () => {
    expect(satMonotoneIncreasing(2, 3, 8)).toBe(0);
    expect(satMonotoneIncreasing(8, 3, 8)).toBe(1);
    expect(satMonotoneIncreasing(5.5, 3, 8)).toBeCloseTo(0.5, 6);
  });
});

describe("satTarget (cible avec tolérance)", () => {
  it("maximale à la cible, décroît symétriquement", () => {
    expect(satTarget(4, 4, 1.5)).toBe(1);
    const below = satTarget(2.5, 4, 1.5);
    const above = satTarget(5.5, 4, 1.5);
    expect(below).toBeCloseTo(above, 6); // symétrie
    expect(below).toBeLessThan(1);
  });
  it("un actif trop peu risqué n'est pas parfait", () => {
    expect(satTarget(1, 5.5, 1.5)).toBeLessThan(0.1);
  });
  it("tolérance nulle → pas net", () => {
    expect(satTarget(4, 4, 0)).toBe(1);
    expect(satTarget(4.1, 4, 0)).toBe(0);
  });
});

describe("satOrdinal", () => {
  const map = { none: 1, low: 0.7, moderate: 0.35, severe: 0 };
  it("mappe une clé connue", () => {
    expect(satOrdinal("low", map)).toBe(0.7);
    expect(satOrdinal("severe", map)).toBe(0);
  });
  it("clé absente/nullish → null (aucune fausse continuité)", () => {
    expect(satOrdinal("unknown", map)).toBeNull();
    expect(satOrdinal(null, map)).toBeNull();
    expect(satOrdinal(undefined, map)).toBeNull();
  });
});
