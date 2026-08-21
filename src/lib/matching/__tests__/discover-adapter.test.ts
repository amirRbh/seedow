import { describe, expect, it } from "vitest";
import { discoverAssetToMatchInput } from "../discover-adapter";
import type { DiscoverAsset } from "@/lib/discover/types";

const base = {
  id: "x",
  ticker: "XYZ",
  name: "Fonds test",
  asset_class: "equity_dev",
  category: "Actions monde développé",
  region: "world",
  description: "",
  issuer: null,
  currency: "EUR",
  current_price: 10,
  quote_fetched_at: null,
  overall_esg_score: 7,
  climate_score: 6,
  social_score: 5,
  governance_score: 8,
  ter_pct: 0.2,
  risk_level: 4,
  co2_factor_per_1k_eur: null,
  waci_tco2e_per_musd_sales: 55,
  sfdr_article: 8,
  exclusions: [],
  tags: [],
  themes: [],
  data_coverage: "partial",
  greenwashing_risk: "low",
  greenwashing_reasons: [],
  sustainability_tier: "broad_esg",
} as unknown as DiscoverAsset;

describe("discoverAssetToMatchInput", () => {
  it("mappe les champs pertinents et n'invente jamais de controverse", () => {
    const m = discoverAssetToMatchInput(base);
    expect(m).toEqual({
      id: "x",
      terPct: 0.2,
      riskLevel: 4,
      waci: 55,
      climateScore: 6,
      esgScore: 7,
      controversyBand: null,
      dataCoverage: "partial",
    });
  });

  it("propage les nulls (couverture nulle honnête en aval)", () => {
    const m = discoverAssetToMatchInput({
      ...base,
      ter_pct: null as never,
      waci_tco2e_per_musd_sales: null,
      data_coverage: null as never,
    });
    expect(m.terPct).toBeNull();
    expect(m.waci).toBeNull();
    expect(m.dataCoverage).toBeNull();
  });
});
