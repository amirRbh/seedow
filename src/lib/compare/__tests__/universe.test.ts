import { describe, expect, it } from "vitest";
import {
  buildUniverse,
  csvCell,
  dataCoveragePct,
  screen,
  toCsv,
  type SnapshotSide,
} from "../universe";
import type { ObservatoryFund } from "@/lib/esg/v2/observatory";

const catalogFund = (over: Partial<ObservatoryFund>): ObservatoryFund =>
  ({
    key: "k",
    slug: "IE00B1XNHC34",
    name: "Clean Energy",
    issuer: "iShares",
    isins: ["IE00B1XNHC34"],
    tickers: [],
    assetIds: [],
    assetClass: "thematic",
    sfdrArticle: 9,
    ter: 0.0065,
    sti: { blocksEvaluated: 0, blocksTotal: 5 },
    discrepancies: [],
    themes: [],
    sectors: [
      {
        sector: "fossiles",
        level: "non_verifie",
        source_document: null,
        source_url: null,
        date: null,
      },
    ],
    peer: { key: "p", assetClass: "thematic", region: null, declaredTheme: null },
    ...over,
  }) as unknown as ObservatoryFund;

const snap: SnapshotSide = {
  isin: "IE00B1XNHC34",
  name: "iShares Global Clean Energy Transition UCITS ETF",
  issuer: "iShares (BlackRock)",
  domicile: "Ireland",
  currency: "USD",
  sourceUrl: "https://www.blackrock.com/example",
  sfdrDeclared: "Article 8",
  navAsOf: "2026-11-17",
  ter: 0.0065,
  benchmark: "S&P Global Clean Energy Transition",
  holdingsCount: 132,
  energySectorPct: 0,
  annualized: { 1: -0.1, 3: 0.07, 5: -0.08 },
  volatility3y: 0.27,
  maxDrawdown5y: -0.5,
  excess3y: null,
  perfFrequency: "daily",
  perfAsOf: "2026-11-17",
  thirdParty: null,
};

describe("univers fusionné", () => {
  it("rattache l'instantané par ISIN et signale l'écart SFDR catalogue / émetteur", () => {
    const [row] = buildUniverse([catalogFund({})], [snap]);
    expect(row.snapshot?.isin).toBe("IE00B1XNHC34");
    expect(row.sfdrCatalog).toBe(9);
    expect(row.sfdrDeclared).toBe(8);
    expect(row.sfdrConflict).toBe(true);
  });

  it("un fonds de l'instantané absent du catalogue est ajouté, sans champ inventé", () => {
    const rows = buildUniverse([], [snap]);
    expect(rows).toHaveLength(1);
    expect(rows[0].sfdrCatalog).toBeNull();
    expect(rows[0].stiBlocksEvaluated).toBeNull();
  });
});

describe("filtres", () => {
  const rows = buildUniverse(
    [
      catalogFund({}),
      catalogFund({
        key: "b",
        name: "Bond",
        isins: ["FR0000000001"],
        sfdrArticle: null,
        ter: null,
      }),
    ],
    [snap],
  );

  it("l'article déclaré par l'émetteur prime pour le filtrage", () => {
    expect(screen(rows, { sfdr: "8" }).map((r) => r.name)).toEqual(["Clean Energy"]);
    expect(screen(rows, { sfdr: "9" })).toHaveLength(0);
  });

  it("un TER inconnu ne passe pas un filtre de frais", () => {
    expect(screen(rows, { maxTer: 0.01 }).map((r) => r.name)).toEqual(["Clean Energy"]);
  });

  it("une politique « non vérifiée » ne passe pas le filtre d'exclusion documentée", () => {
    expect(screen(rows, { fossilPolicyDocumented: true })).toHaveLength(0);
  });

  it("article inconnu", () => {
    expect(screen(rows, { sfdr: "unknown" }).map((r) => r.name)).toEqual(["Bond"]);
  });
});

describe("couverture des données", () => {
  it("compte les seuls champs réellement renseignés", () => {
    const [row] = buildUniverse([catalogFund({})], [snap]);
    // isin, sfdr, ter, perf 3 ans, vol 3 ans, énergie, positions = 7 / 10.
    expect(dataCoveragePct(row)).toBeCloseTo(70, 10);
  });
});

describe("export CSV", () => {
  it("échappe guillemets, virgules et retours à la ligne", () => {
    expect(csvCell('S&P "Global", 1')).toBe('"S&P ""Global"", 1"');
    expect(csvCell(null)).toBe("");
  });
  it("neutralise l'injection de formule dans un tableur", () => {
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell(-0.05)).toBe("-0.05");
  });
  it("lignes séparées par CRLF", () => {
    expect(toCsv(["a", "b"], [[1, "x"]])).toBe("a,b\r\n1,x\r\n");
  });
});
