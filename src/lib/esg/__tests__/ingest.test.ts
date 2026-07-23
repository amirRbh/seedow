import { describe, it, expect } from "vitest";
import { buildAssetUpdate, type IngestRow } from "../ingest.functions";

const base: IngestRow = {
  ticker: "ESGU",
  esg_score_source: "MSCI ESG Fund Ratings (iShares fact sheet)",
  esg_data_asof: "2026-04-17",
};

describe("buildAssetUpdate", () => {
  it("always writes provenance (source + as-of date)", () => {
    const u = buildAssetUpdate(base);
    expect(u.esg_score_source).toBe(base.esg_score_source);
    expect(u.esg_data_asof).toBe("2026-04-17");
  });

  it("only writes fields that are provided (partial update)", () => {
    const u = buildAssetUpdate(base);
    expect("esg_score" in u).toBe(false);
    expect("waci_tco2e_per_musd_sales" in u).toBe(false);
    expect("implied_temp_rise" in u).toBe(false);
  });

  it("derives carbon provenance/date from the ingestion when WACI is provided", () => {
    const u = buildAssetUpdate({ ...base, waci_tco2e_per_musd_sales: 69.03 });
    expect(u.waci_tco2e_per_musd_sales).toBe(69.03);
    expect(u.carbon_intensity_source).toBe(base.esg_score_source);
    expect(u.carbon_intensity_updated_at).toBe("2026-04-17T00:00:00Z");
  });

  it("passes through the full set of metrics when all provided", () => {
    const u = buildAssetUpdate({
      ...base,
      esg_score: 70.7,
      msci_esg_quality_score: 7.07,
      implied_temp_rise: ">2.5-3.0°C",
      sfdr_article: 8,
    });
    expect(u.esg_score).toBe(70.7);
    expect(u.msci_esg_quality_score).toBe(7.07);
    expect(u.implied_temp_rise).toBe(">2.5-3.0°C");
    expect(u.sfdr_article).toBe(8);
  });
});
