import { describe, expect, it } from "vitest";
import { computeFundCompleteness, type CompletenessInput } from "../completeness";

const full: CompletenessInput = {
  hasIsin: true,
  hasName: true,
  hasIssuer: true,
  hasDomicile: true,
  hasCurrency: true,
  hasTer: true,
  holdingsCount: 500,
  holdingsAsOf: "2026-07-31",
  hasSfdrArticle: true,
  hasKidOrProspectus: true,
  hasEsgScore: true,
  hasCarbon: true,
  hasControversyData: true,
};

describe("completeness", () => {
  it("fonds complet → 100", () => {
    const r = computeFundCompleteness(full);
    expect(r.score).toBe(100);
    expect(r.missing).toHaveLength(0);
  });

  it("fonds vide → 0 et liste tous les manques", () => {
    const empty: CompletenessInput = {
      hasIsin: false,
      hasName: false,
      hasIssuer: false,
      hasDomicile: false,
      hasCurrency: false,
      hasTer: false,
      holdingsCount: 0,
      holdingsAsOf: null,
      hasSfdrArticle: false,
      hasKidOrProspectus: false,
      hasEsgScore: false,
      hasCarbon: false,
      hasControversyData: false,
    };
    const r = computeFundCompleteness(empty);
    expect(r.score).toBe(0);
    expect(r.missing).toContain("isin");
    expect(r.missing).toContain("holdings");
  });

  it("holdings sans date → catégorie holdings à 50%", () => {
    const r = computeFundCompleteness({ ...full, holdingsAsOf: null });
    expect(r.categories.holdings).toBe(50);
    expect(r.missing).toContain("holdings_as_of");
    expect(r.score).toBeLessThan(100);
  });

  it("score reste dans 0..100 quel que soit l'input", () => {
    const r = computeFundCompleteness({ ...full, hasCarbon: false, hasControversyData: false });
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
    expect(r.categories.impact).toBe(50);
  });
});
