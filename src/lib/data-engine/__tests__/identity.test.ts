import { describe, it, expect } from "vitest";
import { extractIssuer, inferExposureRegion, deriveIdentityFromName } from "../identity";

describe("extractIssuer", () => {
  it("maps well-known ETF brands to their manager", () => {
    expect(extractIssuer("iShares Core MSCI World UCITS ETF USD (Dist)")).toBe("BlackRock");
    expect(extractIssuer("Xtrackers S&P 500 UCITS ETF 1C EUR Hedged")).toBe("DWS");
    expect(extractIssuer("Amundi ETF S&P 500 UCITS ETF USD")).toBe("Amundi");
    expect(extractIssuer("UBS(Lux)Fund Solutions – MSCI Hong Kong UCITS ETF")).toBe("UBS");
  });

  it("prefers a more specific brand over a substring match", () => {
    // « Lyxor » (Amundi) doit gagner sur un éventuel « Amundi » plus bas.
    expect(extractIssuer("MULTI-UNITS LUXEMBOURG - Lyxor FTSE 100 UCITS ETF")).toBe(
      "Amundi (Lyxor)",
    );
  });

  it("returns null for an unrecognized name (never guesses)", () => {
    expect(extractIssuer("Horizon Kinetics Full-Cycle Inflation Equity Fund UCITS ETF")).toBeNull();
    expect(extractIssuer(null)).toBeNull();
    expect(extractIssuer("")).toBeNull();
  });
});

describe("inferExposureRegion", () => {
  it("reads a clear geography from the name", () => {
    expect(inferExposureRegion("iShares Core MSCI World UCITS ETF")).toBe("world");
    expect(inferExposureRegion("Amundi S&P 500 UCITS ETF")).toBe("us");
    expect(inferExposureRegion("iShares Core MSCI EMU UCITS ETF")).toBe("europe");
    expect(inferExposureRegion("iShares MSCI EM ex-China UCITS ETF")).toBe("em");
    expect(inferExposureRegion("iShares Core MSCI Japan IMI UCITS ETF")).toBe("japan");
  });

  it("puts emerging before world when both could match", () => {
    expect(inferExposureRegion("iShares MSCI Emerging Markets World UCITS ETF")).toBe("em");
  });

  it("returns null when no geography is clear (sector/thematic)", () => {
    expect(inferExposureRegion("iShares Automation & Robotics UCITS ETF")).toBeNull();
    expect(inferExposureRegion(null)).toBeNull();
  });
});

describe("deriveIdentityFromName", () => {
  it("derives both fields, either may stay null", () => {
    expect(deriveIdentityFromName("iShares Core MSCI World UCITS ETF")).toEqual({
      issuer: "BlackRock",
      region: "world",
    });
    expect(deriveIdentityFromName("Some Unknown Robotics UCITS ETF")).toEqual({
      issuer: null,
      region: null,
    });
  });
});
