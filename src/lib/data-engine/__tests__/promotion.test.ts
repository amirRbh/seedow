import { describe, it, expect } from "vitest";
import {
  mapEtfCategoryToAssetClass,
  isPromotableEtf,
  buildPromotedAsset,
  computePromotionReport,
  DELIBERATELY_EXCLUDED_CATEGORIES,
  type CatalogInstrumentRow,
} from "../promotion";

function row(over: Partial<CatalogInstrumentRow>): CatalogInstrumentRow {
  return {
    listing_key: "XETRA::EUNL",
    ticker: "EUNL",
    exchange: "XETRA",
    name: "iShares Core MSCI World UCITS ETF",
    asset_type: "etf",
    etf_category: "Equity",
    country: "Germany",
    isin: "IE00B4L5Y983",
    ...over,
  };
}

describe("mapEtfCategoryToAssetClass", () => {
  it("maps the confident Adanos categories", () => {
    expect(mapEtfCategoryToAssetClass("Equity")).toBe("equity_dev");
    expect(mapEtfCategoryToAssetClass("Real Estate")).toBe("reit");
    expect(mapEtfCategoryToAssetClass("Commodity")).toBe("commodity");
    expect(mapEtfCategoryToAssetClass("Money Market")).toBe("cash");
  });

  it("returns null for categories we refuse to invent (Fixed Income & co.)", () => {
    // Le moteur n'a pas de classe « obligation » générique : ne jamais deviner
    // souverain/corporate/green/social.
    expect(mapEtfCategoryToAssetClass("Fixed Income")).toBeNull();
    expect(mapEtfCategoryToAssetClass("Alternative")).toBeNull();
    expect(mapEtfCategoryToAssetClass("Other")).toBeNull();
    expect(mapEtfCategoryToAssetClass("Multi-Asset")).toBeNull();
    expect(mapEtfCategoryToAssetClass("Currency")).toBeNull();
  });

  it("returns null for the deliberately excluded categories", () => {
    expect(mapEtfCategoryToAssetClass("Leveraged/Inverse")).toBeNull();
    expect(mapEtfCategoryToAssetClass("Volatility")).toBeNull();
    expect(DELIBERATELY_EXCLUDED_CATEGORIES.has("leveraged/inverse")).toBe(true);
  });

  it("is case-insensitive and null-safe", () => {
    expect(mapEtfCategoryToAssetClass("equity")).toBe("equity_dev");
    expect(mapEtfCategoryToAssetClass("  REAL ESTATE ")).toBe("reit");
    expect(mapEtfCategoryToAssetClass(null)).toBeNull();
    expect(mapEtfCategoryToAssetClass("")).toBeNull();
  });
});

describe("isPromotableEtf", () => {
  it("requires etf + isin + mappable category", () => {
    expect(isPromotableEtf(row({}))).toBe(true);
    expect(isPromotableEtf(row({ asset_type: "stock" }))).toBe(false); // jamais d'actions
    expect(isPromotableEtf(row({ isin: null }))).toBe(false); // clé moteur = ISIN
    expect(isPromotableEtf(row({ etf_category: "Fixed Income" }))).toBe(false); // non mappable
    expect(isPromotableEtf(row({ etf_category: "Leveraged/Inverse" }))).toBe(false); // exclu
  });
});

describe("buildPromotedAsset", () => {
  it("builds a dormant, traceable placeholder (is_active false, no invented fields)", () => {
    const a = buildPromotedAsset(row({}), "equity_dev", "EUNL");
    expect(a).toMatchObject({
      ticker: "EUNL",
      isin: "IE00B4L5Y983",
      asset_class: "equity_dev",
      issuer: null,
      region: null,
      is_active: false,
      catalog_listing_key: "XETRA::EUNL",
    });
    expect(a.description).toContain("Catalogue Adanos");
    expect(a.description).toContain("Germany");
  });

  it("throws if asked to promote a row without ISIN (never silently invents)", () => {
    expect(() => buildPromotedAsset(row({ isin: null }), "equity_dev", "X")).toThrow();
  });
});

describe("computePromotionReport", () => {
  it("splits etf rows into promotable / unmapped / excluded / no-isin", () => {
    const rows = [
      row({ listing_key: "A::1", isin: "IE00B4L5Y983", etf_category: "Equity" }),
      row({ listing_key: "A::2", isin: "LU0908500753", etf_category: "Real Estate" }),
      row({ listing_key: "A::3", isin: null, etf_category: "Commodity" }), // mappable mais no isin
      row({ listing_key: "A::4", isin: "X", etf_category: "Fixed Income" }), // non mappable
      row({ listing_key: "A::5", isin: "Y", etf_category: "Leveraged/Inverse" }), // exclu
      row({ listing_key: "A::6", asset_type: "stock", etf_category: "Equity" }), // ignoré (action)
    ];
    const rep = computePromotionReport(rows);
    expect(rep.etfTotal).toBe(5); // l'action est ignorée
    expect(rep.promotable).toBe(2); // Equity + Real Estate avec ISIN
    expect(rep.noIsin).toBe(1); // Commodity sans ISIN
    expect(rep.unmapped).toBe(1); // Fixed Income
    expect(rep.excluded).toBe(1); // Leveraged/Inverse
    expect(rep.byClass).toEqual({ equity_dev: 1, reit: 1 });
    expect(rep.byUnmappedCategory).toEqual({ "Fixed Income": 1 });
  });
});
