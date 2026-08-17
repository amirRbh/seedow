import { describe, expect, it } from "vitest";
import {
  hasFullIdentity,
  shouldActivate,
  ACTIVATION_COMPLETENESS_THRESHOLD,
  ACTIVATION_MIN_PRICE_OBS,
} from "../activation";

const fullId = {
  hasIsin: true,
  hasName: true,
  hasIssuer: true,
  hasDomicile: true,
  hasCurrency: true,
  hasTer: true,
};

describe("hasFullIdentity", () => {
  it("requires every identity field plus TER", () => {
    expect(hasFullIdentity(fullId)).toBe(true);
    expect(hasFullIdentity({ ...fullId, hasTer: false })).toBe(false);
    expect(hasFullIdentity({ ...fullId, hasIsin: false })).toBe(false);
  });
});

describe("shouldActivate", () => {
  it("activates on the completeness path", () => {
    expect(
      shouldActivate({
        completeness: ACTIVATION_COMPLETENESS_THRESHOLD,
        identity: { ...fullId, hasIsin: false },
        priceObservations: 0,
      }),
    ).toBe(true);
  });

  it("activates on the proven-tradeability path (full identity + real price series)", () => {
    expect(
      shouldActivate({
        completeness: 35, // below completeness threshold
        identity: fullId,
        priceObservations: ACTIVATION_MIN_PRICE_OBS,
      }),
    ).toBe(true);
  });

  it("does NOT activate a fully-identified fund without a real price series (anti bad-ISIN)", () => {
    expect(
      shouldActivate({
        completeness: 35,
        identity: fullId,
        priceObservations: ACTIVATION_MIN_PRICE_OBS - 1,
      }),
    ).toBe(false);
  });

  it("does NOT activate a priced fund whose identity is incomplete", () => {
    expect(
      shouldActivate({
        completeness: 35,
        identity: { ...fullId, hasIssuer: false },
        priceObservations: 500,
      }),
    ).toBe(false);
  });
});
