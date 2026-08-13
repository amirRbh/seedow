import { describe, it, expect } from "vitest";
import { weightedImpactScore, dominantCategories, topHoldingsByWeight } from "../leFilSummary";

const h = (allocationPct: number, esgScore: number, category: string) => ({
  allocationPct,
  esgScore,
  category,
});

describe("weightedImpactScore", () => {
  it("retourne null sur un portefeuille vide", () => {
    expect(weightedImpactScore([])).toBeNull();
  });

  it("retourne null si le poids total est nul", () => {
    expect(weightedImpactScore([h(0, 80, "a"), h(0, 40, "b")])).toBeNull();
  });

  it("pondère les scores ESG par l'allocation", () => {
    // 75 % à 80, 25 % à 40 → 70
    expect(weightedImpactScore([h(75, 80, "a"), h(25, 40, "b")])).toBe(70);
  });

  it("arrondit à l'entier", () => {
    // (81 + 82) / 2 = 81.5 → 82
    expect(weightedImpactScore([h(1, 81, "a"), h(1, 82, "b")])).toBe(82);
  });
});

describe("dominantCategories", () => {
  it("agrège par catégorie et trie par poids cumulé décroissant", () => {
    const res = dominantCategories([h(10, 0, "climat"), h(25, 0, "eau"), h(20, 0, "climat")]);
    // climat = 30, eau = 25
    expect(res).toEqual(["climat", "eau"]);
  });

  it("limite au nombre demandé", () => {
    const res = dominantCategories([h(5, 0, "a"), h(4, 0, "b"), h(3, 0, "c"), h(2, 0, "d")], 2);
    expect(res).toEqual(["a", "b"]);
  });

  it("remplace une catégorie vide par le fallback", () => {
    expect(dominantCategories([h(10, 0, "")])).toEqual(["Autres"]);
  });
});

describe("topHoldingsByWeight", () => {
  it("trie par poids décroissant et limite", () => {
    const items = [h(10, 0, "a"), h(50, 0, "b"), h(30, 0, "c")];
    expect(topHoldingsByWeight(items, 2).map((x) => x.category)).toEqual(["b", "c"]);
  });

  it("ne mute pas le tableau d'entrée", () => {
    const items = [h(10, 0, "a"), h(50, 0, "b")];
    topHoldingsByWeight(items);
    expect(items.map((x) => x.category)).toEqual(["a", "b"]);
  });
});
