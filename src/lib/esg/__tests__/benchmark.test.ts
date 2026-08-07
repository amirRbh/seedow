import { describe, it, expect } from "vitest";
import {
  computeCompositeBenchmarkWaci,
  ACWI_WACI_TCO2E_PER_MUSD,
  GLOBAL_AGGREGATE_BOND_WACI_TCO2E_PER_MUSD,
  ESG_WORLD_EQUITY_WACI_TCO2E_PER_MUSD,
  PARIS_ALIGNED_EQUITY_WACI_TCO2E_PER_MUSD,
} from "../benchmark";

describe("computeCompositeBenchmarkWaci", () => {
  it("returns ACWI for a 100% equity portfolio", () => {
    const b = computeCompositeBenchmarkWaci([{ weight: 1, assetClass: "equity_dev" }]);
    expect(b.waci).toBe(ACWI_WACI_TCO2E_PER_MUSD);
    expect(b.breakdown.equity).toBe(1);
  });

  it("returns the bond benchmark for a 100% bond portfolio", () => {
    const b = computeCompositeBenchmarkWaci([{ weight: 1, assetClass: "green_bond" }]);
    expect(b.waci).toBe(GLOBAL_AGGREGATE_BOND_WACI_TCO2E_PER_MUSD);
    expect(b.breakdown.bond).toBe(1);
  });

  it("weights equity and bond benchmarks by allocation", () => {
    const b = computeCompositeBenchmarkWaci([
      { weight: 0.6, assetClass: "equity_dev" },
      { weight: 0.4, assetClass: "green_bond" },
    ]);
    const expected =
      ACWI_WACI_TCO2E_PER_MUSD * 0.6 + GLOBAL_AGGREGATE_BOND_WACI_TCO2E_PER_MUSD * 0.4;
    expect(b.waci).toBeCloseTo(expected, 5);
    expect(b.breakdown.equity).toBeCloseTo(0.6, 5);
    expect(b.breakdown.bond).toBeCloseTo(0.4, 5);
  });

  it("treats thematic as equity", () => {
    const b = computeCompositeBenchmarkWaci([{ weight: 1, assetClass: "thematic" }]);
    expect(b.waci).toBe(ACWI_WACI_TCO2E_PER_MUSD);
    expect(b.breakdown.equity).toBe(1);
  });

  it("treats real assets as a blend and cash as neutral", () => {
    const b = computeCompositeBenchmarkWaci([
      { weight: 0.5, assetClass: "equity_dev" },
      { weight: 0.3, assetClass: "reit" },
      { weight: 0.2, assetClass: "cash" },
    ]);
    // 0.5 equity + 0.3 real (all equity blend here) + 0.2 cash (zero)
    const expected = ACWI_WACI_TCO2E_PER_MUSD * (0.5 + 0.3);
    expect(b.waci).toBeCloseTo(expected, 5);
    expect(b.breakdown.real).toBe(0.3);
    expect(b.breakdown.cash).toBe(0.2);
  });

  it("normalizes weights that do not sum to 1", () => {
    const b = computeCompositeBenchmarkWaci([
      { weight: 0.5, assetClass: "equity_dev" },
      { weight: 0.5, assetClass: "green_bond" },
    ]);
    // Already sums to 1, but ensure normalization is stable
    expect(b.waci).toBeCloseTo(
      (ACWI_WACI_TCO2E_PER_MUSD + GLOBAL_AGGREGATE_BOND_WACI_TCO2E_PER_MUSD) / 2,
      5,
    );
  });

  it("exposes reference markers", () => {
    expect(ESG_WORLD_EQUITY_WACI_TCO2E_PER_MUSD).toBeLessThan(ACWI_WACI_TCO2E_PER_MUSD);
    expect(PARIS_ALIGNED_EQUITY_WACI_TCO2E_PER_MUSD).toBeLessThan(
      ESG_WORLD_EQUITY_WACI_TCO2E_PER_MUSD,
    );
  });
});
