import { describe, it, expect } from "vitest";
import { screenPool, SCREENING_VERSION } from "../screening";
import { makeAsset, defaultParams } from "./fixtures";

describe("screenPool", () => {
  it("écarte les actifs touchés par une exclusion de l'utilisateur", () => {
    const clean = makeAsset({ id: "clean", excluded_sectors: [] });
    const dirty = makeAsset({ id: "dirty", excluded_sectors: ["fossiles"] });
    const res = screenPool([clean, dirty], defaultParams({ exclusions: ["fossiles"] }));

    expect(res.universe_size).toBe(2);
    expect(res.excluded_count).toBe(1);
    expect(res.pool.map((s) => s.asset.id)).toEqual(["clean"]);
  });

  it("ne classe PAS un actif sans historique réel (relevance null, rejeté en fin)", () => {
    const withHistory = makeAsset({ id: "hist", stats_observations: 300 });
    const seedOnly = makeAsset({ id: "seed", stats_observations: null });
    const res = screenPool([seedOnly, withHistory], defaultParams());

    const hist = res.pool.find((s) => s.asset.id === "hist")!;
    const seed = res.pool.find((s) => s.asset.id === "seed")!;
    expect(hist.relevance).not.toBeNull();
    expect(hist.sharpe).not.toBeNull();
    expect(seed.relevance).toBeNull();
    expect(seed.sharpe).toBeNull();
    // Le classé passe avant le « en cours ».
    expect(res.pool[0].asset.id).toBe("hist");
  });

  it("classe l'actif au meilleur Sharpe devant, toutes choses égales par ailleurs", () => {
    const strong = makeAsset({ id: "strong", expected_return: 0.12, volatility: 0.12 });
    const weak = makeAsset({ id: "weak", expected_return: 0.04, volatility: 0.2 });
    const res = screenPool([weak, strong], defaultParams());

    expect(res.pool[0].asset.id).toBe("strong");
    expect(res.pool[0].sharpe!).toBeGreaterThan(res.pool[1].sharpe!);
  });

  it("intègre l'alignement aux causes actives dans le classement", () => {
    // Perf identique ; seul l'alignement à la cause « climat » diffère.
    const aligned = makeAsset({ id: "aligned", cause_exposure: { climat: 1 } });
    const off = makeAsset({ id: "off", cause_exposure: { climat: 0 } });
    const res = screenPool([off, aligned], defaultParams({ causes: ["climat"] }));

    const a = res.pool.find((s) => s.asset.id === "aligned")!;
    const o = res.pool.find((s) => s.asset.id === "off")!;
    expect(a.cause_match).toBe(1);
    expect(o.cause_match).toBe(0);
    expect(a.relevance!).toBeGreaterThan(o.relevance!);
    expect(res.pool[0].asset.id).toBe("aligned");
  });

  it("expose la version de méthode et une pertinence bornée 0..100", () => {
    const res = screenPool([makeAsset({ id: "x" })], defaultParams());
    expect(res.screening_version).toBe(SCREENING_VERSION);
    const r = res.pool[0].relevance!;
    expect(r).toBeGreaterThanOrEqual(0);
    expect(r).toBeLessThanOrEqual(100);
  });
});
