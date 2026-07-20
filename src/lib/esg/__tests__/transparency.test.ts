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
    climateScore: 7,
    exclusionsCount: 3,
    claimsGreenTheme: false,
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

  it("flags an unverifiable sustainable claim as medium risk", () => {
    const res = assessGreenwashingRisk(input({ hasCarbonData: false }));
    expect(res.risk).toBe("medium");
    expect(res.reasons).toEqual(["sfdr_missing_carbon"]);
  });

  it("flags a green theme with weak climate score as medium risk", () => {
    const res = assessGreenwashingRisk(
      input({ sfdrArticle: null, claimsGreenTheme: true, climateScore: 3 }),
    );
    expect(res.risk).toBe("medium");
    expect(res.reasons).toEqual(["green_theme_low_climate"]);
  });

  it("flags sustainable claims backed only by estimated data", () => {
    const res = assessGreenwashingRisk(input({ hasPillarScores: false }));
    expect(res.risk).toBe("medium");
    expect(res.reasons).toContain("claims_on_estimated_data");
  });

  it("keeps every reason so the UI can explain the verdict", () => {
    const res = assessGreenwashingRisk(
      input({ sfdrArticle: 9, overallEsgScore: 4, exclusionsCount: 0, hasCarbonData: false }),
    );
    expect(res.risk).toBe("high");
    expect(res.reasons.length).toBeGreaterThanOrEqual(3);
  });
});
