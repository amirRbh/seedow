import { describe, it, expect } from "vitest";
import {
  computeMaxDrawdown,
  summarizePerformance,
  runBacktest,
  type BacktestConfig,
} from "../backtest";
import type { PricePoint } from "@/lib/market/risk-model";
import { makeAsset, defaultParams } from "./fixtures";
import type { Asset } from "../types";

describe("computeMaxDrawdown", () => {
  it("is zero for a monotonically increasing curve", () => {
    expect(computeMaxDrawdown([1, 1.1, 1.2, 1.5])).toBe(0);
  });

  it("captures the largest peak-to-trough loss", () => {
    // pic à 2, creux à 1 → drawdown = 50%
    expect(computeMaxDrawdown([1, 2, 1.5, 1, 1.8])).toBeCloseTo(0.5, 10);
  });
});

describe("summarizePerformance", () => {
  it("builds a base-1 curve and annualizes correctly", () => {
    // 252 jours à +0.1%/jour ⇒ finalValue = 1.001^252, CAGR ≈ (1.001^252)-1 sur 1 an
    const daily = Array(252).fill(0.001);
    const { curve, perf } = summarizePerformance(daily, 0);
    expect(curve[0]).toBe(1);
    expect(curve).toHaveLength(253);
    expect(perf.finalValue).toBeCloseTo(1.001 ** 252, 8);
    expect(perf.annualizedReturn).toBeCloseTo(1.001 ** 252 - 1, 8);
    // rendements constants ⇒ vol réalisée nulle ⇒ Sharpe 0 par convention.
    expect(perf.annualizedVol).toBeCloseTo(0, 10);
    expect(perf.sharpe).toBe(0);
    expect(perf.maxDrawdown).toBe(0);
  });

  it("computes a positive volatility for alternating returns", () => {
    const daily = Array.from({ length: 100 }, (_, i) => (i % 2 === 0 ? 0.01 : -0.01));
    const { perf } = summarizePerformance(daily, 0.025);
    expect(perf.annualizedVol).toBeGreaterThan(0);
    expect(Number.isFinite(perf.sharpe)).toBe(true);
  });
});

/** Série de prix à rendement quotidien constant (déterministe, sans RNG). */
function constantReturnPrices(dailyReturn: number, n: number, start = 100): PricePoint[] {
  const prices: PricePoint[] = [];
  let p = start;
  for (let i = 0; i < n; i++) {
    const d = new Date(Date.UTC(2022, 0, 1 + i)).toISOString().slice(0, 10);
    prices.push({ date: d, close: p });
    p *= 1 + dailyReturn;
  }
  return prices;
}

describe("runBacktest", () => {
  const config: BacktestConfig = { estimationWindow: 60, rebalanceEvery: 20, riskFreeRate: 0 };

  it("produces aligned OOS dates and base-1 curves for both strategies", () => {
    // Deux actifs, deux classes, rendements réguliers distincts.
    const assets: Asset[] = [
      makeAsset({ id: "a", asset_class: "equity_dev", esg_score: 80 }),
      makeAsset({ id: "b", asset_class: "green_bond", esg_score: 78 }),
    ];
    const pricesByAsset = new Map<string, PricePoint[]>([
      ["a", constantReturnPrices(0.0006, 200)],
      ["b", constantReturnPrices(0.0003, 200)],
    ]);
    const res = runBacktest({
      universe: assets,
      pricesByAsset,
      params: defaultParams(),
      config,
    });
    expect(res.dates.length).toBeGreaterThan(0);
    expect(res.seedow.curve).toHaveLength(res.dates.length + 1);
    expect(res.equalWeight.curve).toHaveLength(res.dates.length + 1);
    expect(res.seedow.curve[0]).toBe(1);
    expect(res.equalWeight.curve[0]).toBe(1);
    expect(res.seedow.perf.rebalances).toBeGreaterThan(0);
    // Rendements positifs partout ⇒ courbes croissantes, drawdown nul.
    expect(res.seedow.perf.finalValue).toBeGreaterThan(1);
    expect(res.equalWeight.perf.maxDrawdown).toBe(0);
  });

  it("excludes assets in excluded sectors from the 1/N pool", () => {
    const assets: Asset[] = [
      makeAsset({ id: "clean", asset_class: "equity_dev" }),
      makeAsset({ id: "dirty", asset_class: "equity_dev", excluded_sectors: ["fossiles"] }),
    ];
    const pricesByAsset = new Map<string, PricePoint[]>([
      ["clean", constantReturnPrices(0.0005, 150)],
      // L'actif exclu monte beaucoup plus fort : s'il entrait dans le 1/N,
      // la courbe equalWeight en profiterait. On vérifie qu'il est écarté.
      ["dirty", constantReturnPrices(0.005, 150)],
    ]);
    const res = runBacktest({
      universe: assets,
      pricesByAsset,
      params: defaultParams({ exclusions: ["fossiles"] }),
      config,
    });
    // Le 1/N ne contient que "clean" (0.05%/j) ⇒ finalValue modérée, pas dopée
    // par l'actif exclu à +0.5%/j.
    const cleanOnly = summarizePerformance(
      res.dates.map(() => 0.0005),
      0,
    ).perf.finalValue;
    expect(res.equalWeight.perf.finalValue).toBeCloseTo(cleanOnly, 6);
  });

  it("passes a benchmark series through when provided", () => {
    const assets: Asset[] = [makeAsset({ id: "a", asset_class: "equity_dev" })];
    const pricesByAsset = new Map<string, PricePoint[]>([["a", constantReturnPrices(0.0004, 150)]]);
    const res = runBacktest({
      universe: assets,
      pricesByAsset,
      params: defaultParams(),
      config,
      benchmarkPrices: constantReturnPrices(0.0002, 150),
    });
    expect(res.benchmark).toBeDefined();
    expect(res.benchmark!.curve[0]).toBe(1);
    expect(res.benchmark!.perf.finalValue).toBeGreaterThan(1);
  });
});
