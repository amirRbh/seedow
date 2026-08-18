import { describe, expect, it } from "vitest";
import {
  buildYahooSymbol,
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
    "Ticker,Name,ISIN,Asset Class,Sub Asset Class,Region,Base Currency,Net Expense Ratio (%),Exchange",
    'IWDA,"iShares Core MSCI World UCITS ETF",IE00B4L5Y983,Equity,Large Cap,World,USD,0.20,London Stock Exchange',
    'INRG,"iShares Global Clean Energy UCITS ETF",IE00B1XNHC34,Equity,Sector,Global,USD,0.65,Xetra',
    'IEMA,"iShares MSCI EM UCITS ETF",IE00B0M63177,Equity,Emerging Markets,EM,USD,0.18,Euronext Amsterdam',
    'IEGA,"iShares Core Euro Govt Bond",IE00B4WXJJ64,Fixed Income,Government,Europe,EUR,0.09,Borsa Italiana',
    'MULT,"iShares Diversified Multi-Asset",IE00MULTI001,Multi-Asset,Balanced,World,EUR,0.25,London Stock Exchange',
    ',"No ticker row",IE00BROKEN01,Equity,Large Cap,World,USD,0.20,London Stock Exchange',
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
    // Yahoo symbol built from ticker + exchange suffix.
    expect(byTicker.IWDA.yahooSymbol).toBe("IWDA.L");
    expect(byTicker.INRG.yahooSymbol).toBe("INRG.DE");
    expect(byTicker.IEMA.yahooSymbol).toBe("IEMA.AS");
    expect(byTicker.MULT).toBeUndefined();
  });

  it("returns [] for non-CSV content (never fabricates)", () => {
    expect(parseISharesProductCsv({ ...csv(content), contentType: "json" })).toEqual([]);
  });

  it("handles the French BlackRock export: ';' delimiter, FR headers, preamble, decimal comma", () => {
    const fr = [
      '"iShares® - Liste des produits BlackRock France";;;;;;;;',
      ";;;;;;;;",
      "Symbole;Nom;ISIN;Classe d'actifs;Sous-classe d'actifs;Région;Devise;Frais courants (%);Bourse",
      "IWDA;iShares Core MSCI World UCITS ETF;IE00B4L5Y983;Actions;Grandes capitalisations;Monde;USD;0,20;Bourse de Londres",
      "IEGA;iShares Core Euro Govt Bond;IE00B4WXJJ64;Obligations;Emprunts d'État;Europe;EUR;0,09;Borsa Italiana",
      "IQQH;iShares Global Clean Energy;IE00B1XNHC34;Actions;Énergie propre;Monde;USD;0,65;Xetra",
    ].join("\n");
    const funds = parseISharesProductCsv(csv(fr));
    const byT = Object.fromEntries(funds.map((f) => [f.ticker, f]));
    expect(funds).toHaveLength(3);
    expect(byT.IWDA.assetClass).toBe("equity_dev");
    expect(byT.IWDA.ter).toBeCloseTo(0.002, 6); // "0,20" → 0.0020
    expect(byT.IWDA.yahooSymbol).toBe("IWDA.L"); // "Bourse de Londres"
    expect(byT.IEGA.assetClass).toBe("sov_bond"); // "Emprunts d'État"
    expect(byT.IEGA.yahooSymbol).toBe("IEGA.MI"); // "Borsa Italiana"
    expect(byT.IQQH.assetClass).toBe("thematic"); // "Énergie propre"
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
    yahooSymbol: `${ticker}.L`,
    sourceKey: "ishares_products",
    sourceUrl: "u",
  });

  it("buildYahooSymbol maps known exchanges and refuses unknown ones", () => {
    expect(buildYahooSymbol("IWDA", "London Stock Exchange")).toBe("IWDA.L");
    expect(buildYahooSymbol("EUNL", "Xetra")).toBe("EUNL.DE");
    expect(buildYahooSymbol("IVV", "NYSE Arca")).toBe("IVV"); // US: no suffix
    expect(buildYahooSymbol("XXXX", "Some Unknown Exchange")).toBeNull();
    expect(buildYahooSymbol("XXXX", "")).toBeNull();
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
