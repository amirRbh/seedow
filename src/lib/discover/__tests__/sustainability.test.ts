import { describe, expect, it } from "vitest";
import { deriveDiscoverAssetTier } from "../sustainability";

describe("deriveDiscoverAssetTier", () => {
  it("applique la référence ACWI et dérive un tier fort", () => {
    const p = deriveDiscoverAssetTier({
      esgScore0to100: 78,
      climateScore0to100: 70,
      waci: 45, // très en-dessous d'ACWI (115)
      impliedTempRise: "1.5°C",
      exclusionsCount: 3,
      dataCoverage: "complete",
      sfdrArticle: 9,
    });
    expect(p.tier).toBe("paris_aligned");
    expect(p.sfdrIndependent).toBe(true);
  });

  it("tier inchangé si l'article SFDR disparaît (indépendance)", () => {
    const input = {
      esgScore0to100: 60,
      climateScore0to100: 55,
      waci: 100,
      impliedTempRise: "1.9°C",
      exclusionsCount: 0,
      dataCoverage: "partial" as const,
      sfdrArticle: 8,
    };
    const withSfdr = deriveDiscoverAssetTier(input);
    const withoutSfdr = deriveDiscoverAssetTier({ ...input, sfdrArticle: null });
    expect(withoutSfdr.tier).toBe(withSfdr.tier);
  });
});
