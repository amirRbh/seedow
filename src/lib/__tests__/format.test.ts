import { describe, it, expect } from "vitest";
import { formatPercent, formatPercentPoints, formatCurrency } from "../format";

// `Intl` insère des espaces insécables (U+00A0 / U+202F) : on les normalise
// pour des assertions lisibles.
const norm = (s: string) => s.replace(/[\u00a0\u202f]/g, " ");

describe("formatPercent (fraction)", () => {
  it("traite son entrée comme une fraction", () => {
    expect(norm(formatPercent(0.0743, "fr"))).toBe("7,43 %");
  });
});

describe("formatPercentPoints (points de pourcentage)", () => {
  it("rend un rendement en points sans le multiplier par 100", () => {
    // Régression : -0,79 € sur 112,00 € investis = -0,7043 point, pas -70,43 %.
    expect(norm(formatPercentPoints(-0.7043, "fr"))).toBe("-0,70 %");
  });

  it("est cohérent avec formatPercent divisé par 100", () => {
    expect(formatPercentPoints(12.5, "fr")).toBe(formatPercent(0.125, "fr"));
  });

  it("évite le « -0,00 % » sur une variation négligeable", () => {
    expect(norm(formatPercentPoints(-0.0001, "fr"))).toBe("0,00 %");
  });

  it("respecte la précision demandée", () => {
    expect(norm(formatPercentPoints(-0.7043, "fr", 1))).toBe("-0,7 %");
  });
});

describe("formatCurrency", () => {
  it("évite le « -0,00 € »", () => {
    expect(norm(formatCurrency(-0.001, "fr"))).toBe("0,00 €");
  });
});
