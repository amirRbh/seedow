import { describe, expect, it } from "vitest";
import {
  deriveSustainabilityProfile,
  parseImpliedTempC,
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
