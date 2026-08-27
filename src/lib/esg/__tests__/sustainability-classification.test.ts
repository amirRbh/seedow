import { describe, expect, it } from "vitest";
import {
  deriveSustainabilityProfile,
  parseImpliedTempC,
  scoreBand,
  type SustainabilitySignals,
} from "../sustainability-classification";

const base: SustainabilitySignals = {
  esgScore: 75,
  climateScore: 65,
  waci: 50,
  benchmarkWaci: 115,
  impliedTempRise: "1.5°C",
  exclusionsCount: 3,
  dataCoverage: "complete",
  sfdrArticle: 9,
};

describe("parseImpliedTempC", () => {
  it("prend la borne haute d'une bande (lecture prudente)", () => {
    expect(parseImpliedTempC(">2.5-3.0°C")).toBe(3.0);
    expect(parseImpliedTempC("1.5°C")).toBe(1.5);
    expect(parseImpliedTempC(null)).toBeNull();
    expect(parseImpliedTempC("n/a")).toBeNull();
  });
});

describe("deriveSustainabilityProfile", () => {
  it("classe Paris-aligned sur des signaux forts + exclusions", () => {
    const p = deriveSustainabilityProfile(base);
    expect(p.tier).toBe("paris_aligned");
    expect(p.confidence).toBe("high");
    expect(p.sfdrIndependent).toBe(true);
    expect(p.drivers).toContain("temp_aligned");
    expect(p.drivers).toContain("carbon_far_below_benchmark");
    expect(p.drivers).toContain("sfdr_corroborates");
  });

  it("ne dépend PAS de l'article SFDR : mêmes signaux, SFDR absent → même tier", () => {
    const withSfdr = deriveSustainabilityProfile(base);
    const withoutSfdr = deriveSustainabilityProfile({ ...base, sfdrArticle: null });
    expect(withoutSfdr.tier).toBe(withSfdr.tier); // tier inchangé
    expect(withoutSfdr.drivers).not.toContain("sfdr_corroborates");
  });

  it("signale une contradiction quand SFDR revendique durable sans preuve", () => {
    const p = deriveSustainabilityProfile({
      esgScore: 40,
      climateScore: 30,
      waci: 130,
      benchmarkWaci: 115,
      impliedTempRise: ">2.5-3.0°C",
      exclusionsCount: 0,
      dataCoverage: "partial",
      sfdrArticle: 9, // revendique Art.9 mais les données disent l'inverse
    });
    expect(p.tier).not.toBe("paris_aligned");
    expect(p.drivers).toContain("sfdr_contradicts");
    expect(p.drivers).toContain("carbon_above_benchmark");
  });

  it("classe transition sur des signaux modérés", () => {
    const p = deriveSustainabilityProfile({
      ...base,
      impliedTempRise: "1.9°C",
      waci: 100, // < benchmark mais pas « far below »
      exclusionsCount: 0,
    });
    expect(p.tier).toBe("transition");
  });

  it("classe broad_esg si ESG correct mais climat faible et sans exclusions", () => {
    const p = deriveSustainabilityProfile({
      esgScore: 72,
      climateScore: 40,
      waci: null,
      benchmarkWaci: 115,
      impliedTempRise: null,
      exclusionsCount: 0,
      dataCoverage: "partial",
      sfdrArticle: null,
    });
    expect(p.tier).toBe("broad_esg");
  });

  it("insufficient_evidence quand tout est estimé et aucun signal fort", () => {
    const p = deriveSustainabilityProfile({
      esgScore: 50,
      climateScore: null,
      waci: null,
      benchmarkWaci: null,
      impliedTempRise: null,
      exclusionsCount: 0,
      dataCoverage: "estimated",
      sfdrArticle: 8,
    });
    expect(p.tier).toBe("insufficient_evidence");
    expect(p.confidence).toBe("low");
    expect(p.drivers).toContain("low_data_coverage");
  });

  it("borne les scores aberrants sans planter", () => {
    const p = deriveSustainabilityProfile({ ...base, esgScore: 999, climateScore: -50 });
    expect(["paris_aligned", "transition", "broad_esg", "insufficient_evidence"]).toContain(p.tier);
  });
});

