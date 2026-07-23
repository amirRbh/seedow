import { describe, it, expect } from "vitest";
import {
  computeLogReturns,
  computeAssetRiskStats,
  computePairwiseCovariance,
  buildRiskModel,
  shrinkExpectedReturns,
  ledoitWolfConstantCorrelation,
  RETURN_SHRINKAGE_MIN_ASSETS,
  MIN_OBSERVATIONS,
  type AssetRiskStats,
  type PricePoint,
} from "../risk-model";

function toDate(i: number): string {
  const d = new Date(Date.UTC(2024, 0, 1 + i));
  return d.toISOString().slice(0, 10);
}

/** Construit une série de prix à partir d'une suite de rendements log exacts. */
function pricesFromReturns(returns: number[], start = 100): PricePoint[] {
  const prices: PricePoint[] = [{ date: toDate(0), close: start }];
  let p = start;
  for (let i = 0; i < returns.length; i++) {
    p *= Math.exp(returns[i]);
    prices.push({ date: toDate(i + 1), close: p });
  }
  return prices;
}

// Motif à 40 rendements (>= MIN_OBSERVATIONS), moyenne et variance calculables à la main :
// 20 valeurs à +0.02, 20 valeurs à -0.01 (alterné pair/impair).
// mean = (20*0.02 + 20*(-0.01)) / 40 = 0.005
// deviations : +0.015 (pour +0.02) et -0.015 (pour -0.01) — symétriques en valeur absolue
// sumSq = 40 * 0.015^2 = 0.009 → sample variance (n-1=39) = 0.009/39
const RET_A = Array.from({ length: 40 }, (_, k) => (k % 2 === 0 ? 0.02 : -0.01));
const RET_B_IDENTICAL = [...RET_A];
const RET_C_ANTICORRELATED = RET_A.map((r) => -r);

const DAILY_VARIANCE = 0.009 / 39;
const ANNUALIZED_VARIANCE = DAILY_VARIANCE * 252;
const ANNUALIZED_VOL = Math.sqrt(ANNUALIZED_VARIANCE);
const ANNUALIZED_RETURN = 0.005 * 252;

describe("computeLogReturns", () => {
  it("computes log returns sorted by date, empty for < 2 points", () => {
    const r = computeLogReturns([{ date: "2024-01-01", close: 100 }]);
    expect(r).toEqual([]);
  });

  it("filters out a daily return whose absolute value exceeds the outlier guard", () => {
    // Une seule journée avec un tick aberrant (x5) puis retour à la normale :
    // les deux rendements qui touchent ce tick (montée et descente) sont écartés,
    // les autres rendements normaux sont conservés.
    const prices: PricePoint[] = [
      { date: toDate(0), close: 100 },
      { date: toDate(1), close: 101 },
      { date: toDate(2), close: 500 }, // +~161% — aberrant
      { date: toDate(3), close: 101 }, // retour — aberrant aussi
      { date: toDate(4), close: 102 },
    ];
    const returns = computeLogReturns(prices);
    // 4 transitions possibles, 2 filtrées (jour2 et jour3) → 2 restantes
    expect(returns).toHaveLength(2);
    expect(returns.map((r) => r.date)).toEqual([toDate(1), toDate(4)]);
  });
});

describe("computeAssetRiskStats", () => {
  it("returns null when there are fewer than MIN_OBSERVATIONS returns", () => {
    const shortPrices = pricesFromReturns(Array(MIN_OBSERVATIONS - 2).fill(0.001));
    expect(computeAssetRiskStats(shortPrices)).toBeNull();
  });

  it("annualizes expected return and volatility from a hand-worked 40-return series", () => {
    const prices = pricesFromReturns(RET_A);
    const stats = computeAssetRiskStats(prices);
    expect(stats).not.toBeNull();
    expect(stats!.observations).toBe(40);
    expect(stats!.expectedReturn).toBeCloseTo(ANNUALIZED_RETURN, 8);
    expect(stats!.volatility).toBeCloseTo(ANNUALIZED_VOL, 8);
  });
});

describe("computePairwiseCovariance", () => {
  it("returns null when overlap is below MIN_OBSERVATIONS", () => {
    const a = pricesFromReturns(Array(MIN_OBSERVATIONS - 2).fill(0.001));
    const b = pricesFromReturns(Array(MIN_OBSERVATIONS - 2).fill(0.002));
    expect(computePairwiseCovariance(a, b)).toBeNull();
  });

  it("equals the variance for two identical return series (perfect correlation)", () => {
    const a = pricesFromReturns(RET_A);
    const b = pricesFromReturns(RET_B_IDENTICAL);
    const result = computePairwiseCovariance(a, b);
    expect(result).not.toBeNull();
    expect(result!.covariance).toBeCloseTo(ANNUALIZED_VARIANCE, 8);
  });

  it("equals minus the variance for two exactly anti-correlated series", () => {
    const a = pricesFromReturns(RET_A);
    const c = pricesFromReturns(RET_C_ANTICORRELATED);
    const result = computePairwiseCovariance(a, c);
    expect(result).not.toBeNull();
    expect(result!.covariance).toBeCloseTo(-ANNUALIZED_VARIANCE, 8);
  });
});

