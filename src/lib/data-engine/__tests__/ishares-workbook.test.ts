import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { parseISharesWorkbook, parseWorkbookDate } from "../ishares-workbook";
import { isinFromCusip } from "../isin";

/**
 * Les deux fixtures sont des extraits VERBATIM (lignes tronquées, rien de
 * réécrit) des classeurs produit officiels iShares collectés le 18/11/2026 :
 *   - ishares-eu-workbook.xml — iShares MSCI World SRI UCITS ETF (IE00BDZZTM54) ;
 *   - ishares-us-workbook.xml — iShares Global Clean Energy ETF (ICLN), dont le
 *     classeur américain porte les feuilles « Sustainability Characteristics »
 *     et « Business Involvement ».
 */
const FIXTURES = join(import.meta.dirname, "fixtures");
const eu = parseISharesWorkbook(readFileSync(join(FIXTURES, "ishares-eu-workbook.xml"), "utf8"));
const us = parseISharesWorkbook(readFileSync(join(FIXTURES, "ishares-us-workbook.xml"), "utf8"));

describe("dates de classeur", () => {
  it.each([
    ["17/Nov/2026", "2026-11-17"],
    ["30/Sept/2026", "2026-09-30"],
    ["Tue, 17 Nov 2026", "2026-11-17"],
    ["Nov 17, 2026", "2026-11-17"],
    ["Sat, Oct 31, 2026", "2026-10-31"],
    ["Nov 9, 2026", "2026-11-09"],
  ])("%s → %s", (raw, iso) => {
    expect(parseWorkbookDate(raw)).toBe(iso);
  });

  it("illisible → null, jamais une date devinée", () => {
    expect(parseWorkbookDate("bientôt")).toBeNull();
    expect(parseWorkbookDate(null)).toBeNull();
  });
});

describe("ISIN depuis un CUSIP (ISO 6166)", () => {
  it("retrouve les ISIN du registre iShares", () => {
    expect(isinFromCusip("464288224")).toBe("US4642882249"); // ICLN
    expect(isinFromCusip("46435G425")).toBe("US46435G4257"); // ESGU
    expect(isinFromCusip("464287200")).toBe("US4642872000"); // IVV
  });

  it("CUSIP illisible → null", () => {
    expect(isinFromCusip("4642")).toBeNull();
    expect(isinFromCusip(null)).toBeNull();
  });
});

describe("classeur européen (UCITS)", () => {
  it("identité, SFDR déclaré, TER", () => {
    expect(eu.isin).toBe("IE00BDZZTM54");
    expect(eu.sfdrDeclared).toBe("Article 8");
    expect(eu.domicile).toBe("Ireland");
    expect(eu.currency).toBe("USD");
    expect(eu.ter).toBe(0.002);
  });

  it("rendements annualisés publiés (bloc « Annualised »)", () => {
    expect(eu.publishedReturns.asOf).toBe("2026-10-31");
    expect(eu.publishedReturns.fund).toMatchObject({ "1y": 13.01, "3y": 18.57, "5y": 7.66 });
    expect(eu.publishedReturns.benchmark["3y"]).toBe(18.56);
  });

  it("pas de feuilles MSCI : null, jamais un objet vide", () => {
    expect(eu.sustainability).toBeNull();
    expect(eu.businessInvolvement).toBeNull();
  });
});

describe("classeur américain", () => {
  it("ISIN déduit du CUSIP, domicile et devise lus dans le document", () => {
    expect(us.name).toBe("iShares Global Clean Energy ETF");
    expect(us.isin).toBe("US4642882249");
    expect(us.domicile).toBe("United States");
    expect(us.currency).toBe("USD");
    expect(us.sfdrDeclared).toBeNull();
    expect(us.launchDate).toBe("2008-06-24");
  });

  it("frais lus dans la feuille « Fees »", () => {
    expect(us.ter).toBe(0.0038);
  });

  it("VL au 17/11, rendements du bloc « Average Annual » (lignes Market Price ignorées)", () => {
    expect(us.navAsOf).toBe("2026-11-17");
    expect(us.publishedReturns.asOf).toBe("2026-10-31");
    expect(us.publishedReturns.fund).toEqual({
      "1y": -10.24,
      "3y": 7.24,
      "5y": -8.24,
      "10y": 7.43,
    });
    expect(us.publishedReturns.benchmark).toEqual({
      "1y": -9.92,
      "3y": 7.47,
      "5y": -8.11,
      "10y": 7.52,
    });
  });

  it("croissance de 10 000 mensuelle, en ordre chronologique", () => {
    expect(us.growthFund.at(-1)).toEqual({ date: "2026-10-31", value: 4421.25 });
    expect(us.growthBenchmark.at(-1)).toEqual({ date: "2026-10-31", value: 3963.52 });
    const dates = us.growthFund.map((p) => p.date);
    expect([...dates].sort()).toEqual(dates);
  });

  it("géographie (« Geography/Countries ») et positions sans colonne devise", () => {
    expect(us.geographyExposure[0]).toEqual({ label: "United States", weightPct: 34.18 });
    expect(us.holdings[0]).toMatchObject({ ticker: "NXT", weightPct: 8.2, currency: null });
  });

  it("caractéristiques de durabilité MSCI, telles que publiées", () => {
    expect(us.sustainability).toEqual({
      msciRating: "A",
      ratingCoveragePct: 87.91,
      qualityScore: 7.1,
      peerPercentile: 53.82,
      peerGroup: "Equity Theme - Alternative Energy",
      peerCount: 249,
      waci: 273.17,
      waciCoveragePct: 93.37,
      impliedTempRise: "> 1.5° - 2.0° C",
      itrCoveragePct: 91.88,
      asOf: "2026-10-23",
      holdingsBasisAsOf: "2026-09-30",
    });
  });

  it("expositions d'activité, avec leur couverture", () => {
    const bi = us.businessInvolvement!;
    expect(bi.asOf).toBe("2026-11-17");
    expect(bi.coveragePct).toBe(99.85);
    expect(bi.rows.map((r) => r.id)).toEqual([
      "controversial_weapons",
      "ungc_violators",
      "nuclear_weapons",
      "thermal_coal",
      "civilian_firearms",
      "oil_sands",
      "tobacco",
    ]);
    expect(bi.rows.every((r) => r.pct === 0)).toBe(true);
  });
});

describe("robustesse", () => {
  it("un document vide ne lève pas et ne fabrique rien", () => {
    const w = parseISharesWorkbook("<ss:Workbook></ss:Workbook>");
    expect(w.isin).toBeNull();
    expect(w.ter).toBeNull();
    expect(w.sustainability).toBeNull();
    expect(w.growthFund).toEqual([]);
  });
});
