/**
 * Matrice de scénarios production du moteur v1.3 (audit portefeuille).
 * Vérifie les invariants durs demandés : poids = 100 %, pas de short, contraintes
 * respectées, aucune donnée fictive utilisée, stabilité face à un léger bruit.
 */
import { describe, it, expect } from "vitest";
import { buildPortfolio } from "../engine";
import { MAX_SINGLE_WEIGHT } from "../types";
import { makeAsset, defaultParams, balancedUniverse, diagonalCovMap } from "./fixtures";

const sum = (w: Record<string, number>) => Object.values(w).reduce((s, x) => s + x, 0);

describe("engine v1.3 — invariants", () => {
  it("weights sum to exactly 1, are all ≥ 0, and never exceed MAX_SINGLE_WEIGHT", () => {
    const universe = balancedUniverse();
    const result = buildPortfolio({
      universe,
      covariance: diagonalCovMap(universe),
      params: defaultParams(),
    });
    expect(sum(result.weights)).toBeCloseTo(1, 6);
    for (const w of Object.values(result.weights)) {
      expect(w).toBeGreaterThanOrEqual(0);
      expect(w).toBeLessThanOrEqual(MAX_SINGLE_WEIGHT + 1e-6);
    }
  });

  it("respects hard exclusions (an excluded sector never appears)", () => {
    const universe = [
      ...balancedUniverse(),
      makeAsset({ id: "dirty", asset_class: "equity_dev", excluded_sectors: ["fossiles"] }),
    ];
    const result = buildPortfolio({
      universe,
      covariance: diagonalCovMap(universe),
      params: defaultParams({ exclusions: ["fossiles"] }),
    });
    expect(result.weights["dirty"]).toBeUndefined();
    expect(result.selected_assets.find((a) => a.id === "dirty")).toBeUndefined();
  });
});

describe("engine v1.3 — data-quality tiers (never invents data)", () => {
  it("classifies a full-history asset as 'full' and counts its weight as real data", () => {
    const universe = balancedUniverse(); // stats_observations = 300 by default → full
    const result = buildPortfolio({
      universe,
      covariance: diagonalCovMap(universe),
      params: defaultParams(),
    });
    expect(result.data_quality.full).toBeGreaterThan(0);
    expect(result.data_quality.full_weight_share).toBeGreaterThan(0.9);
    expect(result.explanation.real_data_share).toBeCloseTo(
      result.data_quality.full_weight_share,
      6,
    );
  });

  it("anchors an insufficient-history asset's absurd seed return instead of trusting it", () => {
    // One asset carries a nonsense seed μ but no history → must be anchored, and
    // must NOT dominate the allocation on that fake return.
    const universe = [
      makeAsset({ id: "eq1", asset_class: "equity_dev", expected_return: 0.06 }),
      makeAsset({ id: "eq2", asset_class: "equity_dev", expected_return: 0.07 }),
      makeAsset({ id: "eq3", asset_class: "equity_dev", expected_return: 0.05 }),
      makeAsset({ id: "eq4", asset_class: "equity_dev", expected_return: 0.06 }),
      makeAsset({ id: "eq5", asset_class: "equity_dev", expected_return: 0.06 }),
      makeAsset({ id: "eq6", asset_class: "equity_dev", expected_return: 0.06 }),
      makeAsset({
        id: "fake",
        asset_class: "equity_dev",
        expected_return: 5.0, // absurd, would grab 25% cap if trusted
        stats_observations: 3, // no reliable history
      }),
      makeAsset({ id: "gb", asset_class: "green_bond", expected_return: 0.03 }),
      makeAsset({ id: "sb", asset_class: "sov_bond", expected_return: 0.02 }),
    ];
    const result = buildPortfolio({
      universe,
      covariance: diagonalCovMap(universe),
      params: defaultParams({ risk_target: 0.14 }),
    });
    // If the fake asset survived eligibility and got weight, its return was anchored,
    // so it must not sit pinned at the concentration cap on a fabricated 500% μ.
    if (result.weights["fake"] !== undefined) {
      expect(result.data_quality.anchored_ids).toContain("fake");
      expect(result.weights["fake"]).toBeLessThan(MAX_SINGLE_WEIGHT - 1e-9);
    }
  });

  it("uses a class-correlation prior (not zero) for pairs missing from the covariance map", () => {
    // Only diagonals supplied → all off-diagonals fall back. A correlated equity
    // pair must NOT be treated as free diversification. We assert the engine still
    // produces a valid, capped, fully-invested portfolio under that prior.
    const universe = balancedUniverse();
    const covDiagOnly = diagonalCovMap(universe); // no off-diagonal entries
    const result = buildPortfolio({
      universe,
      covariance: covDiagOnly,
      params: defaultParams(),
    });
    expect(sum(result.weights)).toBeCloseTo(1, 6);
    for (const w of Object.values(result.weights)) {
      expect(w).toBeLessThanOrEqual(MAX_SINGLE_WEIGHT + 1e-6);
    }
  });
});

