import { describe, expect, it } from "vitest";
import { isValidIsin, isinCountry, normalizeIsin, toCanonicalIsin } from "../isin";

describe("isin", () => {
  it("valide des ISIN réels (check digit Luhn correct)", () => {
    expect(isValidIsin("IE00B4L5Y983")).toBe(true); // iShares Core MSCI World (IWDA)
    expect(isValidIsin("US0378331005")).toBe(true); // Apple
    expect(isValidIsin("FR0000131104")).toBe(true); // BNP Paribas
    expect(isValidIsin("US5949181045")).toBe(true); // Microsoft
  });

  it("rejette un chiffre de contrôle faux", () => {
    expect(isValidIsin("IE00B4L5Y984")).toBe(false);
    expect(isValidIsin("US0378331006")).toBe(false);
  });

  it("rejette les formats invalides", () => {
    expect(isValidIsin("")).toBe(false);
    expect(isValidIsin("IWDA")).toBe(false);
    expect(isValidIsin("IE00B4L5Y98")).toBe(false); // 11 chars
    expect(isValidIsin("1200B4L5Y983")).toBe(false); // pays non-alpha
    expect(isValidIsin(null)).toBe(false);
  });

  it("normalise espaces et casse avant validation", () => {
    expect(normalizeIsin(" ie00 b4l5 y983 ")).toBe("IE00B4L5Y983");
    expect(isValidIsin("ie00b4l5y983")).toBe(true);
  });

  it("extrait le pays et canonicalise seulement si valide", () => {
    expect(isinCountry("IE00B4L5Y983")).toBe("IE");
    expect(isinCountry("IE00B4L5Y984")).toBe(null);
    expect(toCanonicalIsin("ie00b4l5y983")).toBe("IE00B4L5Y983");
    expect(toCanonicalIsin("pas-un-isin")).toBe(null);
  });
});
