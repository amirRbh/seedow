import { describe, it, expect } from "vitest";
import {
  securityKey,
  latestHoldingsByAsset,
  fundHoldingsToOverlapMap,
  fundHoldingsToCarbonInputs,
  type FundHoldingRecord,
} from "../holdings-adapter";
import { portfolioOverlap } from "../overlap";

const rec = (o: Partial<FundHoldingRecord> & { asset_id: string; security_name: string }): FundHoldingRecord => ({
  security_isin: null,
  weight_pct: 1,
  as_of: "2026-07-31",
  ...o,
});

describe("securityKey", () => {
  it("prefers a valid canonical ISIN over the name", () => {
    // Apple US0378331005 is a valid ISIN (checksum ok).
    expect(securityKey({ security_isin: "US0378331005", security_name: "Apple Inc" })).toBe(
      "US0378331005",
    );
  });
  it("falls back to normalized name when ISIN missing/invalid", () => {
    expect(securityKey({ security_isin: null, security_name: "Apple  Inc" })).toBe("name:apple inc");
    expect(securityKey({ security_isin: "NOT-AN-ISIN", security_name: "Apple Inc" })).toBe(
      "name:apple inc",
    );
  });
});

describe("latestHoldingsByAsset", () => {
  it("keeps only the most recent as_of per fund", () => {
    const rows = [
      rec({ asset_id: "f1", security_name: "A", as_of: "2026-06-30" }),
      rec({ asset_id: "f1", security_name: "B", as_of: "2026-07-31" }),
    ];
    const latest = latestHoldingsByAsset(rows);
    expect(latest.get("f1")!.map((r) => r.security_name)).toEqual(["B"]);
  });
});

describe("fundHoldingsToOverlapMap → overlap.ts", () => {
  it("two funds holding the same ISIN produce full overlap", () => {
    const rows: FundHoldingRecord[] = [
      rec({ asset_id: "fA", security_isin: "US0378331005", security_name: "Apple", weight_pct: 100 }),
      rec({ asset_id: "fB", security_isin: "US0378331005", security_name: "Apple Inc.", weight_pct: 100 }),
    ];
    const map = fundHoldingsToOverlapMap(rows);
    const { overlap } = portfolioOverlap({ fA: 0.5, fB: 0.5 }, map);
    expect(overlap).toBeCloseTo(1, 12); // same underlying via ISIN, despite different labels
  });

  it("converts weight_pct to fractions and sums duplicates within a fund", () => {
    const rows: FundHoldingRecord[] = [
      rec({ asset_id: "f", security_isin: "US0378331005", security_name: "Apple", weight_pct: 30 }),
      rec({ asset_id: "f", security_isin: "US0378331005", security_name: "Apple", weight_pct: 10 }),
    ];
    const hw = fundHoldingsToOverlapMap(rows).get("f")!;
    expect(hw.get("US0378331005")).toBeCloseTo(0.4, 12);
  });

  it("ignores lines without a usable positive weight (never invented)", () => {
    const rows: FundHoldingRecord[] = [
      rec({ asset_id: "f", security_name: "A", weight_pct: null }),
      rec({ asset_id: "f", security_name: "B", weight_pct: 0 }),
    ];
    expect(fundHoldingsToOverlapMap(rows).has("f")).toBe(false);
  });
});

describe("fundHoldingsToCarbonInputs", () => {
  it("maps latest holdings to carbon HoldingInput (securityId from id or ISIN)", () => {
    const rows: FundHoldingRecord[] = [
      rec({ asset_id: "f", security_id: "uuid-1", security_name: "A", weight_pct: 60, sector: "Tech", region: "us" }),
      rec({ asset_id: "f", security_isin: "US0378331005", security_name: "Apple", weight_pct: 40 }),
    ];
    const inputs = fundHoldingsToCarbonInputs(rows, "f");
    expect(inputs).toHaveLength(2);
    expect(inputs[0]).toMatchObject({ securityId: "uuid-1", weightPct: 60, sector: "Tech", region: "us" });
    expect(inputs[1]).toMatchObject({ securityId: "US0378331005", weightPct: 40 });
  });
});
