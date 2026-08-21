import { describe, expect, it } from "vitest";
import { DIMENSION_META, MATCH_DIMENSIONS } from "../dimensions";
import {
  buildDefaultPreferences,
  buildOnboardingPreferences,
  clamp01,
  deriveWeightsFromCauses,
  defaultDimensionWeights,
  normalizeWeights,
  preferencesEqual,
  rowToPreferences,
  sanitizeConstraints,
  sanitizeExclusions,
  sanitizeRiskTolerance,
  sanitizeWeights,
  weightShares,
  type PreferencesRow,
  type UserPreferencesInput,
} from "../model";

describe("clamp01", () => {
  it("bornes [0,1] et neutralise le non-fini", () => {
    expect(clamp01(-0.5)).toBe(0);
    expect(clamp01(1.5)).toBe(1);
    expect(clamp01(0.3)).toBe(0.3);
    expect(clamp01(NaN)).toBe(0);
    expect(clamp01(Infinity)).toBe(0);
  });
});

describe("defaultDimensionWeights", () => {
  it("couvre toutes les dimensions avec les défauts du registre", () => {
    const w = defaultDimensionWeights();
    expect(Object.keys(w).sort()).toEqual([...MATCH_DIMENSIONS].sort());
    for (const d of MATCH_DIMENSIONS) expect(w[d]).toBe(DIMENSION_META[d].defaultWeight);
  });
});

describe("normalizeWeights", () => {
  it("complète les dimensions absentes par leur défaut et borne les présentes", () => {
    const w = normalizeWeights({ climate: 2, cost: -1 });
    expect(w.climate).toBe(1);
    expect(w.cost).toBe(0);
    expect(w.disclosure).toBe(DIMENSION_META.disclosure.defaultWeight);
  });
});

describe("sanitizeWeights", () => {
  it("ignore les clés inconnues et coerce vers un jeu complet borné", () => {
    const w = sanitizeWeights({ climate: 0.5, bogus: 9, cost: "0.9" });
    expect(w.climate).toBe(0.5);
    expect((w as Record<string, unknown>).bogus).toBeUndefined();
    // "0.9" n'est pas un number → cost retombe sur le défaut.
    expect(w.cost).toBe(DIMENSION_META.cost.defaultWeight);
  });
  it("ne lève jamais sur entrée non-objet", () => {
    expect(() => sanitizeWeights(null)).not.toThrow();
    expect(() => sanitizeWeights("x")).not.toThrow();
    expect(() => sanitizeWeights([1, 2])).not.toThrow();
    expect(sanitizeWeights(null)).toEqual(defaultDimensionWeights());
  });
});

describe("sanitizeExclusions", () => {
  it("ne garde que les valeurs d'enum, déduplique", () => {
    expect(sanitizeExclusions(["fossiles", "fossiles", "bogus", "armes"])).toEqual([
      "fossiles",
      "armes",
    ]);
  });
  it("tolère le non-tableau", () => {
    expect(sanitizeExclusions(null)).toEqual([]);
    expect(sanitizeExclusions("fossiles")).toEqual([]);
  });
});

describe("sanitizeRiskTolerance", () => {
  it("valide l'enum, sinon null", () => {
    expect(sanitizeRiskTolerance("dynamique")).toBe("dynamique");
    expect(sanitizeRiskTolerance("agressif")).toBeNull();
    expect(sanitizeRiskTolerance(3)).toBeNull();
  });
});

describe("sanitizeConstraints", () => {
  it("ne garde que les champs connus et bien typés", () => {
    const c = sanitizeConstraints({
      availableEuOnly: true,
      maxTerPct: 0.4,
      regions: ["europe", 3],
      bogus: "x",
    });
    expect(c).toEqual({ availableEuOnly: true, maxTerPct: 0.4, regions: ["europe"] });
  });
  it("rejette un TER négatif et un maxTerPct non numérique", () => {
    expect(sanitizeConstraints({ maxTerPct: -1 })).toEqual({});
    expect(sanitizeConstraints({ maxTerPct: "cheap" })).toEqual({});
  });
});

describe("weightShares", () => {
  it("somme à 1", () => {
    const shares = weightShares(defaultDimensionWeights());
    const total = MATCH_DIMENSIONS.reduce((s, d) => s + shares[d], 0);
    expect(total).toBeCloseTo(1, 10);
  });
  it("répartit uniformément quand tous les poids sont nuls (pas de /0)", () => {
    const zero = normalizeWeights(Object.fromEntries(MATCH_DIMENSIONS.map((d) => [d, 0])));
    const shares = weightShares(zero);
    const expected = 1 / MATCH_DIMENSIONS.length;
    for (const d of MATCH_DIMENSIONS) expect(shares[d]).toBeCloseTo(expected, 10);
  });
});

