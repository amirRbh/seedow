import { describe, it, expect } from "vitest";
import { analyzePortfolio, type AnalyzedLine } from "../analyzePortfolio";
import { makeAsset } from "../../__tests__/fixtures";
import type { PortfolioMetrics } from "../../types";

/** Métriques minimales — seules la volatilité et l'ESG comptent ici. */
function metrics(over: Partial<PortfolioMetrics> = {}): PortfolioMetrics {
  return {
    expected_return: 0.06,
    volatility: 0.1,
    sharpe: 0.3,
    esg_score: 70,
    ter: 0.002,
    carbon_intensity_gco2e_per_eur: null,
    carbon_intensity_coverage: 0,
    waci_tco2e_per_musd_sales: null,
    waci_coverage: 0,
    by_class: {} as PortfolioMetrics["by_class"],
    by_region: {},
    diversification: 0.5,
    ...over,
  };
}

const line = (id: string, weight: number, over = {}): AnalyzedLine => ({
  asset: makeAsset({ id, ...over }),
  weight,
});

describe("analyzePortfolio", () => {
  it("ne modifie jamais le portefeuille qu'il analyse", () => {
    const lines = [line("a", 0.5), line("b", 0.3)];
    const snapshot = lines.map((l) => ({ id: l.asset.id, weight: l.weight }));
    const input = { lines, causes: [], exclusions: [] } as const;

    analyzePortfolio(input);

    expect(lines.map((l) => ({ id: l.asset.id, weight: l.weight }))).toEqual(snapshot);
    expect(input.lines).toHaveLength(2);
  });

  it("rapporte la part allouée telle quelle et nomme ce qui reste", () => {
    const a = analyzePortfolio({
      lines: [line("a", 0.5), line("b", 0.3)],
      causes: [],
      exclusions: [],
    });
    expect(a.allocation.allocatedShare).toBeCloseTo(0.8, 9);
    expect(a.allocation.unallocatedShare).toBeCloseTo(0.2, 9);
    expect(a.allocation.explanation).toContain("allocation.partial");
    expect(a.tradeoffs.find((t) => t.type === "unallocated")?.vars?.pct).toBe(20);
  });

  describe("exclusions — un filtre dur, jamais une pénalité", () => {
    it("signale une infraction dès qu'un actif touche un secteur exclu", () => {
      const a = analyzePortfolio({
        lines: [line("a", 0.5, { excluded_sectors: ["fossiles"] })],
        causes: [],
        exclusions: ["fossiles"],
      });
      expect(a.alignment.exclusionsRespected).toBe(false);
      expect(a.alignment.breaches).toEqual(["fossiles"]);
      const breach = a.tradeoffs.find((t) => t.type === "exclusion_breached");
      expect(breach?.severity).toBe("critical");
    });

    it("ne signale rien quand les exclusions sont tenues", () => {
      const a = analyzePortfolio({
        lines: [line("a", 0.5, { excluded_sectors: ["tabac"] })],
        causes: [],
        exclusions: ["fossiles"],
      });
      expect(a.alignment.exclusionsRespected).toBe(true);
      expect(a.alignment.breaches).toEqual([]);
    });
  });

  describe("convictions — l'alignement se mesure, il ne s'invente pas", () => {
    it("pondère l'exposition réelle des actifs", () => {
      const a = analyzePortfolio({
        lines: [
          line("a", 0.5, { cause_exposure: { climat: 0.8 } }),
          line("b", 0.5, { cause_exposure: { climat: 0.4 } }),
        ],
        causes: ["climat"],
        exclusions: [],
      });
      expect(a.alignment.byConviction.climat).toBe(60);
      expect(a.alignment.overall).toBe(60);
    });

    it("rend null plutôt qu'un zéro quand aucune donnée d'exposition n'existe", () => {
      const a = analyzePortfolio({
        lines: [line("a", 1, { cause_exposure: {} })],
        causes: ["climat"],
        exclusions: [],
      });
      expect(a.alignment.byConviction.climat).toBeNull();
      expect(a.alignment.overall).toBeNull();
      expect(a.alignment.explanation).toContain("alignment.no_exposure_data");
    });

    it("écarte du calcul l'actif sans donnée, sans le compter comme désaligné", () => {
      const withData = analyzePortfolio({
        lines: [line("a", 0.5, { cause_exposure: { climat: 0.8 } })],
        causes: ["climat"],
        exclusions: [],
      });
      const withGap = analyzePortfolio({
        lines: [
          line("a", 0.5, { cause_exposure: { climat: 0.8 } }),
          line("b", 0.5, { cause_exposure: {} }),
        ],
        causes: ["climat"],
        exclusions: [],
      });
      expect(withGap.alignment.byConviction.climat).toBe(withData.alignment.byConviction.climat);
    });
  });

  describe("finance et valeurs restent séparées", () => {
    it("l'horizon ne touche pas à l'alignement", () => {
      const lines = [line("a", 1, { cause_exposure: { climat: 0.6 } })];
      const short = analyzePortfolio({
        lines,
        causes: ["climat"],
        exclusions: [],
        horizonYears: 1,
        metrics: metrics({ volatility: 0.2 }),
      });
      const long = analyzePortfolio({
        lines,
        causes: ["climat"],
        exclusions: [],
        horizonYears: 25,
        metrics: metrics({ volatility: 0.2 }),
      });
      expect(short.alignment.overall).toBe(long.alignment.overall);
      // Seule la lecture financière bouge.
      expect(short.horizon.fit).toBe("weak");
      expect(long.horizon.fit).toBe("good");
    });

    it("classe le risque sur la seule volatilité", () => {
      const lines = [line("a", 1)];
      const base = { lines, causes: [], exclusions: [] };
      expect(analyzePortfolio({ ...base, metrics: metrics({ volatility: 0.05 }) }).risk.level).toBe(
        "low",
      );
      expect(analyzePortfolio({ ...base, metrics: metrics({ volatility: 0.1 }) }).risk.level).toBe(
        "moderate",
      );
      expect(analyzePortfolio({ ...base, metrics: metrics({ volatility: 0.2 }) }).risk.level).toBe(
        "high",
      );
    });
  });

  describe("données manquantes → unknown, jamais une valeur inventée", () => {
    it("sans métriques, risque et horizon restent inconnus", () => {
      const a = analyzePortfolio({
        lines: [line("a", 1)],
        causes: [],
        exclusions: [],
        horizonYears: 10,
      });
      expect(a.risk.level).toBe("unknown");
      expect(a.risk.volatility).toBeNull();
      expect(a.horizon.fit).toBe("unknown");
    });

    it("sur un portefeuille vide, tout est null ou unknown", () => {
      const a = analyzePortfolio({ lines: [], causes: ["climat"], exclusions: [] });
      expect(a.diversification.score).toBeNull();
      expect(a.diversification.concentration).toBe("unknown");
      expect(a.costs.weightedTer).toBeNull();
      expect(a.dataQuality.overall).toBe("unknown");
      expect(a.dataQuality.coverage).toBeNull();
    });

    it("n'annonce jamais de look-through sans holdings", () => {
      const a = analyzePortfolio({ lines: [line("a", 1)], causes: [], exclusions: [] });
      expect(a.exposure.byCompany).toBeNull();
    });
  });

  describe("concentration", () => {
    it("se lit sur la part allouée, pas sur le montant total", () => {
      // Une seule ligne à 10 % : dominante sur ce qui est placé.
      const a = analyzePortfolio({ lines: [line("a", 0.1)], causes: [], exclusions: [] });
      expect(a.diversification.largestPosition).toBeCloseTo(1, 9);
      expect(a.diversification.concentration).toBe("high");
      expect(a.diversification.score).toBeCloseTo(0, 9);
    });

    it("reste basse sur un portefeuille réparti", () => {
      const a = analyzePortfolio({
        lines: [line("a", 0.2), line("b", 0.2), line("c", 0.2), line("d", 0.2), line("e", 0.2)],
        causes: [],
        exclusions: [],
      });
      expect(a.diversification.concentration).toBe("low");
      expect(a.diversification.positionCount).toBe(5);
    });
  });

  it("mesure les frais sur la part placée", () => {
    const a = analyzePortfolio({
      lines: [line("a", 0.5, { ter: 0.004 })],
      causes: [],
      exclusions: [],
    });
    expect(a.costs.weightedTer).toBeCloseTo(0.002, 9);
  });
});
