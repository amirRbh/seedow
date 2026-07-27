import { describe, it, expect } from "vitest";
import { carbonConfidenceTier } from "../translator";

describe("carbonConfidenceTier", () => {
  it("maps coverage to tiers at the documented boundaries", () => {
    expect(carbonConfidenceTier(1)).toBe("high");
    expect(carbonConfidenceTier(0.7)).toBe("high");
    expect(carbonConfidenceTier(0.69)).toBe("partial");
    expect(carbonConfidenceTier(0.3)).toBe("partial");
    expect(carbonConfidenceTier(0.29)).toBe("low");
    expect(carbonConfidenceTier(0.01)).toBe("low");
  });

  it("treats non-positive or invalid coverage as low confidence", () => {
    expect(carbonConfidenceTier(0)).toBe("low");
    expect(carbonConfidenceTier(-0.5)).toBe("low");
    expect(carbonConfidenceTier(Number.NaN)).toBe("low");
    expect(carbonConfidenceTier(Infinity)).toBe("low"); // non-finite → low (guard)
  });
});
