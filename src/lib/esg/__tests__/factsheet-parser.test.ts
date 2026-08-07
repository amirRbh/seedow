import { describe, it, expect } from "vitest";
import { parseISharesFactSheet, usDateToIso, normalizeItr, clampWaci } from "../factsheet-parser";

// Extraits réels des fiches iShares (section Sustainability Characteristics),
// tels que rendus par extraction texte — libellés parfois coupés sur 2 lignes.
const ESGU = `
MSCI ESG Fund Rating (AAA-CCC) A
MSCI ESG Quality Score (0-10) 7.07
MSCI Weighted Average Carbon Intensity
(Tons CO2E/$M SALES) 69.03
MSCI Weighted Average Carbon Intensity
% Coverage 99.66%
MSCI Implied Temperature Rise (0-3.0+ °C) > 2.5° - 3.0° C
All data is from MSCI ESG Fund Ratings as of 04/17/2026, based on holdings as of 03/31/2026.
`;

const ESGD = `
MSCI ESG Fund Rating (AAA-CCC) AAA
MSCI ESG Quality Score (0-10) 8.65
MSCI Weighted Average Carbon Intensity
(Tons CO2E/$M SALES) 61.28
MSCI Implied Temperature Rise (0-3.0+ °C) > 2.0° - 2.5° C
All data is from MSCI ESG Fund Ratings as of 06/19/2026, based on holdings as of 05/31/2026.
`;

const ESGE = `
MSCI ESG Fund Rating (AAA-CCC) AA
MSCI ESG Quality Score (0-10) 7.95
MSCI Weighted Average Carbon Intensity
(Tons CO2E/$M SALES) 119.07
MSCI Implied Temperature Rise (0-3.0+ °C) > 2.5° - 3.0° C
All data is from MSCI ESG Fund Ratings as of 03/20/2026, based on holdings as of 02/28/2026.
`;

describe("usDateToIso", () => {
  it("converts MM/DD/YYYY to ISO", () => {
    expect(usDateToIso("04/17/2026")).toBe("2026-04-17");
    expect(usDateToIso("3/5/2026")).toBe("2026-03-05");
  });
  it("returns null for junk", () => {
    expect(usDateToIso("2026-04-17")).toBeNull();
    expect(usDateToIso(null)).toBeNull();
  });
});

describe("normalizeItr", () => {
  it("normalizes a range band", () => {
    expect(normalizeItr("> 2.5° - 3.0° C")).toBe(">2.5-3.0°C");
    expect(normalizeItr("2.0° - 2.5° C")).toBe("2.0-2.5°C");
  });
  it("handles a single value", () => {
    expect(normalizeItr("> 3.0° C")).toBe(">3.0°C");
  });
});

describe("clampWaci", () => {
  it("keeps normal values", () => {
    expect(clampWaci(69.03)).toBe(69.03);
    expect(clampWaci(150)).toBe(150);
  });
  it("rejects extreme outliers above the sanity ceiling", () => {
    expect(clampWaci(757.34)).toBeNull();
    expect(clampWaci(300)).toBeNull();
  });
  it("passes through null", () => {
    expect(clampWaci(null)).toBeNull();
  });
});

describe("parseISharesFactSheet", () => {
  it("parses ESGU verbatim", () => {
    const p = parseISharesFactSheet(ESGU);
    expect(p.msciRating).toBe("A");
    expect(p.qualityScore).toBe(7.07);
    expect(p.esgScore).toBe(70.7);
    expect(p.waci).toBe(69.03);
    expect(p.impliedTempRise).toBe(">2.5-3.0°C");
    expect(p.asOf).toBe("2026-04-17");
  });

  it("parses ESGD verbatim", () => {
    const p = parseISharesFactSheet(ESGD);
    expect(p.msciRating).toBe("AAA");
    expect(p.qualityScore).toBe(8.65);
    expect(p.esgScore).toBe(86.5);
    expect(p.waci).toBe(61.28);
    expect(p.impliedTempRise).toBe(">2.0-2.5°C");
    expect(p.asOf).toBe("2026-06-19");
  });

  it("parses ESGE verbatim", () => {
    const p = parseISharesFactSheet(ESGE);
    expect(p.msciRating).toBe("AA");
    expect(p.qualityScore).toBe(7.95);
    expect(p.waci).toBe(119.07);
    expect(p.impliedTempRise).toBe(">2.5-3.0°C");
    expect(p.asOf).toBe("2026-03-20");
  });

  it("returns nulls for a non-ESG fact sheet (no sustainability section)", () => {
    const p = parseISharesFactSheet("iShares MSCI World ETF\nFUND DESCRIPTION\n...");
    expect(p.msciRating).toBeNull();
    expect(p.waci).toBeNull();
    expect(p.asOf).toBeNull();
    expect(p.esgScore).toBeNull();
  });
});

// Rendu `pdftotext -layout` sur 2 colonnes : la valeur WACI est sur la ligne
// AU-DESSUS des libellés, et l'ordre des colonnes change d'une fiche à l'autre.
// Le seul repère fiable est que le pourcentage est la couverture, jamais l'intensité.
const LAYOUT_VALUE_LEFT = `
 MSCI ESG Quality Score (0-10)                                     7.07
 MSCI Weighted Average Carbon Intensity                MSCI Weighted Average Carbon Intensity
                                          69.03                                        99.66%
 (Tons CO2E/$M SALES)                                  % Coverage
All data is from MSCI ESG Fund Ratings as of 04/17/2026, based on holdings as of 03/31/2026.
MSCI Weighted Average Carbon Intensity (Tons CO2E/$M SALES): Measures a fund's exposure.
`;

const LAYOUT_VALUE_RIGHT = `
 MSCI ESG Quality Score (0-10)                                     6.82
 MSCI Weighted Average Carbon Intensity                MSCI Weighted Average Carbon Intensity
                                         79.54%                                        757.34
 % Coverage                                            (Tons CO2E/$M SALES)
All data is from MSCI ESG Fund Ratings as of 06/19/2026, based on holdings as of 05/31/2026.
`;

describe("parseISharesFactSheet — mise en page 2 colonnes", () => {
  it("lit le WACI quand la valeur précède le libellé (colonne gauche)", () => {
    const p = parseISharesFactSheet(LAYOUT_VALUE_LEFT);
    expect(p.waci).toBe(69.03);
    expect(p.qualityScore).toBe(7.07);
    expect(p.asOf).toBe("2026-04-17");
  });

  it("rejette les valeurs aberrantes issues d'une confusion colonnes ou de données brutes", () => {
    const p = parseISharesFactSheet(LAYOUT_VALUE_RIGHT);
    expect(p.waci).toBeNull();
  });

  it("ignore le glossaire et n'invente pas de valeur", () => {
    const glossaryOnly = `
MSCI Weighted Average Carbon Intensity (Tons CO2E/$M SALES): Measures a fund's exposure
to carbon intensive companies across 100 holdings.
`;
    expect(parseISharesFactSheet(glossaryOnly).waci).toBeNull();
  });
});
