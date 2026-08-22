import { describe, expect, it } from "vitest";
import { compareAssets, selectCandidates, type CandidatePoolItem } from "../engine";
import type { MatchResult, DimensionContribution } from "@/lib/matching/types";
import type { MatchDimension } from "@/lib/preferences/dimensions";

function contrib(dimension: MatchDimension, satisfaction: number): DimensionContribution {
  return { dimension, weight: 1, coverage: 1, satisfaction, share: 0 };
}

function result(
  id: string,
  sats: Partial<Record<MatchDimension, number>>,
  over: Partial<MatchResult> = {},
): MatchResult {
  return {
    assetId: id,
    scorable: true,
    score: 0.7,
    coverage: 0.7,
    band: "good",
    displayPercent: null,
    contributions: Object.entries(sats).map(([d, s]) => contrib(d as MatchDimension, s as number)),
    missing: [],
    ...over,
  };
}

describe("compareAssets — bidirectionnel", () => {
  it("sépare améliorations et régressions (jamais un verdict global)", () => {
    const a = result("A", { climate: 0.4, cost: 0.9 });
    const b = result("B", { climate: 0.8, cost: 0.6 });
    const cmp = compareAssets(a, b);
    expect(cmp.improvements.map((d) => d.dimension)).toContain("climate");
    expect(cmp.regressions.map((d) => d.dimension)).toContain("cost");
    // Aucun champ « meilleur » : la structure force le compromis.
    expect(cmp).not.toHaveProperty("better");
  });

  it("symétrie : improvements(A→B) == regressions(B→A)", () => {
    const a = result("A", { climate: 0.4, cost: 0.9 });
    const b = result("B", { climate: 0.8, cost: 0.6 });
    const ab = compareAssets(a, b);
    const ba = compareAssets(b, a);
    expect(ab.improvements.map((d) => d.dimension).sort()).toEqual(
      ba.regressions.map((d) => d.dimension).sort(),
    );
  });

  it("ne compare que les dimensions couvertes des deux côtés", () => {
    const a = result("A", { climate: 0.5, cost: 0.5 });
    const b = result("B", { climate: 0.9 }); // cost non couvert chez B
    const cmp = compareAssets(a, b);
    const dims = [...cmp.improvements, ...cmp.regressions, ...cmp.unchanged].map(
      (d) => d.dimension,
    );
    expect(dims).toContain("climate");
    expect(dims).not.toContain("cost");
  });

  it("écarts triés par magnitude décroissante", () => {
    const a = result("A", { climate: 0.5, cost: 0.5, esg_quality: 0.5 });
    const b = result("B", { climate: 0.9, cost: 0.55, esg_quality: 0.95 });
    const cmp = compareAssets(a, b);
    expect(cmp.improvements[0].dimension).not.toBe("cost"); // le plus petit écart n'est pas en tête
    expect(Math.abs(cmp.improvements[0].delta)).toBeGreaterThanOrEqual(
      Math.abs(cmp.improvements[1].delta),
    );
  });

  it("non comparable si un actif n'est pas scorable", () => {
    const a = result("A", { climate: 0.5 });
    const b = result("B", { climate: 0.9 }, { scorable: false, score: null, band: "not_scored" });
    expect(compareAssets(a, b).comparable).toBe(false);
  });

  it("expose la variation de couverture (confiance) et de bande", () => {
    const a = result("A", { climate: 0.5 }, { coverage: 0.6, band: "partial" });
    const b = result("B", { climate: 0.9 }, { coverage: 0.8, band: "good" });
    const cmp = compareAssets(a, b);
    expect(cmp.coverageDelta).toBeCloseTo(0.2, 6);
    expect(cmp.bandChange).toEqual({ from: "partial", to: "good" });
  });
});

describe("selectCandidates — comparables, jamais un seul", () => {
  const pool: CandidatePoolItem[] = [
    { id: "A", assetClass: "equity_dev", matchScore: 0.9 },
    { id: "B", assetClass: "equity_dev", matchScore: 0.8 },
    { id: "C", assetClass: "equity_dev", matchScore: 0.6 },
    { id: "D", assetClass: "green_bond", matchScore: 0.95 }, // autre classe
    { id: "E", assetClass: "equity_dev", matchScore: null }, // non scorable
  ];

  it("même classe uniquement, exclut le courant, exclut les non scorables", () => {
    const cands = selectCandidates("A", "equity_dev", pool);
    expect(cands.map((c) => c.id)).toEqual(["B", "C"]);
  });

  it("classe par correspondance décroissante et borne à `limit`", () => {
    const cands = selectCandidates("A", "equity_dev", pool, 1);
    expect(cands.map((c) => c.id)).toEqual(["B"]);
  });

  it("ne mélange jamais les classes d'actifs (substitution comparable)", () => {
    const cands = selectCandidates("A", "equity_dev", pool);
    expect(cands.some((c) => c.assetClass !== "equity_dev")).toBe(false);
  });
});
