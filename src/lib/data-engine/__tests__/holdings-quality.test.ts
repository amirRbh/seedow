import { describe, it, expect } from "vitest";
import { runHoldingsQualityChecks } from "../holdings-quality";
import type { ParsedHolding } from "../holdings";

const h = (o: Partial<ParsedHolding> & { name: string }): ParsedHolding => ({
  ticker: null,
  sector: null,
  country: null,
  isin: null,
  weightPct: 10,
  ...o,
});

const base = {
  asOf: "2026-07-31",
  sourceId: "src-1",
  sourceUrl: "https://issuer.example/holdings.csv",
};

describe("runHoldingsQualityChecks", () => {
  it("passes a clean partial-coverage lot as valid", () => {
    const r = runHoldingsQualityChecks({
      ...base,
      holdings: [
        h({ name: "A", isin: "US0378331005", weightPct: 30 }),
        h({ name: "B", weightPct: 20 }),
      ],
    });
    expect(r.status).toBe("valid");
    expect(r.issues).toHaveLength(0);
    expect(r.weightSumPct).toBeCloseTo(50, 6);
    expect(r.isinCoveredShare).toBeCloseTo(0.5, 6);
  });

  it("rejects impossible weights", () => {
    const r = runHoldingsQualityChecks({ ...base, holdings: [h({ name: "A", weightPct: 140 })] });
    expect(r.status).toBe("rejected");
    expect(r.issues.some((i) => i.kind === "impossible_weight")).toBe(true);
  });

  it("rejects a weight sum above 100 + tolerance", () => {
    const r = runHoldingsQualityChecks({
      ...base,
      holdings: [h({ name: "A", weightPct: 60 }), h({ name: "B", weightPct: 60 })],
    });
    expect(r.status).toBe("rejected");
    expect(r.issues.some((i) => i.kind === "sum_out_of_range")).toBe(true);
  });

  it("flags duplicates as review_required", () => {
    const r = runHoldingsQualityChecks({
      ...base,
      holdings: [h({ name: "Apple", weightPct: 10 }), h({ name: "Apple", weightPct: 10 })],
    });
    expect(r.status).toBe("review_required");
    expect(r.issues.some((i) => i.kind === "duplicate_security")).toBe(true);
  });

  it("flags an incoherent ISIN as review_required", () => {
    const r = runHoldingsQualityChecks({
      ...base,
      // Apple's ISIN with a deliberately wrong check digit (6 instead of 5).
      holdings: [h({ name: "A", isin: "US0378331006", weightPct: 10 })],
    });
    expect(r.status).toBe("review_required");
    expect(r.issues.some((i) => i.kind === "incoherent_isin")).toBe(true);
  });

  it("rejects when the reference date is missing", () => {
    const r = runHoldingsQualityChecks({ ...base, asOf: null, holdings: [h({ name: "A" })] });
    expect(r.status).toBe("rejected");
    expect(r.issues.some((i) => i.kind === "missing_as_of")).toBe(true);
  });

  it("rejects when no source is provided", () => {
    const r = runHoldingsQualityChecks({
      asOf: "2026-07-31",
      sourceId: null,
      sourceUrl: null,
      holdings: [h({ name: "A" })],
    });
    expect(r.status).toBe("rejected");
    expect(r.issues.some((i) => i.kind === "missing_source")).toBe(true);
  });
});
