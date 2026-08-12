import { describe, expect, it } from "vitest";
import {
  validateHoldingsSum,
  validateReferenceDate,
  validateTer,
  validateWeight,
  worstOf,
} from "../validation";

describe("validation", () => {
  it("TER : bornes 0..10%", () => {
    expect(validateTer(0.002).status).toBe("valid");
    expect(validateTer(null).status).toBe("review_required");
    expect(validateTer(0.5).status).toBe("rejected");
    expect(validateTer(-0.01).status).toBe("rejected");
  });

  it("poids : bornes 0..100%", () => {
    expect(validateWeight(4.2).status).toBe("valid");
    expect(validateWeight(150).status).toBe("rejected");
    expect(validateWeight(null).status).toBe("review_required");
  });

  it("somme des poids : rejette > 100, tolère la sous-couverture", () => {
    expect(validateHoldingsSum([50, 49.5]).status).toBe("valid"); // ~100
    expect(validateHoldingsSum([60, 60]).status).toBe("rejected"); // 120
    const partial = validateHoldingsSum([10, 8, 6]); // top holdings only
    expect(partial.status).toBe("valid");
    expect(partial.reason).toMatch(/partielle/);
    expect(validateHoldingsSum([]).status).toBe("review_required");
  });

  it("date de référence : futur rejeté, ancienneté signalée", () => {
    const now = new Date("2026-08-12T00:00:00Z");
    expect(validateReferenceDate("2026-07-31", now).status).toBe("valid");
    expect(validateReferenceDate("2027-01-01", now).status).toBe("rejected");
    expect(validateReferenceDate("2024-01-01", now).status).toBe("review_required");
    expect(validateReferenceDate(null, now).status).toBe("review_required");
  });

  it("worstOf : le statut le plus sévère l'emporte", () => {
    expect(worstOf([{ status: "valid", reason: null }]).status).toBe("valid");
    expect(
      worstOf([
        { status: "valid", reason: null },
        { status: "rejected", reason: "x" },
        { status: "review_required", reason: "y" },
      ]).status,
    ).toBe("rejected");
  });
});
