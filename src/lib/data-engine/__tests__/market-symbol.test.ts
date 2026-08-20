import { describe, it, expect } from "vitest";
import { exchangeToYahooSuffix, deriveYahooSymbol } from "../market-symbol";

describe("exchangeToYahooSuffix", () => {
  it("maps known European venues", () => {
    expect(exchangeToYahooSuffix("XETRA")).toBe(".DE");
    expect(exchangeToYahooSuffix("LSE")).toBe(".L");
    expect(exchangeToYahooSuffix("SIX")).toBe(".SW");
    expect(exchangeToYahooSuffix("AMS")).toBe(".AS");
  });

  it("returns empty string for US venues (bare ticker)", () => {
    expect(exchangeToYahooSuffix("NASDAQ")).toBe("");
    expect(exchangeToYahooSuffix("NYSE ARCA")).toBe("");
  });

  it("is case/space-insensitive", () => {
    expect(exchangeToYahooSuffix("  xetra ")).toBe(".DE");
  });

  it("returns null for unknown/ambiguous venues (never guesses)", () => {
    expect(exchangeToYahooSuffix("Euronext")).toBeNull(); // ville non précisée
    expect(exchangeToYahooSuffix("FSX")).toBeNull();
    expect(exchangeToYahooSuffix(null)).toBeNull();
    expect(exchangeToYahooSuffix("")).toBeNull();
  });
});

describe("deriveYahooSymbol", () => {
  it("appends the suffix for non-US venues", () => {
    expect(deriveYahooSymbol("EUNL", "XETRA")).toBe("EUNL.DE");
    expect(deriveYahooSymbol("IWDA", "AMS")).toBe("IWDA.AS");
  });

  it("keeps the bare ticker for US venues", () => {
    expect(deriveYahooSymbol("SPY", "NYSE ARCA")).toBe("SPY");
  });

  it("returns null when the ticker or the venue is missing/unmappable", () => {
    expect(deriveYahooSymbol("", "XETRA")).toBeNull();
    expect(deriveYahooSymbol(null, "XETRA")).toBeNull();
    expect(deriveYahooSymbol("EUNL", "Euronext")).toBeNull();
    expect(deriveYahooSymbol("EUNL", null)).toBeNull();
  });
});
