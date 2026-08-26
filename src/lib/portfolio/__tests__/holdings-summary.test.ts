import { describe, it, expect } from "vitest";
import { summarizeHoldings } from "../holdings-summary";

const h = (name: string, sector: string | null, weightPct: number | null) => ({
  name,
  ticker: null,
  sector,
  weightPct,
});

describe("synthèse d'une composition", () => {
  it("classe les secteurs par poids cumulé", () => {
    const s = summarizeHoldings([
      h("A", "Technologie", 20),
      h("B", "Santé", 30),
      h("C", "Technologie", 25),
    ]);
    expect(s.topSectors).toEqual([
      { sector: "Technologie", weightPct: 45 },
      { sector: "Santé", weightPct: 30 },
    ]);
  });

  it("écarte les secteurs non renseignés plutôt que d'inventer « Autres »", () => {
    // Un « Autres » à 40 % laisserait croire à une catégorie réelle.
    const s = summarizeHoldings([h("A", null, 40), h("B", "Santé", 30)]);
    expect(s.topSectors).toEqual([{ sector: "Santé", weightPct: 30 }]);
  });

  it("rend la somme publiée telle quelle, sans la ramener à 100", () => {
    const s = summarizeHoldings([h("A", "S", 60), h("B", "S", 32)]);
    expect(s.totalWeightPct).toBe(92);
  });

  it("ignore les poids absents, nuls ou négatifs", () => {
    const s = summarizeHoldings([
      h("A", "S", 10),
      h("Sans poids", "S", null),
      h("Zéro", "S", 0),
      h("Négatif", "S", -5),
    ]);
    expect(s.count).toBe(1);
    expect(s.topHoldings.map((x) => x.name)).toEqual(["A"]);
  });

  it("trie les positions du plus gros poids au plus petit", () => {
    const s = summarizeHoldings([h("Petit", "S", 1), h("Gros", "S", 9)]);
    expect(s.topHoldings.map((x) => x.name)).toEqual(["Gros", "Petit"]);
  });

  it("rend une synthèse vide sans lever — c'est le cas de la plupart des fonds", () => {
    expect(summarizeHoldings([])).toEqual({
      topSectors: [],
      topHoldings: [],
      totalWeightPct: 0,
      count: 0,
    });
  });

  it("borne le nombre de lignes rendues", () => {
    const many = Array.from({ length: 500 }, (_, i) => h(`T${i}`, "S", 500 - i));
    const s = summarizeHoldings(many, { top: 10 });
    expect(s.topHoldings).toHaveLength(10);
    // Le compte, lui, reste celui de la composition entière.
    expect(s.count).toBe(500);
  });
});
