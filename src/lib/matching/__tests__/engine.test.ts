import { describe, expect, it } from "vitest";
import { defaultDimensionWeights, normalizeWeights } from "@/lib/preferences/model";
import { MATCH_DIMENSIONS } from "@/lib/preferences/dimensions";
import {
  computeAssetSignals,
  matchAsset,
  matchUniverse,
  riskToleranceToTargetLevel,
} from "../index";
import type { MatchAssetInput, MatchContext } from "../types";

function asset(over: Partial<MatchAssetInput> = {}): MatchAssetInput {
  return {
    id: "a",
    terPct: 0.2,
    riskLevel: 4,
    waci: 60,
    climateScore: 7,
    esgScore: 7,
    controversyBand: null,
    dataCoverage: "complete",
    ...over,
  };
}

const ctx: MatchContext = { targetRiskLevel: 4 };

describe("computeAssetSignals — honnêteté de la couverture", () => {
  const sig = computeAssetSignals(asset(), ctx);

  it("les dimensions dépendantes du look-through sont non couvertes (jamais inventées)", () => {
    expect(sig.values_alignment.coverage).toBe(0);
    expect(sig.values_alignment.uncoveredReason).toBe("requires_holdings");
    expect(sig.harm_avoidance.uncoveredReason).toBe("requires_holdings");
  });
  it("la diversification n'est pas jugée sur un actif isolé", () => {
    expect(sig.diversification.uncoveredReason).toBe("requires_collection");
  });
  it("les dimensions mesurées portent une satisfaction et un label", () => {
    expect(sig.cost.satisfaction).not.toBeNull();
    expect(sig.cost.measuredLabel).toContain("TER");
    expect(sig.climate.measuredLabel).toContain("WACI");
  });
  it("risk_fit exige la tolérance déclarée (sinon requires_user_context)", () => {
    const noCtx = computeAssetSignals(asset(), { targetRiskLevel: null });
    expect(noCtx.risk_fit.uncoveredReason).toBe("requires_user_context");
  });
  it("climat retombe sur le score de pilier (couverture réduite) sans WACI", () => {
    const s = computeAssetSignals(asset({ waci: null, climateScore: 8 }), ctx);
    expect(s.climate.satisfaction).not.toBeNull();
    expect(s.climate.coverage).toBeLessThan(1);
  });
});

describe("matchAsset — agrégation & garde-fous", () => {
  it("un bon actif obtient une bande forte quand la couverture le permet", () => {
    const r = matchAsset(
      asset({ terPct: 0.1, waci: 20, esgScore: 9, riskLevel: 4 }),
      defaultDimensionWeights(),
      ctx,
    );
    expect(r.scorable).toBe(true);
    expect(["good", "strong"]).toContain(r.band);
  });

  it("REFUSE de scorer quand la couverture passe sous le plancher", () => {
    // L'utilisateur ne pondère QUE des dimensions dépendantes du look-through.
    const weights = normalizeWeights(Object.fromEntries(MATCH_DIMENSIONS.map((d) => [d, 0])));
    weights.values_alignment = 1;
    weights.harm_avoidance = 1;
    const r = matchAsset(asset(), weights, ctx);
    expect(r.scorable).toBe(false);
    expect(r.score).toBeNull();
    expect(r.band).toBe("not_scored");
    expect(r.missing.map((m) => m.dimension)).toEqual(
      expect.arrayContaining(["values_alignment", "harm_avoidance"]),
    );
  });

  it("la couverture pondère mais ne pénalise pas le score", () => {
    // Deux dimensions parfaites couvertes + le reste non couvert : score élevé,
    // mais couverture < 1.
    const weights = normalizeWeights(Object.fromEntries(MATCH_DIMENSIONS.map((d) => [d, 0])));
    weights.cost = 1;
    weights.disclosure = 1;
    const r = matchAsset(asset({ terPct: 0.1, dataCoverage: "complete" }), weights, ctx);
    expect(r.score).toBeGreaterThan(0.9);
    expect(r.coverage).toBe(1); // les deux seules dimensions pondérées sont couvertes
  });

  it("n'affiche un pourcentage qu'au-delà d'une couverture élevée (§6.4)", () => {
    // Couverture partielle (défauts : ~la moitié des dimensions non couvertes).
    const partial = matchAsset(asset(), defaultDimensionWeights(), ctx);
    expect(partial.coverage).toBeLessThan(0.8);
    expect(partial.displayPercent).toBeNull();
    expect(partial.band).not.toBe("not_scored");
  });

  it("les contributions sont triées par part et portent la satisfaction (le « pourquoi »)", () => {
    const r = matchAsset(asset(), defaultDimensionWeights(), ctx);
    expect(r.contributions.length).toBeGreaterThan(0);
    for (let i = 1; i < r.contributions.length; i++) {
      expect(r.contributions[i - 1].share).toBeGreaterThanOrEqual(r.contributions[i].share);
    }
    // Une dimension mesurée mais faible reste listée (contribution honnête, pas cachée).
    const weak = matchAsset(asset({ terPct: 0.9 }), defaultDimensionWeights(), ctx);
    const cost = weak.contributions.find((c) => c.dimension === "cost");
    expect(cost).toBeDefined();
    expect(cost?.satisfaction).toBeLessThan(0.2);
  });
});