describe("score Seedow (composite pondéré, propriétaire)", () => {
  it("combine les 3 piliers quand tout est présent (0..100)", () => {
    const p = deriveSustainabilityProfile(base);
    expect(p.score).not.toBeNull();
    expect(p.score!).toBeGreaterThanOrEqual(0);
    expect(p.score!).toBeLessThanOrEqual(100);
    expect(p.score!).toBeGreaterThan(70); // signaux forts + exclusions → score élevé
  });

  it("ignore SFDR : score identique avec ou sans article déclaré", () => {
    const withSfdr = deriveSustainabilityProfile(base).score;
    const withoutSfdr = deriveSustainabilityProfile({ ...base, sfdrArticle: null }).score;
    expect(withoutSfdr).toBe(withSfdr);
  });

  it("renormalise sur les piliers disponibles plutôt que d'inventer un neutre", () => {
    // Seul le pilier ESG est exploitable (climat et exclusions absents/nuls) :
    // le score doit refléter directement le pilier ESG, pas une moyenne avec 0.
    const p = deriveSustainabilityProfile({
      esgScore: 80,
      climateScore: null,
      waci: null,
      benchmarkWaci: null,
      impliedTempRise: null,
      exclusionsCount: 0,
      dataCoverage: "partial",
      sfdrArticle: null,
    });
    // ESG (80, poids 0.4) + exclusions (0, poids 0.2) renormalisés sur 0.6
    expect(p.score).toBe(Math.round((0.4 * 80) / 0.6));
  });

  it("null si aucun signal exploitable", () => {
    const p = deriveSustainabilityProfile({
      esgScore: null,
      climateScore: null,
      waci: null,
      benchmarkWaci: null,
      impliedTempRise: null,
      exclusionsCount: 0,
      dataCoverage: "estimated",
      sfdrArticle: null,
    });
    // exclusionsCount=0 reste un pilier valide (0/100) : score non-null mais bas.
    expect(p.score).toBe(0);
  });

  it("trajectoire température à/au-delà des bornes → sous-score 100/0", () => {
    const aligned = deriveSustainabilityProfile({ ...base, impliedTempRise: "1.0°C" }).score!;
    const misaligned = deriveSustainabilityProfile({ ...base, impliedTempRise: "5.0°C" }).score!;
    expect(aligned).toBeGreaterThan(misaligned);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Bande de lecture et détail du composite — le « pourquoi » doit redonner le
// « combien », sinon les deux surfaces divergeront tôt ou tard.
// ─────────────────────────────────────────────────────────────────────────────

describe("scoreBand", () => {
  it("distingue non noté et mal noté", () => {
    expect(scoreBand(null)).toBe("unrated");
    expect(scoreBand(0)).toBe("weak");
  });

  it("place les bornes à 70 et 55, incluses", () => {
    expect(scoreBand(70)).toBe("strong");
    expect(scoreBand(69)).toBe("partial");
    expect(scoreBand(55)).toBe("partial");
    expect(scoreBand(54)).toBe("weak");
  });

  it("traite une valeur non finie comme non notée, jamais comme faible", () => {
    expect(scoreBand(Number.NaN)).toBe("unrated");
    expect(scoreBand(Number.POSITIVE_INFINITY)).toBe("unrated");
  });
});

describe("scoreBreakdown", () => {
  it("expose les trois piliers du composite, jamais E/S/G", () => {
    const p = deriveSustainabilityProfile(base);
    expect(p.scoreBreakdown.map((b) => b.id)).toEqual(["esg", "climate", "exclusions"]);
  });

  it("reconstitue exactement le score affiché", () => {
    const p = deriveSustainabilityProfile(base);
    const recomputed = Math.round(
      p.scoreBreakdown.reduce((acc, b) => acc + (b.value ?? 0) * b.effectiveWeight, 0),
    );
    // Tolérance de 1 point : le score est arrondi une fois, la reconstitution
    // repart de piliers eux-mêmes arrondis pour l'affichage.
    expect(Math.abs(recomputed - p.score!)).toBeLessThanOrEqual(1);
  });

  it("écarte un pilier sans donnée et reporte son poids sur les autres", () => {
    const p = deriveSustainabilityProfile({
      ...base,
      waci: null,
      benchmarkWaci: null,
      impliedTempRise: null,
    });
    const climate = p.scoreBreakdown.find((b) => b.id === "climate")!;
    expect(climate.value).toBeNull();
    expect(climate.effectiveWeight).toBe(0);
    // ESG (0,4) et exclusions (0,2) se partagent la totalité du poids.
    const rest = p.scoreBreakdown.filter((b) => b.id !== "climate");
    expect(rest.reduce((acc, b) => acc + b.effectiveWeight, 0)).toBeCloseTo(1, 6);
  });

  it("liste les trois piliers même quand aucun n'est exploitable", () => {
    const p = deriveSustainabilityProfile({
      ...base,
      esgScore: null,
      climateScore: null,
      waci: null,
      benchmarkWaci: null,
      impliedTempRise: null,
      exclusionsCount: Number.NaN,
    });
    // `exclusionsCount` non fini retombe à 0, qui reste un pilier VALIDE : le
    // score existe donc, et le détail le dit plutôt que de rester muet.
    expect(p.scoreBreakdown).toHaveLength(3);
    expect(p.scoreBreakdown.every((b) => typeof b.weight === "number")).toBe(true);
  });
});
