import { describe, expect, it } from "vitest";
import { impactRating } from "../impact";

describe("impactRating", () => {
  it("classe les scores élevés en « fort » (mint)", () => {
    expect(impactRating(10)).toEqual({ level: "fort", tone: "mint" });
    expect(impactRating(8)).toEqual({ level: "fort", tone: "mint" });
  });

  it("classe les bons scores en « solide » (mint)", () => {
    expect(impactRating(7.4)).toEqual({ level: "solide", tone: "mint" });
    expect(impactRating(6.5)).toEqual({ level: "solide", tone: "mint" });
  });

  it("classe les scores moyens en « correct » (neutre)", () => {
    expect(impactRating(6)).toEqual({ level: "correct", tone: "ink" });
    expect(impactRating(5)).toEqual({ level: "correct", tone: "ink" });
  });

  it("classe les scores bas en « limité » (atténué), jamais en rouge alerte", () => {
    expect(impactRating(4.9)).toEqual({ level: "limite", tone: "muted" });
    expect(impactRating(0)).toEqual({ level: "limite", tone: "muted" });
  });

  it("est monotone : le niveau ne régresse jamais quand le score monte", () => {
    const order: Record<string, number> = { limite: 0, correct: 1, solide: 2, fort: 3 };
    let prev = -1;
    for (let s = 0; s <= 10; s += 0.5) {
      const rank = order[impactRating(s).level];
      expect(rank).toBeGreaterThanOrEqual(prev);
      prev = rank;
    }
  });
});