describe("matchUniverse — classement honnête", () => {
  it("classe les scorables par score et met les non scorables à part", () => {
    const assets = [
      asset({ id: "great", terPct: 0.1, waci: 20, esgScore: 9 }),
      asset({ id: "poor", terPct: 0.7, waci: 200, esgScore: 3 }),
      asset({
        id: "blind",
        terPct: null,
        waci: null,
        climateScore: null,
        esgScore: null,
        dataCoverage: null,
        riskLevel: null,
      }),
    ];
    const res = matchUniverse(assets, defaultDimensionWeights(), ctx);
    expect(res.analyzed).toBe(3);
    expect(res.ranked[0].assetId).toBe("great");
    expect(res.ranked.map((r) => r.assetId)).toContain("poor");
    // "blind" n'a aucune donnée → non scorable, jamais classé au rang des autres.
    expect(res.unscored.map((r) => r.assetId)).toContain("blind");
  });

  it("deux profils de poids opposés produisent des classements différents (personnalisation réelle)", () => {
    const assets = [
      asset({ id: "cheap-dirty", terPct: 0.05, waci: 220, esgScore: 4 }),
      asset({ id: "green-pricey", terPct: 0.6, waci: 15, esgScore: 9 }),
    ];
    // Poids partant de zéro (l'utilisateur ne pèse QUE des dimensions couvertes),
    // sinon les défauts sur les dimensions non couvertes feraient chuter la
    // couverture sous le plancher — comportement correct, mais on isole ici le tri.
    const zero = () => normalizeWeights(Object.fromEntries(MATCH_DIMENSIONS.map((d) => [d, 0])));
    const costLover = {
      ...zero(),
      cost: 1,
      climate: 0.05,
      esg_quality: 0.05,
      disclosure: 0.2,
      risk_fit: 0.2,
    };
    const climateLover = {
      ...zero(),
      cost: 0.05,
      climate: 1,
      esg_quality: 0.8,
      disclosure: 0.2,
      risk_fit: 0.2,
    };
    const a = matchUniverse(assets, costLover, ctx).ranked[0].assetId;
    const b = matchUniverse(assets, climateLover, ctx).ranked[0].assetId;
    expect(a).toBe("cheap-dirty");
    expect(b).toBe("green-pricey");
    expect(a).not.toBe(b);
  });
});

describe("riskToleranceToTargetLevel", () => {
  it("mappe la tolérance vers un SRRI cible, null si non déclarée", () => {
    expect(riskToleranceToTargetLevel("prudent")).toBe(3);
    expect(riskToleranceToTargetLevel("dynamique")).toBe(5.5);
    expect(riskToleranceToTargetLevel(null)).toBeNull();
  });
});
