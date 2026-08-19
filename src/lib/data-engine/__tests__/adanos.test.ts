import { describe, it, expect } from "vitest";
import {
  parseAdanosCoreListings,
  dedupeByListingKey,
  toCatalogRow,
  computeImportReport,
  type AdanosListing,
} from "../adanos";

// Extrait au format réel de core_listings.csv (en-tête + lignes ETF/Stock).
const CORE_CSV = [
  "listing_key,ticker,exchange,name,asset_type,stock_sector,etf_category,country,country_code,isin,aliases,instrument_group_key,scope_reason",
  'XETRA::EUNL,EUNL,XETRA,"iShares Core MSCI World UCITS ETF",ETF,,Equity World,Germany,DE,IE00B4L5Y983,,grp1,',
  "NASDAQ::AAPL,AAPL,NASDAQ,Apple Inc.,Stock,Information Technology,,United States,US,US0378331005,,grp2,",
  // ligne sans ISIN → scope_reason renseigné, isin vide
  "LSE::XYZ,XYZ,LSE,Some Fund,ETF,,Bonds,United Kingdom,GB,,,grp3,primary_listing_missing_isin",
  // ISIN au checksum faux → doit devenir null
  "NYSE::BAD,BAD,NYSE,Bad Isin Co,Stock,Energy,,United States,US,US0378331006,,grp4,",
].join("\n");

describe("parseAdanosCoreListings", () => {
  it("parses ETF and stock rows with normalized asset_type", () => {
    const rows = parseAdanosCoreListings(CORE_CSV);
    expect(rows).toHaveLength(4);
    const etf = rows.find((r) => r.listingKey === "XETRA::EUNL")!;
    expect(etf.assetType).toBe("etf");
    expect(etf.isin).toBe("IE00B4L5Y983");
    expect(etf.etfCategory).toBe("Equity World");
    const stock = rows.find((r) => r.listingKey === "NASDAQ::AAPL")!;
    expect(stock.assetType).toBe("stock");
    expect(stock.stockSector).toBe("Information Technology");
    expect(stock.isin).toBe("US0378331005");
  });

  it("keeps rows without ISIN but leaves isin null (never invents)", () => {
    const rows = parseAdanosCoreListings(CORE_CSV);
    const noIsin = rows.find((r) => r.listingKey === "LSE::XYZ")!;
    expect(noIsin.isin).toBeNull();
    expect(noIsin.scopeReason).toBe("primary_listing_missing_isin");
  });

  it("nulls out an ISIN that fails the Luhn checksum", () => {
    const rows = parseAdanosCoreListings(CORE_CSV);
    const bad = rows.find((r) => r.listingKey === "NYSE::BAD")!;
    expect(bad.isin).toBeNull(); // US0378331006 has a wrong check digit
  });

  it("returns [] when there is no header", () => {
    expect(parseAdanosCoreListings("garbage,no,header\n1,2,3")).toEqual([]);
  });
});

describe("dedupeByListingKey", () => {
  it("keeps the first occurrence and counts duplicates", () => {
    const a: AdanosListing = {
      listingKey: "X::A",
      ticker: "A",
      exchange: "X",
      name: "A",
      assetType: "etf",
      stockSector: null,
      etfCategory: null,
      country: null,
      countryCode: null,
      isin: null,
      instrumentGroupKey: null,
      scopeReason: null,
    };
    const { kept, duplicatesIgnored } = dedupeByListingKey([
      a,
      { ...a },
      { ...a, listingKey: "X::B" },
    ]);
    expect(kept).toHaveLength(2);
    expect(duplicatesIgnored).toBe(1);
  });
});

describe("computeImportReport", () => {
  it("counts etf/stock/other and missing ISIN", () => {
    const rows = parseAdanosCoreListings(CORE_CSV);
    const r = computeImportReport(rows);
    expect(r.parsed).toBe(4);
    expect(r.etf).toBe(2);
    expect(r.stock).toBe(2);
    expect(r.withoutIsin).toBe(2); // LSE::XYZ (none) + NYSE::BAD (invalid → null)
  });
});

describe("toCatalogRow", () => {
  it("maps to the DB row shape with provenance", () => {
    const [etf] = parseAdanosCoreListings(CORE_CSV);
    const row = toCatalogRow(etf, {
      sourceVersion: "3.32.00",
      sourceUrl: "https://example/core_listings.csv",
      seenAt: "2026-08-19T00:00:00.000Z",
    });
    expect(row).toMatchObject({
      listing_key: "XETRA::EUNL",
      asset_type: "etf",
      isin: "IE00B4L5Y983",
      source: "adanos",
      source_version: "3.32.00",
      last_seen_at: "2026-08-19T00:00:00.000Z",
    });
  });
});
