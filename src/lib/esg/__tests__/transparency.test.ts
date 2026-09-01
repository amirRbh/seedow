import { describe, expect, it } from "vitest";
import {
  assessGreenwashingRisk,
  computeDataCoverage,
  type TransparencyInput,
} from "../transparency";

function input(overrides: Partial<TransparencyInput> = {}): TransparencyInput {
  return {
    hasPrice: true,
    hasPillarScores: true,
    hasCarbonData: true,
    sfdrArticle: 8,
    overallEsgScore: 7.5,
    exclusionsCount: 3,
    ...overrides,
  };
}

describe("computeDataCoverage", () => {
  it("is complete when every source is present", () => {
    expect(computeDataCoverage(input())).toBe("complete");
  });

  it("is partial when one non-pillar source is missing", () => {
    expect(computeDataCoverage(input({ hasCarbonData: false }))).toBe("partial");
    expect(computeDataCoverage(input({ sfdrArticle: null }))).toBe("partial");
    expect(computeDataCoverage(input({ hasPrice: false }))).toBe("partial");
  });

  it("is estimated as soon as pillar scores are derived from the global score", () => {
    expect(computeDataCoverage(input({ hasPillarScores: false }))).toBe("estimated");
  });

  it("is estimated when most sources are missing", () => {
    expect(
      computeDataCoverage(input({ hasCarbonData: false, sfdrArticle: null, hasPrice: false })),
    ).toBe("estimated");
  });
});

describe("assessGreenwashingRisk", () => {
  it("is low for a coherent Article 8 fund", () => {
    expect(assessGreenwashingRisk(input())).toEqual({ risk: "low", reasons: [] });
  });

  it("is low for an unclassified fund making no green claim", () => {
    const res = assessGreenwashingRisk(
      input({ sfdrArticle: null, hasCarbonData: false, exclusionsCount: 0, overallEsgScore: 4 }),
    );
    expect(res.risk).toBe("low");
  });

  it("flags Article 9 with a weak ESG score as high risk", () => {
    const res = assessGreenwashingRisk(input({ sfdrArticle: 9, overallEsgScore: 5.5 }));
    expect(res.risk).toBe("high");
    expect(res.reasons).toContain("art9_low_esg");
  });

  it("flags Article 9 without any exclusion as high risk", () => {
    const res = assessGreenwashingRisk(input({ sfdrArticle: 9, exclusionsCount: 0 }));
    expect(res.risk).toBe("high");
    expect(res.reasons).toContain("art9_no_exclusions");
  });

  it("keeps every reason so the UI can explain the verdict", () => {
    const res = assessGreenwashingRisk(
      input({ sfdrArticle: 9, overallEsgScore: 4, exclusionsCount: 0 }),
    );
    expect(res.risk).toBe("high");
    expect(res.reasons).toEqual(["art9_low_esg", "sfdr_low_esg", "art9_no_exclusions"]);
  });

  // ── Ce que l'heuristique NE signale PLUS (grille STI 2.0) ─────────────────
  // Les trois familles retirées décrivaient un trou de données de Seedow, ou
  // bouclaient sur un score que Seedow avait lui-même produit. Un fonds ne peut
  // pas être pris en défaut par une donnée qui manque chez nous.
  it("no longer flags a fund for data Seedow itself is missing", () => {
    expect(assessGreenwashingRisk(input({ hasCarbonData: false })).reasons).toEqual([]);
    expect(assessGreenwashingRisk(input({ hasPillarScores: false })).reasons).toEqual([]);
  });

  // ── Tolérance : la zone limite juste au-dessus du plancher ─────────────────
  describe("borderline tolerance bands", () => {
    it("flags an Article 9 fund whose ESG just clears the floor as medium", () => {
      const res = assessGreenwashingRisk(input({ sfdrArticle: 9, overallEsgScore: 6.5 }));
      expect(res.risk).toBe("medium");
      expect(res.reasons).toContain("art9_borderline_esg");
      expect(res.reasons).not.toContain("art9_low_esg");
    });

    it("does not flag an Article 9 fund comfortably above the floor", () => {
      const res = assessGreenwashingRisk(input({ sfdrArticle: 9, overallEsgScore: 7.5 }));
      expect(res.reasons).not.toContain("art9_borderline_esg");
      expect(res.reasons).not.toContain("art9_low_esg");
    });

    it("flags a sustainable fund whose ESG sits in the grey zone as medium", () => {
      const res = assessGreenwashingRisk(input({ sfdrArticle: 8, overallEsgScore: 5.5 }));
      expect(res.risk).toBe("medium");
      expect(res.reasons).toContain("sfdr_borderline_esg");
    });

    it("does not double-count the grey zone for Article 9 (floor already at 6)", () => {
      const res = assessGreenwashingRisk(input({ sfdrArticle: 9, overallEsgScore: 5.5 }));
      expect(res.risk).toBe("high");
      expect(res.reasons).toContain("art9_low_esg");
      expect(res.reasons).not.toContain("sfdr_borderline_esg");
    });
  });

  // ── Robustesse : les "ombres" (données manquantes ou aberrantes) ───────────
  describe("input robustness", () => {
    it("neutralises an out-of-range SFDR article instead of misfiring", () => {
      const res = assessGreenwashingRisk(
        input({ sfdrArticle: 7, overallEsgScore: 2, exclusionsCount: 0, hasCarbonData: false }),
      );
      // Article 7 n'existe pas : aucune revendication durable → aucun drapeau.
      expect(res.risk).toBe("low");
      expect(res.reasons).toEqual([]);
    });

    it("does not assert a contradiction from a non-finite score", () => {
      const res = assessGreenwashingRisk(input({ sfdrArticle: 9, overallEsgScore: Number.NaN }));
      expect(res.reasons).not.toContain("art9_low_esg");
      expect(res.reasons).not.toContain("art9_borderline_esg");
    });

    it("clamps an absurdly low score into the contradiction band", () => {
      const res = assessGreenwashingRisk(input({ sfdrArticle: 9, overallEsgScore: -3 }));
      expect(res.risk).toBe("high");
      expect(res.reasons).toContain("art9_low_esg");
    });

    it("treats a negative exclusions count as zero", () => {
      const res = assessGreenwashingRisk(input({ sfdrArticle: 9, exclusionsCount: -2 }));
      expect(res.reasons).toContain("art9_no_exclusions");
    });
  });
});
