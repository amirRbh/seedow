import { describe, expect, it } from "vitest";
import {
  buildHoldingRows,
  monthDayYearToIso,
  parseCsvLine,
  parseISharesHoldingsCsv,
  persistHoldings,
  type HoldingRow,
} from "../holdings";

// Extrait réaliste d'un CSV de composition iShares (préambule + tableau).
const CSV = `iShares Core MSCI World UCITS ETF
Fund Holdings as of,"Jul 31, 2026"
Inception Date,"Sep 25, 2009"

Ticker,Name,Sector,Asset Class,Weight (%),Location,Exchange,Currency,ISIN
"AAPL","APPLE INC","Information Technology","Equity","4.21","United States","NASDAQ","USD","US0378331005"
"MSFT","MICROSOFT CORP","Information Technology","Equity","3.85","United States","NASDAQ","USD","US5949181045"
"NESN","NESTLE SA","Consumer Staples","Equity","0.55","Switzerland","SIX","CHF","CH0038863350"
"USD","USD CASH","Cash and/or Derivatives","Cash","0.10","-","-","USD",""
`;

describe("parseCsvLine", () => {
  it("gère guillemets et virgules internes", () => {
    expect(parseCsvLine('"a","b,c","d"')).toEqual(["a", "b,c", "d"]);
    expect(parseCsvLine('"a ""x""",b')).toEqual(['a "x"', "b"]);
  });
});

describe("monthDayYearToIso", () => {
  it("convertit « Jul 31, 2026 »", () => {
    expect(monthDayYearToIso("Jul 31, 2026")).toBe("2026-07-31");
    expect(monthDayYearToIso("bad")).toBeNull();
  });
});

describe("parseISharesHoldingsCsv", () => {
  it("extrait la date et les positions", () => {
    const p = parseISharesHoldingsCsv(CSV);
    expect(p.asOf).toBe("2026-07-31");
    expect(p.holdings).toHaveLength(4);
    const aapl = p.holdings[0];
    expect(aapl.name).toBe("APPLE INC");
    expect(aapl.weightPct).toBe(4.21);
    expect(aapl.isin).toBe("US0378331005");
    expect(aapl.country).toBe("United States");
    expect(aapl.sector).toBe("Information Technology");
  });

  it("CSV sans tableau → vide, pas d'erreur", () => {
    expect(parseISharesHoldingsCsv("rien ici").holdings).toHaveLength(0);
  });
});

const META = {
  sourceId: "src1",
  sourceUrl: "http://x/holdings.csv",
  retrievedAt: "2026-08-12T00:00:00Z",
};

describe("buildHoldingRows", () => {
  it("construit des lignes datées + sourcées", () => {
    const rows = buildHoldingRows("a1", parseISharesHoldingsCsv(CSV), META);
    expect(rows).toHaveLength(4);
    expect(rows[0].as_of).toBe("2026-07-31");
    expect(rows[0].security_isin).toBe("US0378331005");
    expect(rows[0].source_id).toBe("src1");
    // Secteur/pays du titre conservés depuis le CSV (look-through §7/§9).
    expect(rows[0].security_sector).toBe("Information Technology");
    expect(rows[0].security_country).toBe("United States");
    expect(rows.every((r) => r.validation_status === "valid")).toBe(true);
  });

  it("sans date as_of → aucune ligne (§12)", () => {
    const rows = buildHoldingRows(
      "a1",
      {
        asOf: null,
        holdings: [
          { name: "X", ticker: null, sector: null, country: null, isin: null, weightPct: 1 },
        ],
      },
      META,
    );
    expect(rows).toHaveLength(0);
  });

  it("somme > 100 → toutes les lignes en rejected (§11)", () => {
    const parsed = {
      asOf: "2026-07-31",
      holdings: [
        { name: "A", ticker: null, sector: null, country: null, isin: null, weightPct: 60 },
        { name: "B", ticker: null, sector: null, country: null, isin: null, weightPct: 60 },
      ],
    };
    const rows = buildHoldingRows("a1", parsed, META);
    expect(rows.every((r) => r.validation_status === "rejected")).toBe(true);
  });
});

describe("persistHoldings", () => {
  it("écrit les publiables et ignore les rejetées", async () => {
    let written: HoldingRow[] = [];
    const writer = {
      async insertHoldings(rows: HoldingRow[]) {
        written = rows;
        return rows.length;
      },
    };
    const r = await persistHoldings(writer, "a1", parseISharesHoldingsCsv(CSV), META);
    expect(r.inserted).toBe(4);
    expect(r.asOf).toBe("2026-07-31");
    expect(written).toHaveLength(4);
  });

  it("lot rejeté (somme > 100) → no-op", async () => {
    const writer = {
      async insertHoldings() {
        return 99;
      },
    };
    const parsed = {
      asOf: "2026-07-31",
      holdings: [
        { name: "A", ticker: null, sector: null, country: null, isin: null, weightPct: 80 },
        { name: "B", ticker: null, sector: null, country: null, isin: null, weightPct: 80 },
      ],
    };
    const r = await persistHoldings(writer, "a1", parsed, META);
    expect(r.inserted).toBe(0);
  });
});
