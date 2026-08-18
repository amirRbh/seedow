import { describe, expect, it } from "vitest";
import {
  mapCarbonEstimateRow,
  mapPublicFundRow,
  type CarbonEstimateRow,
  type PublicFundRow,
} from "../public-fund";

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
    waci_tco2e_per_musd_sales: 50,
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

  it("expose le score Seedow propriétaire et le tier (sustainability-classification.ts)", () => {
    const f = mapPublicFundRow(row({}));
    expect(f.seedow_score).not.toBeNull();
    expect(f.seedow_score!).toBeGreaterThanOrEqual(0);
    expect(f.seedow_score!).toBeLessThanOrEqual(100);
    expect(["paris_aligned", "transition", "broad_esg", "insufficient_evidence"]).toContain(
      f.sustainability_tier,
    );
  });

  it("le score Seedow ignore l'article SFDR", () => {
    const withSfdr = mapPublicFundRow(row({ sfdr_article: 9 })).seedow_score;
    const withoutSfdr = mapPublicFundRow(row({ sfdr_article: null })).seedow_score;
    expect(withoutSfdr).toBe(withSfdr);
  });

  it("has_pillar_scores=true seulement si les 3 piliers viennent de la source", () => {
    expect(mapPublicFundRow(row({})).has_pillar_scores).toBe(true);
    // un seul pilier manquant → le détail par pilier n'est pas réel (§1.3)
    expect(mapPublicFundRow(row({ env_score: null })).has_pillar_scores).toBe(false);
    expect(mapPublicFundRow(row({ social_score: null })).has_pillar_scores).toBe(false);
    expect(mapPublicFundRow(row({ governance_score: null })).has_pillar_scores).toBe(false);
  });

  it("carbon_trace est null quand aucune estimation n'est fournie", () => {
    expect(mapPublicFundRow(row({})).carbon_trace).toBeNull();
    expect(mapPublicFundRow(row({}), null).carbon_trace).toBeNull();
  });

  it("carbon_trace reprend l'estimation carbone sans rien inventer", () => {
    const est: CarbonEstimateRow = {
      intensity_gco2e_per_eur: "123.4",
      coverage: "0.82",
      sourced_coverage: "0.55",
      data_quality: "estimated_sector",
      methodology: "Estimation Seedow (PCAF) sur 82% du fonds.",
      holdings_considered: 40,
      holdings_covered: 33,
      as_of: "2026-08-01",
    };
    const trace = mapPublicFundRow(row({}), est).carbon_trace;
    expect(trace).not.toBeNull();
    expect(trace!.intensityGco2ePerEur).toBeCloseTo(123.4, 5);
    expect(trace!.coverage).toBeCloseTo(0.82, 5);
    expect(trace!.sourcedCoverage).toBeCloseTo(0.55, 5);
    expect(trace!.dataQuality).toBe("estimated_sector");
    expect(trace!.holdingsCovered).toBe(33);
    expect(trace!.asOf).toBe("2026-08-01");
  });
});

describe("mapCarbonEstimateRow", () => {
  it("renvoie null pour une entrée absente", () => {
    expect(mapCarbonEstimateRow(null)).toBeNull();
    expect(mapCarbonEstimateRow(undefined)).toBeNull();
  });

  it("laisse intensityGco2ePerEur à null quand la couverture est nulle", () => {
    const trace = mapCarbonEstimateRow({
      intensity_gco2e_per_eur: null,
      coverage: 0,
      sourced_coverage: 0,
      data_quality: "unavailable",
      methodology: "Couverture nulle.",
      holdings_considered: 12,
      holdings_covered: 0,
      as_of: null,
    });
    expect(trace).not.toBeNull();
    expect(trace!.intensityGco2ePerEur).toBeNull();
    expect(trace!.coverage).toBe(0);
    expect(trace!.dataQuality).toBe("unavailable");
  });
});