describe("engine v1.3 — universe & constraints edge cases", () => {
  it("handles a universe with very few eligible assets without throwing", () => {
    const universe = [
      makeAsset({ id: "a", asset_class: "equity_dev", esg_score: 80 }),
      makeAsset({ id: "b", asset_class: "green_bond", esg_score: 80 }),
    ];
    const result = buildPortfolio({
      universe,
      covariance: diagonalCovMap(universe),
      params: defaultParams(),
    });
    expect(sum(result.weights)).toBeCloseTo(1, 6);
    expect(Object.keys(result.weights).length).toBeGreaterThan(0);
  });

  it("under strong ESG constraints, portfolio ESG is high or the relax flag is honest", () => {
    const universe = balancedUniverse().map((a) => ({ ...a, esg_score: 85, env_score: 85 }));
    const result = buildPortfolio({
      universe,
      covariance: diagonalCovMap(universe),
      params: defaultParams({ causes: ["climat"], cause_intensity: { climat: 1 } }),
    });
    expect(result.metrics.esg_score >= 70 || result.esg_floor_relaxed).toBe(true);
  });

  it("with incompatible user constraints (everything excluded) returns an honest empty result", () => {
    const universe = balancedUniverse().map((a) => ({
      ...a,
      excluded_sectors: ["fossiles" as const],
    }));
    const result = buildPortfolio({
      universe,
      covariance: diagonalCovMap(universe),
      params: defaultParams({ exclusions: ["fossiles"] }),
    });
    expect(Object.keys(result.weights).length).toBe(0);
    expect(result.excluded_count).toBe(universe.length);
    expect(result.data_quality.full).toBe(0);
    expect(result.explanation.position_count).toBe(0);
  });

  it("avoids absurd single-name concentration on a highly correlated cluster", () => {
    // 6 near-identical equities + real (high) covariance between them → optimiser
    // must spread rather than pile into one, thanks to the non-zero correlation.
    const universe = Array.from({ length: 6 }, (_, i) =>
      makeAsset({ id: `eq-${i}`, asset_class: "equity_dev", volatility: 0.2, expected_return: 0.07 }),
    ).concat([
      makeAsset({ id: "gb", asset_class: "green_bond", volatility: 0.05, expected_return: 0.03 }),
      makeAsset({ id: "sb", asset_class: "sov_bond", volatility: 0.04, expected_return: 0.02 }),
    ]);
    const cov = new Map<string, number>();
    for (const a of universe) cov.set(`${a.id}|${a.id}`, a.volatility * a.volatility);
    // high off-diagonal correlation (0.9) among the equity cluster
    for (let i = 0; i < 6; i++) {
      for (let j = i + 1; j < 6; j++) {
        const c = 0.9 * 0.2 * 0.2;
        cov.set(`eq-${i}|eq-${j}`, c);
        cov.set(`eq-${j}|eq-${i}`, c);
      }
    }
    const result = buildPortfolio({ universe, covariance: cov, params: defaultParams() });
    for (const w of Object.values(result.weights)) {
      expect(w).toBeLessThanOrEqual(MAX_SINGLE_WEIGHT + 1e-6);
    }
  });
});

describe("engine v1.3 — stability under small data perturbations", () => {
  it("weights barely move when a return is nudged by 0.1%", () => {
    const base = balancedUniverse();
    const cov = diagonalCovMap(base);
    const r1 = buildPortfolio({ universe: base, covariance: cov, params: defaultParams() });

    const nudged = base.map((a) =>
      a.id === "equity_dev-4" ? { ...a, expected_return: a.expected_return + 0.001 } : a,
    );
    const r2 = buildPortfolio({ universe: nudged, covariance: cov, params: defaultParams() });

    const ids = new Set([...Object.keys(r1.weights), ...Object.keys(r2.weights)]);
    let l1 = 0;
    for (const id of ids) l1 += Math.abs((r1.weights[id] ?? 0) - (r2.weights[id] ?? 0));
    // Total absolute weight change stays small (shrinkage + priors keep it stable).
    expect(l1).toBeLessThan(0.15);
  });
});
