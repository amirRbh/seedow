import { describe, expect, it } from "vitest";
import { buildAliases, fundMatchesQuery, normalizeText, parseQuery } from "../search";

const iwda = {
  isin: "IE00B4L5Y983",
  ticker: "IWDA",
  name: "iShares Core MSCI World UCITS ETF",
  issuer: "iShares",
  indexTracked: "MSCI World",
};

describe("search", () => {
  it("normalizeText retire accents et ponctuation", () => {
    expect(normalizeText("Actions Développées — Zone €uro")).toBe("actions developpees zone uro");
  });

  it("parseQuery distingue ISIN / ticker / texte", () => {
    expect(parseQuery("IE00B4L5Y983").kind).toBe("isin");
    expect(parseQuery("iwda").kind).toBe("ticker");
    expect(parseQuery("MSCI World").kind).toBe("text");
    expect(parseQuery("IE00B4L5Y984").kind).toBe("text"); // ISIN invalide (12c) → ni ISIN ni ticker
  });

  it("un même produit matche ses différentes désignations (§16)", () => {
    for (const q of ["MSCI World", "iShares MSCI World", "IE00B4L5Y983", "IWDA", "world"]) {
      expect(fundMatchesQuery(iwda, q)).toBe(true);
    }
  });

  it("ne matche pas un produit sans rapport", () => {
    expect(fundMatchesQuery(iwda, "S&P 500")).toBe(false);
    expect(fundMatchesQuery(iwda, "FR0000131104")).toBe(false);
  });

  it("buildAliases inclut ISIN, ticker, nom, indice", () => {
    const aliases = buildAliases(iwda);
    expect(aliases).toContain("ie00b4l5y983");
    expect(aliases).toContain("iwda");
    expect(aliases).toContain("msci world");
  });
});
