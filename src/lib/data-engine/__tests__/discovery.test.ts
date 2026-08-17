import { describe, expect, it } from "vitest";
import {
  mapISharesAssetClass,
  parseISharesProductCsv,
  planAssetInserts,
  type DiscoveredFund,
  type ExistingAssetKey,
} from "../discovery";
import type { RawData } from "../connectors/types";

const csv = (content: string): RawData => ({
  sourceKey: "ishares_products",
  sourceUrl: "https://www.ishares.com/export.csv",
  content,
  contentType: "csv",
  retrievedAt: "2026-08-17T00:00:00Z",
});

describe("mapISharesAssetClass", () => {
  it("maps developed vs emerging equity", () => {
    expect(mapISharesAssetClass("Equity", "Large Cap", "iShares Core MSCI World")).toBe(
      "equity_dev",
    );
    expect(mapISharesAssetClass("Equity", "Emerging Markets", "iShares MSCI EM")).toBe("equity_em");
  });

  it("routes thematic equity by keyword", () => {
    expect(mapISharesAssetClass("Equity", "Sector", "iShares Global Clean Energy")).toBe("thematic");
    expect(mapISharesAssetClass("Equity", "Thematic", "iShares Global Water")).toBe("thematic");
  });

  it("splits fixed income into green / sovereign / corporate", () => {
    expect(mapISharesAssetClass("Fixed Income", "Green Bond", "iShares Green Bond")).toBe(
      "green_bond",
    );
    expect(mapISharesAssetClass("Fixed Income", "Government", "iShares Core Govt Bond")).toBe(
      "sov_bond",
    );
    expect(mapISharesAssetClass("Fixed Income", "Corporate", "iShares Corp Bond ESG")).toBe(
      "corporate_bond",
    );
  });

  it("maps real estate and commodities", () => {
    expect(mapISharesAssetClass("Real Estate", "REIT", "iShares European Property")).toBe("reit");
    expect(mapISharesAssetClass("Commodity", "Precious Metals", "iShares Physical Gold")).toBe(
      "commodity",
    );
  });

  it("returns null for an unmappable class (never guesses)", () => {
    expect(mapISharesAssetClass("Multi-Asset", "Balanced", "iShares Diversified")).toBeNull();
  });
});

describe("parseISharesProductCsv", () => {
  const content = [
    '"iShares Product List — export"',
    "Ticker,Name,ISIN,Asset Class,Sub Asset Class,Region,Base Currency,Net Expense Ratio (%)",
    'IWDA,"iShares Core MSCI World UCITS ETF",IE00B4L5Y983,Equity,Large Cap,World,USD,0.20',
    'INRG,"iShares Global Clean Energy UCITS ETF",IE00B1XNHC34,Equity,Sector,Global,USD,0.65',
    'IEMA,"iShares MSCI EM UCITS ETF",IE00B0M63177,Equity,Emerging Markets,EM,USD,0.18',
    'IEGA,"iShares Core Euro Govt Bond",IE00B4WXJJ64,Fixed Income,Government,Europe,EUR,0.09',
    'MULT,"iShares Diversified Multi-Asset",IE00MULTI001,Multi-Asset,Balanced,World,EUR,0.25',
    ',"No ticker row",IE00BROKEN01,Equity,Large Cap,World,USD,0.20',
  ].join("\n");

  it("parses identity rows, converts TER %→fraction, skips headerless junk", () => {
    const funds = parseISharesProductCsv(csv(content));
    const byTicker = Object.fromEntries(funds.map((f) => [f.ticker, f]));
    // 4 mappable rows: IWDA, INRG, IEMA, IEGA. MULT (multi-asset) and the
    // ticker-less row are skipped.
    expect(funds).toHaveLength(4);
    expect(byTicker.IWDA.assetClass).toBe("equity_dev");
    expect(byTicker.INRG.assetClass).toBe("thematic");
    expect(byTicker.IEMA.assetClass).toBe("equity_em");
    expect(byTicker.IEGA.assetClass).toBe("sov_bond");
    expect(byTicker.IWDA.ter).toBeCloseTo(0.002, 6); // 0.20% → 0.0020
    expect(byTicker.IWDA.isin).toBe("IE00B4L5Y983");
    expect(byTicker.IWDA.issuer).toBe("iShares");
    expect(byTicker.MULT).toBeUndefined();
  });

  it("returns [] for non-CSV content (never fabricates)", () => {
    expect(parseISharesProductCsv({ ...csv(content), contentType: "json" })).toEqual([]);
  });
});

describe("planAssetInserts", () => {
  const fund = (ticker: string, isin: string | null): DiscoveredFund => ({
    isin,
    ticker,
    name: ticker,
    issuer: "iShares",
    assetClass: "equity_dev",
    region: "world",
    currency: "USD",
    ter: 0.002,
    sourceKey: "ishares_products",
    sourceUrl: "u",
  });

  it("skips funds already present by ticker or ISIN", () => {
    const existing: ExistingAssetKey[] = [
      { ticker: "IWDA", isin: "IE00B4L5Y983" },
      { ticker: "OLD", isin: "IE00OLD00001" },
    ];
    const plan = planAssetInserts(existing, [
      fund("IWDA", "IE00NEWTICKER"), // dup by ticker
      fund("NEWTICK", "IE00OLD00001"), // dup by ISIN
      fund("FRESH", "IE00FRESH0001"), // new
    ]);
    expect(plan.toCreate.map((f) => f.ticker)).toEqual(["FRESH"]);
    expect(plan.skippedExisting.sort()).toEqual(["IWDA", "NEWTICK"]);
  });

  it("dedupes within the discovered batch itself", () => {
    const plan = planAssetInserts([], [fund("DUP", "IE00DUP00001"), fund("DUP", "IE00DUP00002")]);
    expect(plan.toCreate).toHaveLength(1);
    expect(plan.skippedExisting).toEqual(["DUP"]);
  });
});
