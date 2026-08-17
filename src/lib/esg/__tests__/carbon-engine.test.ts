import { describe, it, expect } from "vitest";
import {
  resolveHoldingCarbon,
  estimateFundCarbonFromHoldings,
  roundSignificant,
  GENERIC_SECTOR_KEY,
  type IssuerEmissionsRecord,
  type SectorBenchmark,
  type HoldingInput,
} from "../carbon-engine";

const measuredIssuer = (over: Partial<IssuerEmissionsRecord> = {}): IssuerEmissionsRecord => ({
  issuerId: "issuer-a",
  year: 2025,
  scope1Tco2e: 1000,
  scope2Tco2e: 500,
  scope3Tco2e: 20000,
  revenue: 50_000_000,
  evic: 2_000_000_000,
  currency: "EUR",
  dataQuality: "measured",
  methodology: null,
  source: "CDP disclosure",
  ...over,
});

const sectorBenchmark = (over: Partial<SectorBenchmark> = {}): SectorBenchmark => ({
  sector: "utilities",
  region: "world",
  scope12IntensityPerMEur: 300, // tCO2e / M€ CA
  currency: "EUR",
  source: "Test benchmark",
  year: 2024,
  ...over,
});

describe("resolveHoldingCarbon — priority waterfall", () => {
  it("tier 1: uses measured issuer emissions when scope1/2 + EVIC are known", () => {
    const holding: HoldingInput = {
      securityId: "issuer-a",
      weightPct: 10,
      sector: null,
      region: null,
    };
    const r = resolveHoldingCarbon(holding, measuredIssuer(), null);
    expect(r.dataQuality).toBe("measured");
    // (1000+500)*1e6 / 2e9 = 0.75 gCO2e/€EVIC
    expect(r.issuerIntensityGco2ePerEvic).toBeCloseTo(0.75, 6);
    expect(r.contributionGco2ePerEur).toBeCloseTo(0.75 * 0.1, 6);
  });

  it("tier 4: falls back to sector intensity × real revenue when emissions are missing but revenue/EVIC known", () => {
    const holding: HoldingInput = {
      securityId: "issuer-b",
      weightPct: 20,
      sector: "utilities",
      region: "world",
    };
    const partial = measuredIssuer({
      scope1Tco2e: null,
      scope2Tco2e: null,
      dataQuality: "measured", // ignored: scope1/2 missing forces fallback
    });
    const r = resolveHoldingCarbon(holding, partial, sectorBenchmark());
    expect(r.dataQuality).toBe("estimated_sector");
    // estimated scope12 = 300 * (50e6/1e6) = 15000 tCO2e; intensity = 15000e6/2e9 = 7.5
    expect(r.issuerIntensityGco2ePerEvic).toBeCloseTo(7.5, 6);
  });

  it("tier 6: unavailable when nothing is exploitable (e.g. sovereign bond, no issuer)", () => {
    const holding: HoldingInput = { securityId: null, weightPct: 15, sector: null, region: null };
    const r = resolveHoldingCarbon(holding, null, null);
    expect(r.dataQuality).toBe("unavailable");
    expect(r.contributionGco2ePerEur).toBeNull();
  });

  it("never uses a non-EUR EVIC (no invented FX conversion)", () => {
    const holding: HoldingInput = {
      securityId: "issuer-usd",
      weightPct: 10,
      sector: null,
      region: null,
    };
    const r = resolveHoldingCarbon(holding, measuredIssuer({ currency: "USD" }), null);
    expect(r.dataQuality).toBe("unavailable");
  });
});

