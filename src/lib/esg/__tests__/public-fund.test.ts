import { describe, expect, it } from "vitest";
import { mapPublicFundRow, type PublicFundRow } from "../public-fund";

function row(over: Partial<PublicFundRow>): PublicFundRow {
  return {
    ticker: "TCK",
    name: "Fonds Test",
    issuer: "Issuer",
    isin: "FR0000000000",
    asset_class: "equity_dev",
    esg_score: 75,
    env_score: 80,
    social_score: 70,
    governance_score: 72,
    ter: 0.002,
    carbon_intensity_gco2e_per_eur: 10,
    implied_temp_rise: "1.5°C",
    sfdr_article: 8,
    excluded_sectors: ["fossiles"],
    cause_exposure: { climat: 0.3, biodiversite: 0.05 },
    esg_score_source: "msci",
    esg_data_asof: "2026-06-01",
    ...over,
  };
}

describe("mapPublicFundRow", () => {
  it("mappe les scores 0-100 en 0-10 et convertit TER", () => {
    const f = mapPublicFundRow(row({}));
    expect(f.esg).toBeCloseTo(7.5, 5);
    expect(f.climate).toBeCloseTo(8, 5);
    expect(f.ter).toBeCloseTo(0.002, 5);
    expect(f.sfdr_article).toBe(8);
  });

  it("ne garde que les thèmes déclarés ≥ 8 %, triés desc", () => {
    const f = mapPublicFundRow(row({}));
    expect(f.themes).toEqual([{ tag: "climat", pct: 30 }]); // biodiversite=5% exclu
  });

  it("propage la source et la date, jamais inventées", () => {
    const f = mapPublicFundRow(row({ esg_score_source: null, esg_data_asof: null }));
    expect(f.source).toBeNull();
    expect(f.data_asof).toBeNull();
  });

  it("expose le risque de greenwashing calculé (transparency.ts)", () => {
    const f = mapPublicFundRow(row({}));
    expect(["low", "medium", "high"]).toContain(f.greenwashing_risk);
    expect(Array.isArray(f.greenwashing_reasons)).toBe(true);
  });
});
