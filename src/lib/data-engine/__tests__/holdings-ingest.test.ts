import { describe, it, expect, vi } from "vitest";
import {
  ingestHoldingsForAsset,
  ingestHoldingsForAssets,
  type HoldingsIngestAsset,
  type HoldingsIngestDeps,
} from "../holdings-ingest";
import type { HoldingRow } from "../holdings";

const asset: HoldingsIngestAsset = {
  id: "fund-1",
  ticker: "IWDA",
  name: "iShares Core MSCI World",
  isin: "IE00B4L5Y983",
  issuer: "iShares",
};

// Extrait au format réel d'un CSV de holdings iShares (préambule + en-tête + lignes).
const ISHARES_CSV = [
  "iShares Core MSCI World UCITS ETF",
  'Fund Holdings as of,"Jul 31, 2026"',
  "",
  '"Ticker","Name","Sector","Asset Class","Weight (%)","Location","ISIN"',
  '"AAPL","APPLE INC","Information Technology","Equity","5.00","United States","US0378331005"',
  '"MSFT","MICROSOFT CORP","Information Technology","Equity","4.00","United States","US5949181045"',
].join("\n");

function collectingWriter() {
  const captured: HoldingRow[] = [];
  return {
    writer: {
      async insertHoldings(rows: HoldingRow[]) {
        captured.push(...rows);
        return rows.length;
      },
    },
    captured,
  };
}

function deps(over: Partial<HoldingsIngestDeps> = {}): HoldingsIngestDeps {
  const { writer } = collectingWriter();
  return {
    resolveUrl: () => ({ url: "https://ishares.example/IWDA_holdings.csv", sourceId: "ishares" }),
    download: async () => ISHARES_CSV,
    writer,
    now: () => "2026-08-19T00:00:00.000Z",
    ...over,
  };
}

describe("ingestHoldingsForAsset", () => {
  it("ingests real-format holdings and persists dated, sourced rows", async () => {
    const { writer, captured } = collectingWriter();
    const res = await ingestHoldingsForAsset(asset, deps({ writer }));
    expect(res.status).toBe("ingested");
    expect(res.inserted).toBe(2);
    expect(res.asOf).toBe("2026-07-31");
    expect(captured).toHaveLength(2);
    expect(captured[0]).toMatchObject({
      asset_id: "fund-1",
      as_of: "2026-07-31",
      source_url: "https://ishares.example/IWDA_holdings.csv",
      source_id: "ishares",
      retrieved_at: "2026-08-19T00:00:00.000Z",
    });
    expect(captured[0].security_isin).toBe("US0378331005");
  });

  it("returns no_source when no official file is resolved (never invents)", async () => {
    const res = await ingestHoldingsForAsset(asset, deps({ resolveUrl: () => null }));
    expect(res.status).toBe("no_source");
    expect(res.inserted).toBe(0);
  });

  it("returns fetch_failed when the download throws", async () => {
    const res = await ingestHoldingsForAsset(
      asset,
      deps({
        download: async () => {
          throw new Error("403 blocked");
        },
      }),
    );
    expect(res.status).toBe("fetch_failed");
    expect(res.error).toContain("403");
  });

  it("returns empty when the file has no parseable holdings", async () => {
    const res = await ingestHoldingsForAsset(
      asset,
      deps({ download: async () => "garbage,no,header" }),
    );
    expect(res.status).toBe("empty");
    expect(res.inserted).toBe(0);
  });

  it("rejects (persists nothing) when the batch fails hard QC", async () => {
    const insert = vi.fn(async () => 0);
    // Same as-of but weights summing well over 100 → sum_out_of_range → rejected.
    const bad = [
      "F",
      'Fund Holdings as of,"Jul 31, 2026"',
      "",
      '"Ticker","Name","Weight (%)"',
      '"A","AAA","70.00"',
      '"B","BBB","70.00"',
    ].join("\n");
    const res = await ingestHoldingsForAsset(
      asset,
      deps({ download: async () => bad, writer: { insertHoldings: insert } }),
    );
    expect(res.status).toBe("rejected");
    expect(insert).not.toHaveBeenCalled();
  });
});

describe("ingestHoldingsForAssets", () => {
  it("aggregates a summary across funds", async () => {
    const { results, summary } = await ingestHoldingsForAssets(
      [asset, { ...asset, id: "fund-2" }],
      deps({ resolveUrl: (a) => (a.id === "fund-2" ? null : { url: "u", sourceId: "ishares" }) }),
    );
    expect(results).toHaveLength(2);
    expect(summary.ingested).toBe(1);
    expect(summary.no_source).toBe(1);
    expect(summary.holdingsInserted).toBe(2);
  });
});