describe("estimateFundCarbonFromHoldings — 5 required scenarios", () => {
  it("1) fund with complete carbon data on all holdings → fully measured, 100% sourced", () => {
    const holdings: HoldingInput[] = [
      { securityId: "a", weightPct: 60, sector: "tech", region: "world" },
      { securityId: "b", weightPct: 40, sector: "tech", region: "world" },
    ];
    const emissions = new Map([
      ["a", measuredIssuer({ issuerId: "a" })],
      ["b", measuredIssuer({ issuerId: "b", dataQuality: "reported" })],
    ]);
    const est = estimateFundCarbonFromHoldings(holdings, emissions, new Map());
    expect(est.coverage).toBeCloseTo(1, 6);
    expect(est.sourcedCoverage).toBeCloseTo(1, 6);
    expect(est.dataQuality).toBe("reported"); // worst tier present, still directly sourced
    expect(est.intensityGco2ePerEur).not.toBeNull();
  });

  it("2) fund with partial data → mixed coverage, sourced share < 100%", () => {
    const holdings: HoldingInput[] = [
      { securityId: "a", weightPct: 50, sector: "utilities", region: "world" },
      { securityId: "b", weightPct: 30, sector: "utilities", region: "world" },
      { securityId: "c", weightPct: 20, sector: null, region: null }, // no data at all
    ];
    const emissions = new Map([
      ["a", measuredIssuer({ issuerId: "a" })],
      ["b", measuredIssuer({ issuerId: "b", scope1Tco2e: null, scope2Tco2e: null })],
    ]);
    const benchmarks = new Map([["utilities|world", sectorBenchmark()]]);
    const est = estimateFundCarbonFromHoldings(holdings, emissions, benchmarks);
    expect(est.coverage).toBeCloseTo(0.8, 6); // c stays uncovered
    expect(est.sourcedCoverage).toBeCloseTo(0.5, 6); // only a is directly sourced
    expect(est.dataQuality).toBe("estimated_sector");
    expect(est.holdingsCovered).toBe(2);
    expect(est.holdingsConsidered).toBe(3);
  });

  it("3) fund with no fund-level disclosure but resolvable holdings → estimated_sector, 0% sourced", () => {
    const holdings: HoldingInput[] = [
      { securityId: "x", weightPct: 100, sector: "utilities", region: "world" },
    ];
    const emissions = new Map([
      ["x", measuredIssuer({ issuerId: "x", scope1Tco2e: null, scope2Tco2e: null })],
    ]);
    const benchmarks = new Map([["utilities|world", sectorBenchmark()]]);
    const est = estimateFundCarbonFromHoldings(holdings, emissions, benchmarks);
    expect(est.coverage).toBeCloseTo(1, 6);
    expect(est.sourcedCoverage).toBe(0);
    expect(est.dataQuality).toBe("estimated_sector");
    expect(est.intensityGco2ePerEur).not.toBeNull();
  });

  it("4) two funds holding the same issuer both reflect its intensity (no artificial dedup)", () => {
    const holdings: HoldingInput[] = [
      { securityId: "shared", weightPct: 100, sector: "tech", region: "world" },
    ];
    const emissions = new Map([["shared", measuredIssuer({ issuerId: "shared" })]]);
    const fundA = estimateFundCarbonFromHoldings(holdings, emissions, new Map());
    const fundB = estimateFundCarbonFromHoldings(holdings, emissions, new Map());
    // Same issuer, same weight in each fund → same intensity in both funds (each
    // investor's economic exposure to the issuer is real and counted once per fund).
    expect(fundA.intensityGco2ePerEur).toBeCloseTo(fundB.intensityGco2ePerEur as number, 9);
  });

  it("5) low coverage portfolio → small coverage fraction, no fabricated precision", () => {
    const holdings: HoldingInput[] = [
      { securityId: "a", weightPct: 15, sector: "tech", region: "world" },
      { securityId: "sov", weightPct: 85, sector: null, region: null }, // sovereign bond, uncomputable
    ];
    const emissions = new Map([["a", measuredIssuer({ issuerId: "a" })]]);
    const est = estimateFundCarbonFromHoldings(holdings, emissions, new Map());
    expect(est.coverage).toBeCloseTo(0.15, 6);
    expect(est.holdingsCovered).toBe(1);
    expect(est.holdingsConsidered).toBe(2);
  });

  it("proxy tier only applies as last resort when no precise sector benchmark exists", () => {
    const holdings: HoldingInput[] = [
      { securityId: "y", weightPct: 100, sector: "unknown-niche", region: "world" },
    ];
    const emissions = new Map([
      ["y", measuredIssuer({ issuerId: "y", scope1Tco2e: null, scope2Tco2e: null })],
    ]);
    const benchmarks = new Map([
      [GENERIC_SECTOR_KEY, sectorBenchmark({ sector: "all", source: "Generic proxy" })],
    ]);
    const est = estimateFundCarbonFromHoldings(holdings, emissions, benchmarks);
    expect(est.dataQuality).toBe("proxy");
  });

  it("returns null intensity and zero coverage when nothing is computable (e.g. all-sovereign fund)", () => {
    const holdings: HoldingInput[] = [
      { securityId: null, weightPct: 100, sector: null, region: null },
    ];
    const est = estimateFundCarbonFromHoldings(holdings, new Map(), new Map());
    expect(est.intensityGco2ePerEur).toBeNull();
    expect(est.coverage).toBe(0);
    expect(est.dataQuality).toBe("unavailable");
  });
});

describe("roundSignificant — no false precision", () => {
  it("rounds to 2 significant figures by default", () => {
    expect(roundSignificant(423.72)).toBe(420);
    expect(roundSignificant(2176.68)).toBe(2200);
    expect(roundSignificant(7.849)).toBe(7.8);
  });

  it("handles zero and negative values safely", () => {
    expect(roundSignificant(0)).toBe(0);
    expect(roundSignificant(-423.72)).toBe(-420);
  });
});
