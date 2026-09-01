import { describe, it, expect } from "vitest";
import { assertComparable, canCompare, groupByPeers, peerGroupKey } from "../peer-group";

const nuclear = { assetClass: "thematic", region: "europe", declaredTheme: "climat" };
const solar = { assetClass: "thematic", region: "monde", declaredTheme: "climat" };
const bond = { assetClass: "green_bond", region: "europe", declaredTheme: "climat" };

describe("groupes de pairs — le garde-fou contre le classement toxique", () => {
  it("refuse de comparer deux fonds de zones ou de classes différentes", () => {
    expect(canCompare(nuclear, solar)).toBe(false);
    expect(canCompare(nuclear, bond)).toBe(false);
  });

  it("compare deux fonds du même groupe", () => {
    expect(canCompare(nuclear, { ...nuclear })).toBe(true);
  });

  it("échoue bruyamment sur un classement inter-catégories", () => {
    // Une règle qui n'est qu'écrite dans une doc finit par être contournée par
    // la surface d'affichage suivante : elle échoue ici, à l'exécution.
    expect(() => assertComparable([nuclear, solar])).toThrow(/inter-catégories/);
    expect(() => assertComparable([nuclear, { ...nuclear }])).not.toThrow();
    expect(() => assertComparable([nuclear])).not.toThrow();
  });

  it("traite une valeur manquante comme un groupe à part entière, jamais comme un joker", () => {
    expect(peerGroupKey({ assetClass: "thematic", region: null, declaredTheme: null })).toBe(
      "thematic|non_precise|non_precise",
    );
    expect(
      canCompare(nuclear, { assetClass: "thematic", region: null, declaredTheme: "climat" }),
    ).toBe(false);
  });

  it("regroupe sans jamais mélanger", () => {
    const groups = groupByPeers([nuclear, solar, bond, { ...nuclear }], (x) => x);
    expect(groups).toHaveLength(3);
    expect(groups.find((g) => g.group.key === peerGroupKey(nuclear))!.items).toHaveLength(2);
  });
});
