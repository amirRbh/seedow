import { describe, expect, it } from "vitest";
import {
  buildEsgIndicators,
  confidenceOf,
  describeEsgLayers,
  gatedPillarScore,
  INDICATOR_GRID,
  parseSfdrArticle,
  pillarCoverage,
} from "../framework";
import type { ObservatoryFund } from "../v2/observatory";

type FundLike = Pick<ObservatoryFund, "sfdrArticle" | "sectors" | "themes" | "sti">;

const baseFund = (over: Partial<FundLike> = {}): FundLike => ({
  sfdrArticle: 9,
  sectors: [
    { sector: "fossiles", level: "exclu_seuil_quantifie", source_document: "Prospectus", source_url: null, date: "2026-03-01" },
    { sector: "armement", level: "non_verifie", source_document: null, source_url: null, date: null },
  ],
  themes: [{ tag: "climat", level: "revendique", evidence: "clean energy", source_document: "Nom" }],
  sti: {
    version: "2.0",
    score: null,
    label: "non_notable",
    blocks: [{ id: "C", earned: 0, max: 25, evaluable: false, unverifiedSignals: ["pai_published"] }],
    blocksEvaluated: 0,
    blocksTotal: 5,
    publishable: false,
    unverifiedSignals: ["pai_published"],
    oldestDataDate: null,
    freshestDataDate: null,
  } as unknown as FundLike["sti"],
  ...over,
});

describe("article SFDR déclaré", () => {
  it("lit les libellés d'émetteur", () => {
    expect(parseSfdrArticle("Article 8")).toBe(8);
    expect(parseSfdrArticle("article 9 ")).toBe(9);
    expect(parseSfdrArticle("Other")).toBe(6);
    expect(parseSfdrArticle("n/a")).toBeNull();
    expect(parseSfdrArticle(null)).toBeNull();
  });
});

describe("six couches distinctes", () => {
  it("rend toujours les six couches, dans l'ordre", () => {
    expect(describeEsgLayers({ fund: null }).map((l) => l.id)).toEqual([
      "regulatory", "esg_risk", "characteristics", "taxonomy", "pai", "impact",
    ]);
  });

  it("l'impact réel n'est jamais présenté comme mesuré", () => {
    const impact = describeEsgLayers({ fund: baseFund() }).find((l) => l.id === "impact")!;
    expect(impact.status).toBe("UNAVAILABLE");
    expect(impact.value).toBe("not_measured");
  });

  it("un Article 9 n'implique ni alignement Taxonomie ni PAI publiés", () => {
    const layers = describeEsgLayers({ fund: baseFund({ sfdrArticle: 9 }) });
    expect(layers.find((l) => l.id === "taxonomy")!.status).toBe("UNAVAILABLE");
    expect(layers.find((l) => l.id === "pai")!.status).toBe("UNAVAILABLE");
  });

  it("une contradiction catalogue / émetteur est signalée, l'émetteur fait foi", () => {
    const reg = describeEsgLayers({
      fund: baseFund({ sfdrArticle: 9 }),
      issuer: { sfdrDeclared: "Article 8", asOf: "2026-11-17", source: "iShares" },
    })[0];
    expect(reg.params).toEqual({ article: 8 });
    expect(reg.conflict).toEqual({
      code: "sfdr_mismatch",
      params: { declared: 8, catalog: 9, asOf: "2026-11-17" },
    });
  });

  it("caractéristiques : seules les exclusions DOCUMENTÉES comptent", () => {
    const c = describeEsgLayers({ fund: baseFund() }).find((l) => l.id === "characteristics")!;
    expect(c.params).toMatchObject({ documented: 1, excluded: 1, total: 2, claimed: 1 });
  });
});

describe("indicateurs par pilier et couverture", () => {
  const indicators = buildEsgIndicators({ fund: baseFund(), energySectorPct: 4.22, energyAsOf: "2026-11-16" });

  it("chaque case de la grille est rendue, les manquantes en UNAVAILABLE", () => {
    const total = INDICATOR_GRID.E.length + INDICATOR_GRID.S.length + INDICATOR_GRID.G.length;
    expect(indicators).toHaveLength(total);
    expect(indicators.find((i) => i.id === "board_independence")!.status).toBe("UNAVAILABLE");
  });

  it("une politique « non vérifiée » ne remplit pas l'indicateur", () => {
    expect(indicators.find((i) => i.id === "weapons_exclusion_policy")!.status).toBe("UNAVAILABLE");
    expect(indicators.find((i) => i.id === "fossil_exclusion_policy")!.value).toBe("exclu_seuil_quantifie");
  });

  it("couverture E = 2/6, confiance insuffisante", () => {
    const e = pillarCoverage(indicators).find((p) => p.pillar === "E")!;
    expect(e.available).toBe(2);
    expect(e.coveragePct).toBeCloseTo((2 / 6) * 100, 10);
    expect(e.confidence).toBe("low");
  });
});

describe("note composite gardée par la couverture", () => {
  const grid = ["a", "b", "c", "d", "e"];

  it("couverture insuffisante : pas de note, même si les cases connues sont excellentes", () => {
    const r = gatedPillarScore(new Map([["a", 100], ["b", 100]]), grid);
    expect(r.score).toBeNull();
    expect(r.coveragePct).toBe(40);
  });

  it("couverture suffisante : moyenne des seules cases connues, bornée 0..100", () => {
    const r = gatedPillarScore(new Map([["a", 80], ["b", 60], ["c", 120]]), grid);
    expect(r.score).toBeCloseTo((80 + 60 + 100) / 3, 10);
    expect(r.confidence).toBe("medium");
  });

  it("seuils de confiance publics", () => {
    expect(confidenceOf(80)).toBe("high");
    expect(confidenceOf(60)).toBe("medium");
    expect(confidenceOf(30)).toBe("low");
    expect(confidenceOf(29.9)).toBe("insufficient");
  });
});
