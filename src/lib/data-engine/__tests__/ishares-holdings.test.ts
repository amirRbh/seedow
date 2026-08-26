import { describe, it, expect } from "vitest";
import { iSharesHoldingsUrl, parseISharesHoldings, parseIsharesDate } from "../ishares-holdings";
import { holdingsFreshness, holdingsAgeDays } from "../holdings-freshness";
import { resolveISharesPortfolioId, ISHARES_FUNDS } from "../ishares-funds";

/**
 * Le classeur réel fait plusieurs mégaoctets et contient des centaines de
 * lignes avant le tableau des positions. On reproduit sa STRUCTURE — pas sa
 * taille : préambule, date « as of », en-tête, positions.
 */
function workbook(opts: {
  asOf?: string;
  header?: string[];
  rows?: string[][];
  preamble?: string[][];
}): string {
  const row = (cells: string[]) =>
    `<ss:Row>${cells.map((c) => `<ss:Cell><ss:Data ss:Type="String">${c}</ss:Data></ss:Cell>`).join("")}</ss:Row>`;
  const parts = [
    ...(opts.preamble ?? [["iShares Test UCITS ETF"], ["NAV as of 01/Jan/2020"]]).map(row),
    ...(opts.asOf ? [row(["as of", opts.asOf])] : []),
    row(opts.header ?? ["Issuer Ticker", "Name", "Sector", "Asset Class", "Weight (%)"]),
    ...(opts.rows ?? []).map(row),
  ];
  return `<?xml version="1.0"?><ss:Workbook>${parts.join("")}</ss:Workbook>`;
}

describe("classeur iShares", () => {
  it("lit les positions et la date de composition", () => {
    const r = parseISharesHoldings(
      workbook({
        asOf: "25/Aug/2026",
        rows: [
          ["NVDA", "NVIDIA", "Information Technology", "Equity", "5.33"],
          ["AAPL", "APPLE", "Information Technology", "Equity", "4.93"],
        ],
      }),
    );
    expect(r.asOf).toBe("2026-08-25");
    expect(r.holdings).toHaveLength(2);
    expect(r.holdings[0]).toMatchObject({ ticker: "NVDA", name: "NVIDIA", weightPct: 5.33 });
  });

  it("repère les colonnes par leur nom, pas par leur position", () => {
    // Les fonds obligataires portent quatorze colonnes dans un autre ordre.
    const r = parseISharesHoldings(
      workbook({
        asOf: "25/Aug/2026",
        header: ["Name", "Maturity", "Sector", "Coupon (%)", "Weight (%)", "Issuer Ticker"],
        rows: [["JAPAN 10YR", "2035-01-01", "Treasuries", "0.5", "0.34", "JGB"]],
      }),
    );
    expect(r.holdings[0]).toMatchObject({ name: "JAPAN 10YR", weightPct: 0.34, ticker: "JGB" });
  });

  it("ne renormalise JAMAIS les poids publiés", () => {
    // 92 % est la vraie somme d'un fonds obligataire : le reste est en
    // liquidités et dérivés. La ramener à 100 fabriquerait une composition.
    const r = parseISharesHoldings(
      workbook({
        asOf: "25/Aug/2026",
        rows: [
          ["A", "TITRE A", "S", "Equity", "60"],
          ["B", "TITRE B", "S", "Equity", "32"],
        ],
      }),
    );
    expect(r.holdings.reduce((s, h) => s + (h.weightPct ?? 0), 0)).toBe(92);
  });

  it("ne rend jamais d'ISIN de position : l'export public n'en porte pas", () => {
    const r = parseISharesHoldings(
      workbook({ asOf: "25/Aug/2026", rows: [["A", "TITRE A", "S", "Equity", "10"]] }),
    );
    // Le déduire d'un ticker serait un identifiant fabriqué.
    expect(r.holdings[0].isin).toBeNull();
  });

  it("ignore les lignes sans poids exploitable", () => {
    const r = parseISharesHoldings(
      workbook({
        asOf: "25/Aug/2026",
        rows: [
          ["A", "TITRE A", "S", "Equity", "10"],
          ["", "", "", "", ""],
          ["C", "TITRE C", "S", "Equity", "-"],
        ],
      }),
    );
    expect(r.holdings.map((h) => h.name)).toEqual(["TITRE A"]);
  });

  it("rend une composition vide sur un document illisible, sans lever", () => {
    expect(parseISharesHoldings("<!doctype html><html>page du fonds</html>")).toEqual({
      asOf: null,
      holdings: [],
    });
    expect(parseISharesHoldings("")).toEqual({ asOf: null, holdings: [] });
  });

  it("ne conclut pas sur une date qu'il ne sait pas lire", () => {
    expect(parseIsharesDate("25/Aug/2026")).toBe("2026-08-25");
    expect(parseIsharesDate("2026-08-25")).toBeNull();
    expect(parseIsharesDate("25/Xxx/2026")).toBeNull();
  });

  it("construit une URL rejouable", () => {
    const url = iSharesHoldingsUrl("251882");
    expect(url).toContain("portfolioId=251882");
    expect(url).toContain("component=fundDownloadV2");
  });
});

describe("registre des fonds", () => {
  it("couvre au moins vingt fonds vérifiés", () => {
    expect(ISHARES_FUNDS.length).toBeGreaterThanOrEqual(20);
  });

  it("n'a ni ISIN ni identifiant produit en double", () => {
    expect(new Set(ISHARES_FUNDS.map((f) => f.isin)).size).toBe(ISHARES_FUNDS.length);
    expect(new Set(ISHARES_FUNDS.map((f) => f.portfolioId)).size).toBe(ISHARES_FUNDS.length);
  });

  it("ne porte que des ISIN bien formés", () => {
    for (const f of ISHARES_FUNDS) expect(f.isin).toMatch(/^[A-Z]{2}[0-9A-Z]{10}$/);
  });

  it("résout un fonds couvert, et rend null sinon", () => {
    expect(resolveISharesPortfolioId("IE00B4L5Y983")).toBe("251882");
    expect(resolveISharesPortfolioId("ie00b4l5y983")).toBe("251882");
    // Un fonds non couvert n'est pas une erreur : c'est le cas courant.
    expect(resolveISharesPortfolioId("LU0000000000")).toBeNull();
    expect(resolveISharesPortfolioId(null)).toBeNull();
  });
});

describe("fraîcheur d'une composition", () => {
  const now = new Date("2026-08-25T12:00:00Z");

  it("classe selon l'âge publié", () => {
    expect(holdingsFreshness("2026-08-20", now)).toBe("fresh");
    expect(holdingsFreshness("2026-04-20", now)).toBe("aging");
    expect(holdingsFreshness("2025-06-01", now)).toBe("stale");
  });

  it("sans date, on ne dit pas que la donnée est vieille — on dit qu'on ne l'a pas", () => {
    expect(holdingsFreshness(null, now)).toBe("unknown");
    expect(holdingsFreshness("pas-une-date", now)).toBe("unknown");
    expect(holdingsAgeDays(null, now)).toBeNull();
  });

  it("ne rejette pas une date du jour à cause d'un fuseau", () => {
    expect(holdingsFreshness("2026-08-26", now)).toBe("fresh");
    expect(holdingsAgeDays("2026-08-26", now)).toBe(0);
  });
});
