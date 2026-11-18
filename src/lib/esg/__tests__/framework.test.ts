import { describe, expect, it } from "vitest";
import {
  buildEsgIndicators,
  confidenceOf,
  describeEsgLayers,
  gatedPillarScore,
  INDICATOR_GRID,
  euFrameworkApplies,
  parseSfdrArticle,
  pillarCoverage,
  type ThirdPartyFundEsg,
} from "../framework";
import type { ObservatoryFund } from "../v2/observatory";

type FundLike = Pick<ObservatoryFund, "sfdrArticle" | "sectors" | "themes" | "sti">;

const baseFund = (over: Partial<FundLike> = {}): FundLike => ({
  sfdrArticle: 9,
  sectors: [
    {
      sector: "fossiles",
      level: "exclu_seuil_quantifie",
      source_document: "Prospectus",
      source_url: null,
      date: "2026-03-01",
    },
    {
      sector: "armement",
      level: "non_verifie",
      source_document: null,
      source_url: null,
      date: null,
    },
  ],
  themes: [
    { tag: "climat", level: "revendique", evidence: "clean energy", source_document: "Nom" },
  ],
  sti: {
    version: "2.0",
    score: null,
    label: "non_notable",
    blocks: [
      { id: "C", earned: 0, max: 25, evaluable: false, unverifiedSignals: ["pai_published"] },
    ],
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
      "regulatory",
      "esg_risk",
      "characteristics",
      "taxonomy",
      "pai",
      "impact",
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
  const indicators = buildEsgIndicators({
    fund: baseFund(),
    energySectorPct: 4.22,
    energyAsOf: "2026-11-16",
  });

  it("chaque case de la grille est rendue, les manquantes en UNAVAILABLE", () => {
    const total = INDICATOR_GRID.E.length + INDICATOR_GRID.S.length + INDICATOR_GRID.G.length;
    expect(indicators).toHaveLength(total);
    expect(indicators.find((i) => i.id === "board_independence")!.status).toBe("UNAVAILABLE");
  });

  it("une politique « non vérifiée » ne remplit pas l'indicateur", () => {
    expect(indicators.find((i) => i.id === "weapons_exclusion_policy")!.status).toBe("UNAVAILABLE");
    expect(indicators.find((i) => i.id === "fossil_exclusion_policy")!.value).toBe(
      "exclu_seuil_quantifie",
    );
  });

  it("couverture E = 2/9, confiance insuffisante", () => {
    const e = pillarCoverage(indicators).find((p) => p.pillar === "E")!;
    expect(e.available).toBe(2);
    expect(e.total).toBe(9);
    expect(e.coveragePct).toBeCloseTo((2 / 9) * 100, 10);
    expect(e.confidence).toBe("insufficient");
  });
});

describe("note composite gardée par la couverture", () => {
  const grid = ["a", "b", "c", "d", "e"];

  it("couverture insuffisante : pas de note, même si les cases connues sont excellentes", () => {
    const r = gatedPillarScore(
      new Map([
        ["a", 100],
        ["b", 100],
      ]),
      grid,
    );
    expect(r.score).toBeNull();
    expect(r.coveragePct).toBe(40);
  });

  it("couverture suffisante : moyenne des seules cases connues, bornée 0..100", () => {
    const r = gatedPillarScore(
      new Map([
        ["a", 80],
        ["b", 60],
        ["c", 120],
      ]),
      grid,
    );
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

// ── Indicateurs MSCI publiés par l'émetteur (classeur iShares américain) ──

const NOW = new Date("2026-11-18T00:00:00Z");

/** Valeurs réelles du classeur ICLN au 23/10/2026 (fixture `ishares-us-workbook.xml`). */
const icln: ThirdPartyFundEsg = {
  provider: "MSCI ESG Research",
  publishedBy: "iShares (BlackRock)",
  sourceUrl: "https://www.blackrock.com/example",
  sustainability: {
    msciRating: "A",
    ratingCoveragePct: 87.91,
    qualityScore: 7.1,
    peerPercentile: 53.82,
    peerGroup: "Equity Theme - Alternative Energy",
    peerCount: 249,
    waci: 273.17,
    waciCoveragePct: 93.37,
    impliedTempRise: "> 1.5° - 2.0° C",
    itrCoveragePct: 91.88,
    asOf: "2026-10-23",
    holdingsBasisAsOf: "2026-09-30",
  },
  businessInvolvement: {
    rows: [
      { id: "controversial_weapons", label: "MSCI - Controversial Weapons", pct: 0 },
      { id: "ungc_violators", label: "MSCI - UN Global Compact Violators", pct: 0 },
      { id: "thermal_coal", label: "MSCI - Thermal Coal", pct: 0 },
      { id: "oil_sands", label: "MSCI - Oil Sands", pct: 0 },
      { id: "tobacco", label: "MSCI - Tobacco", pct: 0 },
    ],
    coveragePct: 99.85,
    asOf: "2026-11-17",
  },
};

describe("cadre européen applicable", () => {
  it("lu sur le pays de l'ISIN, null sans ISIN", () => {
    expect(euFrameworkApplies("IE00B4L5Y983")).toBe(true);
    expect(euFrameworkApplies("LU0274208692")).toBe(true);
    expect(euFrameworkApplies("US4642882249")).toBe(false);
    expect(euFrameworkApplies(null)).toBeNull();
  });
});

describe("couches ESG d'un ETF américain avec indicateurs MSCI publiés", () => {
  const layers = describeEsgLayers({
    fund: null,
    isin: "US4642882249",
    thirdParty: icln,
    issuer: { sfdrDeclared: null, asOf: "2026-11-17", source: "iShares (BlackRock)" },
    now: NOW,
  });
  const byId = (id: string) => layers.find((l) => l.id === id)!;

  it("SFDR et Taxonomie : non applicables hors UE — pas « inconnu »", () => {
    expect(byId("regulatory").value).toBe("not_applicable");
    expect(byId("regulatory").status).toBe("UNAVAILABLE");
    expect(byId("taxonomy").value).toBe("not_applicable");
  });

  it("PAI : pas de déclaration, mais les indicateurs voisins sont comptés", () => {
    expect(byId("pai").value).toBe("not_applicable_proxies");
    expect(byId("pai").params).toEqual({ proxies: 2 });
    expect(byId("pai").status).toBe("UNAVAILABLE");
  });

  it("notation MSCI reprise telle quelle, attribuée au calculateur et au diffuseur", () => {
    const risk = byId("esg_risk");
    expect(risk.status).toBe("VERIFIED");
    expect(risk.value).toBe("msci_fund_rating");
    expect(risk.params).toMatchObject({ rating: "A", quality: 7.1, coverage: 87.91 });
    expect(risk.source).toBe("MSCI ESG Research, publié par iShares (BlackRock)");
    expect(risk.asOf).toBe("2026-10-23");
  });

  it("dans un export, la notation est signalée sans sa valeur (pas de licence de redistribution)", () => {
    const exported = describeEsgLayers({
      fund: null,
      isin: "US4642882249",
      thirdParty: icln,
      exportContext: true,
      now: NOW,
    }).find((l) => l.id === "esg_risk")!;
    expect(exported.value).toBe("published_not_exported");
    expect(JSON.stringify(exported)).not.toContain('"A"');
    expect(JSON.stringify(exported)).not.toContain("7.1");
  });

  it("une notation trop ancienne passe STALE", () => {
    const old = describeEsgLayers({
      fund: null,
      isin: "US4642882249",
      thirdParty: icln,
      now: new Date("2027-06-01T00:00:00Z"),
    }).find((l) => l.id === "esg_risk")!;
    expect(old.status).toBe("STALE");
  });

  it("un fonds européen sans article connu reste « inconnu », pas « non applicable »", () => {
    const eu = describeEsgLayers({ fund: null, isin: "IE00B4L5Y983" });
    expect(eu.find((l) => l.id === "regulatory")!.value).toBe("unknown");
    expect(eu.find((l) => l.id === "taxonomy")!.value).toBe("not_collected");
    expect(eu.find((l) => l.id === "esg_risk")!.value).toBe("no_licensed_rating");
  });
});

describe("indicateurs remplis par les publications MSCI de l'émetteur", () => {
  const indicators = buildEsgIndicators({ fund: null, thirdParty: icln, now: NOW });
  const get = (id: string) => indicators.find((i) => i.id === id)!;

  it("WACI et hausse de température implicite (bande, jamais convertie)", () => {
    expect(get("carbon_intensity")).toMatchObject({ status: "VERIFIED", value: 273.17 });
    expect(get("implied_temperature_rise").value).toBe("> 1.5° - 2.0° C");
  });

  it("expositions d'activité : 0 publié est une valeur, pas une absence", () => {
    expect(get("controversial_weapons_involvement")).toMatchObject({
      status: "VERIFIED",
      value: 0,
      asOf: "2026-11-17",
    });
    expect(get("ungc_violations").value).toBe(0);
    expect(get("thermal_coal_involvement").value).toBe(0);
  });

  it("sans publication, les mêmes cases restent indisponibles", () => {
    const none = buildEsgIndicators({ fund: null });
    expect(none.find((i) => i.id === "carbon_intensity")!.status).toBe("UNAVAILABLE");
    expect(none.find((i) => i.id === "ungc_violations")!.value).toBeNull();
  });

  it("la couverture S monte avec les indicateurs publiés, sans note composite", () => {
    const s = pillarCoverage(indicators).find((p) => p.pillar === "S")!;
    expect(s.available).toBe(3);
    expect(s.total).toBe(8);
  });
});