describe("shrinkExpectedReturns", () => {
  const mk = (expectedReturn: number, volatility: number, observations = 250): AssetRiskStats => ({
    expectedReturn,
    volatility,
    observations,
  });

  it("returns an unchanged copy below the minimum number of assets", () => {
    const input = new Map<string, AssetRiskStats>([
      ["a", mk(0.2, 0.1)],
      ["b", mk(-0.1, 0.1)],
    ]);
    expect(input.size).toBeLessThan(RETURN_SHRINKAGE_MIN_ASSETS);
    const out = shrinkExpectedReturns(input);
    expect(out.get("a")!.expectedReturn).toBe(0.2);
    expect(out.get("b")!.expectedReturn).toBe(-0.1);
    expect(out).not.toBe(input); // nouvelle Map
  });

  it("preserves the cross-sectional mean and pulls estimates toward it", () => {
    // Faible dispersion, forte incertitude (vol élevée, peu d'obs) → w proche de 1.
    const input = new Map<string, AssetRiskStats>([
      ["a", mk(0.09, 0.4, 60)],
      ["b", mk(0.1, 0.4, 60)],
      ["c", mk(0.11, 0.4, 60)],
    ]);
    const grand = (0.09 + 0.1 + 0.11) / 3;
    const out = shrinkExpectedReturns(input);
    const outMean =
      (out.get("a")!.expectedReturn + out.get("b")!.expectedReturn + out.get("c")!.expectedReturn) /
      3;
    // Invariant : la moyenne transversale est conservée.
    expect(outMean).toBeCloseTo(grand, 10);
    // Chaque estimation est ramenée vers la moyenne (écart réduit).
    expect(Math.abs(out.get("a")!.expectedReturn - grand)).toBeLessThan(Math.abs(0.09 - grand));
    expect(Math.abs(out.get("c")!.expectedReturn - grand)).toBeLessThan(Math.abs(0.11 - grand));
    // Volatilité et observations inchangées.
    expect(out.get("a")!.volatility).toBe(0.4);
    expect(out.get("a")!.observations).toBe(60);
  });

  it("applies the closed-form James-Stein weight exactly", () => {
    const input = new Map<string, AssetRiskStats>([
      ["a", mk(0.0, 0.2, 100)],
      ["b", mk(0.1, 0.2, 100)],
      ["c", mk(0.2, 0.2, 100)],
    ]);
    const mus = [0, 0.1, 0.2];
    const grand = 0.1;
    const se2 = (252 * 0.2 ** 2) / 100; // identique pour les trois
    const dispersion = mus.reduce((s, m) => s + (m - grand) ** 2, 0);
    const w = Math.min(1, ((3 - 2) * se2) / dispersion);
    const out = shrinkExpectedReturns(input);
    expect(out.get("a")!.expectedReturn).toBeCloseTo(grand + (1 - w) * (0 - grand), 12);
    expect(out.get("c")!.expectedReturn).toBeCloseTo(grand + (1 - w) * (0.2 - grand), 12);
  });
});

describe("ledoitWolfConstantCorrelation", () => {
  it("returns identity correlation and zero shrinkage below the data threshold", () => {
    const short = [Array(10).fill(0.01), Array(10).fill(-0.01)];
    const res = ledoitWolfConstantCorrelation(short);
    expect(res.delta).toBe(0);
    expect(res.shrunkCorrelation[0][0]).toBe(1);
    expect(res.shrunkCorrelation[0][1]).toBe(0);
  });

  it("keeps δ within [0,1] and the correlation matrix symmetric with unit diagonal", () => {
    // Trois séries bruitées mais déterministes (pas de dépendance à un RNG).
    const T = 120;
    const a = Array.from({ length: T }, (_, t) => Math.sin(t / 3) * 0.02);
    const b = Array.from(
      { length: T },
      (_, t) => Math.sin(t / 3 + 0.5) * 0.02 + Math.cos(t) * 0.01,
    );
    const c = Array.from({ length: T }, (_, t) => Math.cos(t / 5) * 0.02);
    const res = ledoitWolfConstantCorrelation([a, b, c]);
    expect(res.delta).toBeGreaterThanOrEqual(0);
    expect(res.delta).toBeLessThanOrEqual(1);
    for (let i = 0; i < 3; i++) {
      expect(res.shrunkCorrelation[i][i]).toBe(1);
      for (let j = 0; j < 3; j++) {
        expect(res.shrunkCorrelation[i][j]).toBeCloseTo(res.shrunkCorrelation[j][i], 12);
      }
    }
  });

  it("leaves a perfectly correlated pair unchanged (target equals sample)", () => {
    const res = ledoitWolfConstantCorrelation([RET_A, [...RET_A]]);
    // Corrélation = 1, cible r̄ = 1 → aucune modification, quel que soit δ.
    expect(res.shrunkCorrelation[0][1]).toBeCloseTo(1, 10);
  });
});

describe("buildRiskModel", () => {
  it("skips assets with insufficient history and excludes them from covariance entirely", () => {
    const pricesByAsset = new Map<string, PricePoint[]>([
      ["good", pricesFromReturns(RET_A)],
      ["short", pricesFromReturns(Array(MIN_OBSERVATIONS - 2).fill(0.001))],
    ]);
    const { stats, covariance, skipped } = buildRiskModel(pricesByAsset);
    expect(stats.has("good")).toBe(true);
    expect(stats.has("short")).toBe(false);
    expect(skipped).toEqual(["short"]);
    expect(covariance.has("good|good")).toBe(true);
    expect(covariance.has("short|short")).toBe(false);
    expect(covariance.has("good|short")).toBe(false);
  });

  it("populates the covariance matrix symmetrically, including the diagonal as variance", () => {
    const pricesByAsset = new Map<string, PricePoint[]>([
      ["a", pricesFromReturns(RET_A)],
      ["b", pricesFromReturns(RET_B_IDENTICAL)],
    ]);
    const { stats, covariance } = buildRiskModel(pricesByAsset);
    const volA = stats.get("a")!.volatility;
    expect(covariance.get("a|a")).toBeCloseTo(volA ** 2, 8);
    expect(covariance.get("a|b")).toBeCloseTo(covariance.get("b|a")!, 12);
    expect(covariance.get("a|b")).toBeCloseTo(ANNUALIZED_VARIANCE, 8);
  });
});
