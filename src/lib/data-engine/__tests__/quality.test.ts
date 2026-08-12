import { describe, expect, it } from "vitest";
import { computeDataQuality, summarizeSourceHealth, type FundQualitySummary } from "../quality";

const NOW = new Date("2026-08-12T00:00:00Z");

function fund(over: Partial<FundQualitySummary>): FundQualitySummary {
  return {
    id: "f",
    isin: "IE00B4L5Y983",
    ticker: "IWDA",
    completeness: 90,
    holdingsCount: 100,
    hasSource: true,
    lastUpdated: "2026-08-01T00:00:00Z",
    ...over,
  };
}

describe("computeDataQuality", () => {
  it("classe healthy vs needs-update (complétude + fraîcheur)", () => {
    const r = computeDataQuality(
      [
        fund({ id: "a" }), // frais + complet → healthy
        fund({ id: "b", completeness: 40 }), // complétude faible → needsUpdate
        fund({ id: "c", lastUpdated: "2026-01-01T00:00:00Z" }), // périmé → needsUpdate
      ],
      { now: NOW, staleDays: 30, healthyMinCompleteness: 80 },
    );
    expect(r.fundsTracked).toBe(3);
    expect(r.healthy).toBe(1);
    expect(r.needsUpdate).toBe(2);
  });

  it("détecte ISIN invalides, sans holdings, sans source (§21)", () => {
    const r = computeDataQuality(
      [
        fund({ id: "a", isin: "IE00B4L5Y984" }), // check digit faux
        fund({ id: "b", holdingsCount: 0 }),
        fund({ id: "c", hasSource: false }),
        fund({ id: "d", isin: null }), // null ≠ invalide
      ],
      { now: NOW },
    );
    expect(r.invalidIsinFundIds).toEqual(["a"]);
    expect(r.fundsWithoutHoldings).toBe(1);
    expect(r.fundsWithoutSource).toBe(1);
  });

  it("repère les doublons d'ISIN et de ticker", () => {
    const r = computeDataQuality(
      [
        fund({ id: "a", isin: "IE00B4L5Y983", ticker: "IWDA" }),
        fund({ id: "b", isin: "IE00B4L5Y983", ticker: "CW8" }),
        fund({ id: "c", isin: "FR0000131104", ticker: "CW8" }),
      ],
      { now: NOW },
    );
    expect(r.duplicateIsin["IE00B4L5Y983"]).toEqual(["a", "b"]);
    expect(r.duplicateTicker["CW8"]).toEqual(["b", "c"]);
  });

  it("univers vide → tout à zéro", () => {
    const r = computeDataQuality([], { now: NOW });
    expect(r.fundsTracked).toBe(0);
    expect(r.healthy).toBe(0);
    expect(r.invalidIsinFundIds).toHaveLength(0);
  });
});

describe("summarizeSourceHealth", () => {
  it("compte les sources par état", () => {
    const c = summarizeSourceHealth([
      { key: "amf", health: "healthy", lastCheckedAt: null },
      { key: "ishares", health: "healthy", lastCheckedAt: null },
      { key: "vanguard", health: "degraded", lastCheckedAt: null },
      { key: "x", health: "broken", lastCheckedAt: null },
    ]);
    expect(c).toEqual({ healthy: 2, degraded: 1, broken: 1, unknown: 0 });
  });
});
