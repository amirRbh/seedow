import { describe, expect, it } from "vitest";
import {
  computeFlowAllocation,
  FLOW_CAUSES,
  FLOW_EXCLUSIONS,
  FLOW_LANES,
} from "@/lib/landing/moneyFlow";
import type { CauseTag, ExclusionTag } from "@/lib/portfolio/types";

/** Les 32 combinaisons possibles de convictions proposées sur la landing. */
function allCombinations(): { causes: CauseTag[]; exclusions: ExclusionTag[] }[] {
  const out: { causes: CauseTag[]; exclusions: ExclusionTag[] }[] = [];
  for (let c = 0; c < 1 << FLOW_CAUSES.length; c++) {
    for (let e = 0; e < 1 << FLOW_EXCLUSIONS.length; e++) {
      out.push({
        causes: FLOW_CAUSES.filter((_, i) => c & (1 << i)),
        exclusions: FLOW_EXCLUSIONS.filter((_, i) => e & (1 << i)),
      });
    }
  }
  return out;
}

describe("computeFlowAllocation", () => {
  it("totalise exactement 100 % dans toutes les combinaisons", () => {
    for (const { causes, exclusions } of allCombinations()) {
      const sum = computeFlowAllocation(causes, exclusions).reduce((a, l) => a + l.share, 0);
      expect(sum, `causes=${causes.join(",")} exclusions=${exclusions.join(",")}`).toBe(100);
    }
  });

  it("ne produit jamais de part négative", () => {
    for (const { causes, exclusions } of allCombinations()) {
      for (const lane of computeFlowAllocation(causes, exclusions)) {
        expect(lane.share).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("vide une destination refusée, et la marque comme telle", () => {
    const shares = computeFlowAllocation([], ["fossiles"]);
    const fossile = shares.find((l) => l.id === "fossile");
    expect(fossile).toMatchObject({ share: 0, excluded: true });
    // Refuser une destination n'en refuse pas d'autres.
    expect(shares.find((l) => l.id === "armement")?.excluded).toBe(false);
  });

  it("déplace le flux vers la cause cochée, sans vider le reste", () => {
    const base = computeFlowAllocation([], []);
    const climat = computeFlowAllocation(["climat"], []);
    const shareOf = (list: typeof base, id: string) => list.find((l) => l.id === id)?.share ?? 0;

    expect(shareOf(climat, "renouvelable")).toBeGreaterThan(shareOf(base, "renouvelable"));
    expect(shareOf(climat, "renovation")).toBeGreaterThan(shareOf(base, "renovation"));
    // Le portefeuille ne devient pas mono-thématique : le reste existe encore.
    expect(shareOf(climat, "diversifie")).toBeGreaterThan(0);
  });

  it("réattribue la part refusée au lieu de la perdre", () => {
    const base = computeFlowAllocation([], []);
    const sansFossile = computeFlowAllocation([], ["fossiles"]);
    const diversifie = (list: typeof base) => list.find((l) => l.id === "diversifie")?.share ?? 0;

    expect(diversifie(sansFossile)).toBeGreaterThan(diversifie(base));
  });

  it("expose une destination par voie, dans l'ordre déclaré", () => {
    const shares = computeFlowAllocation(["climat"], ["armes"]);
    expect(shares.map((l) => l.id)).toEqual(FLOW_LANES.map((l) => l.id));
  });
});
