import { describe, expect, it } from "vitest";
import { CostBudget, MODEL_PRICES, costUsd, formatUsd, priceOf } from "../cost";

describe("coût des appels d'extraction", () => {
  it("applique le tarif du modèle servi", () => {
    // 100 000 tokens en entrée, 10 000 en sortie sur Opus 5.5 : 0,4 + 0,2 = 0,6 $
    expect(
      costUsd("claude-opus-5-5", { input_tokens: 100_000, output_tokens: 10_000 }),
    ).toBeCloseTo(0.6, 10);
  });

  it("compte l'écriture et la lecture en cache", () => {
    const c = costUsd("claude-sonnet-5-5", {
      input_tokens: 0,
      output_tokens: 0,
      cache_creation_input_tokens: 1_000_000,
      cache_read_input_tokens: 1_000_000,
    });
    expect(c).toBeCloseTo(2 * 1.25 + 0.1, 10);
  });

  it("facture un modèle inconnu au tarif le plus élevé connu (prudent)", () => {
    const max = Math.max(...Object.values(MODEL_PRICES).map((p) => p.output));
    expect(priceOf("modele-inconnu").output).toBe(max);
  });

  it("refuse un appel qui ferait dépasser le plafond, impute le coût réel", () => {
    const b = new CostBudget(1);
    const est = b.estimate("claude-opus-5-5", 50_000, 32_000); // 0,2 + 0,64
    expect(est).toBeCloseTo(0.84, 10);
    expect(b.canAfford(est)).toBe(true);
    b.record("claude-opus-5-5", { input_tokens: 50_000, output_tokens: 20_000 }); // 0,6
    expect(b.spentUsd).toBeCloseTo(0.6, 10);
    expect(b.canAfford(est)).toBe(false);
    expect(b.callCount).toBe(1);
  });

  it("rejette un plafond nul, négatif ou non numérique", () => {
    expect(() => new CostBudget(0)).toThrow();
    expect(() => new CostBudget(-1)).toThrow();
    expect(() => new CostBudget(Number.NaN)).toThrow();
  });

  it("formate en dollars", () => {
    expect(formatUsd(0.12345)).toBe("0.1235 $");
    expect(formatUsd(12.5)).toBe("12.50 $");
  });
});