describe("deriveWeightsFromCauses", () => {
  it("monte values_alignment avec la cause prioritaire", () => {
    const none = deriveWeightsFromCauses([]);
    const withCause = deriveWeightsFromCauses(["climat"]);
    expect(withCause.values_alignment).toBeGreaterThanOrEqual(none.values_alignment);
    expect(withCause.values_alignment).toBeGreaterThan(0);
  });
  it("une cause environnementale pousse climate au-dessus du défaut", () => {
    const w = deriveWeightsFromCauses(["climat"]);
    expect(w.climate).toBeGreaterThan(DIMENSION_META.climate.defaultWeight);
  });
  it("une cause sociale appuie esg_quality", () => {
    const w = deriveWeightsFromCauses(["humain"]);
    expect(w.esg_quality).toBeGreaterThan(DIMENSION_META.esg_quality.defaultWeight);
  });
  it("les exclusions montent harm_avoidance", () => {
    const w = deriveWeightsFromCauses([], ["fossiles", "armes"]);
    expect(w.harm_avoidance).toBeGreaterThanOrEqual(0.8);
    expect(w.harm_avoidance).toBeLessThanOrEqual(1);
  });
  it("deux profils différents produisent des poids différents (personnalisation réelle)", () => {
    const a = deriveWeightsFromCauses(["climat", "biodiversite"], ["fossiles"]);
    const b = deriveWeightsFromCauses(["humain"], []);
    expect(a).not.toEqual(b);
  });
  it("reste borné [0,1] sur toutes les dimensions", () => {
    const w = deriveWeightsFromCauses(
      ["climat", "biodiversite", "circulaire"],
      ["fossiles", "armes", "tabac", "jeux", "animaux", "fast-fashion"],
    );
    for (const d of MATCH_DIMENSIONS) {
      expect(w[d]).toBeGreaterThanOrEqual(0);
      expect(w[d]).toBeLessThanOrEqual(1);
    }
  });
});

describe("buildDefaultPreferences / buildOnboardingPreferences", () => {
  it("le défaut porte la source 'default' et aucune exclusion", () => {
    const p = buildDefaultPreferences();
    expect(p.source).toBe("default");
    expect(p.exclusions).toEqual([]);
    expect(p.dimensionWeights).toEqual(defaultDimensionWeights());
  });
  it("l'onboarding porte la source 'onboarding' et assainit les exclusions", () => {
    const p = buildOnboardingPreferences(["climat"], ["fossiles", "bogus"] as never, "prudent");
    expect(p.source).toBe("onboarding");
    expect(p.exclusions).toEqual(["fossiles"]);
    expect(p.riskTolerance).toBe("prudent");
  });
});

describe("preferencesEqual", () => {
  const base: UserPreferencesInput = buildDefaultPreferences();
  it("vrai pour deux jeux identiques (garde-fou anti-no-op)", () => {
    expect(preferencesEqual(base, buildDefaultPreferences())).toBe(true);
  });
  it("insensible à l'ordre des exclusions", () => {
    const a = { ...base, exclusions: ["fossiles", "armes"] as never };
    const b = { ...base, exclusions: ["armes", "fossiles"] as never };
    expect(preferencesEqual(a, b)).toBe(true);
  });
  it("faux si un poids change au-delà d'epsilon", () => {
    const a = base;
    const b = { ...base, dimensionWeights: { ...base.dimensionWeights, climate: 0.1 } };
    expect(preferencesEqual(a, b)).toBe(false);
  });
  it("faux si la tolérance au risque change", () => {
    expect(preferencesEqual(base, { ...base, riskTolerance: "dynamique" })).toBe(false);
  });
  it("insensible à l'ordre des clés de constraints", () => {
    const a = { ...base, constraints: { availableEuOnly: true, maxTerPct: 0.3 } };
    const b = { ...base, constraints: { maxTerPct: 0.3, availableEuOnly: true } };
    expect(preferencesEqual(a, b)).toBe(true);
  });
});

describe("rowToPreferences", () => {
  it("mappe et assainit une ligne DB, source inconnue → 'manual'", () => {
    const row: PreferencesRow = {
      id: "id-1",
      version: 2,
      is_active: true,
      dimension_weights: { climate: 0.9, bogus: 5 },
      exclusions: ["fossiles", "nope"],
      risk_tolerance: "zzz",
      constraints: { availableEuOnly: true },
      source: "hacked",
      created_at: "2026-08-21T00:00:00Z",
      updated_at: "2026-08-21T00:00:00Z",
    };
    const p = rowToPreferences(row);
    expect(p.version).toBe(2);
    expect(p.dimensionWeights.climate).toBe(0.9);
    expect((p.dimensionWeights as Record<string, unknown>).bogus).toBeUndefined();
    expect(p.exclusions).toEqual(["fossiles"]);
    expect(p.riskTolerance).toBeNull();
    expect(p.constraints).toEqual({ availableEuOnly: true });
    expect(p.source).toBe("manual");
  });
});
