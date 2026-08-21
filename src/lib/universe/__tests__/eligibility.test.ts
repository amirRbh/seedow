import { describe, expect, it } from "vitest";
import {
  assessEligibility,
  filterEligible,
  partitionUniverse,
  type EligibilityAsset,
  type EligibilityCriteria,
} from "../eligibility";

function asset(over: Partial<EligibilityAsset> = {}): EligibilityAsset {
  return {
    id: "a",
    isActive: true,
    availableEu: null,
    shareClassOf: null,
    excludedSectors: [],
    ...over,
  };
}

const noCriteria: EligibilityCriteria = { exclusions: [] };

describe("assessEligibility — exclusions dures", () => {
  it("bloque un actif portant un secteur exclu par l'utilisateur", () => {
    const r = assessEligibility(asset({ excludedSectors: ["fossiles"] }), {
      exclusions: ["fossiles"],
    });
    expect(r.eligible).toBe(false);
    expect(r.blockedBy).toContain("excluded_sector");
  });
  it("laisse passer si aucun secteur exclu ne matche", () => {
    const r = assessEligibility(asset({ excludedSectors: ["tabac"] }), {
      exclusions: ["fossiles"],
    });
    expect(r.eligible).toBe(true);
  });
});

describe("assessEligibility — disponibilité UE (traitement honnête du null)", () => {
  it("inconnu (null) = avertissement, pas blocage, par défaut", () => {
    const r = assessEligibility(asset({ availableEu: null }), noCriteria);
    expect(r.eligible).toBe(true);
    expect(r.warnings).toContain("availability_unknown");
    expect(r.blockedBy).not.toContain("availability_unknown");
  });
  it("inconnu (null) bloque si l'utilisateur exige des actifs confirmés dispo UE", () => {
    const r = assessEligibility(asset({ availableEu: null }), {
      exclusions: [],
      availableEuOnly: true,
    });
    expect(r.eligible).toBe(false);
    expect(r.blockedBy).toContain("availability_unknown");
  });
  it("confirmé indisponible (false) bloque toujours", () => {
    const r = assessEligibility(asset({ availableEu: false }), noCriteria);
    expect(r.eligible).toBe(false);
    expect(r.blockedBy).toContain("not_available_eu");
  });
  it("confirmé disponible (true) passe, même en mode availableEuOnly", () => {
    const r = assessEligibility(asset({ availableEu: true }), {
      exclusions: [],
      availableEuOnly: true,
    });
    expect(r.eligible).toBe(true);
    expect(r.warnings).toHaveLength(0);
  });
});

describe("assessEligibility — share-classes", () => {
  it("masque une share-class non canonique par défaut", () => {
    const r = assessEligibility(asset({ shareClassOf: "canon-1" }), noCriteria);
    expect(r.eligible).toBe(false);
    expect(r.blockedBy).toContain("non_canonical_share_class");
  });
  it("la garde (avertissement) si la dédup est désactivée", () => {
    const r = assessEligibility(asset({ shareClassOf: "canon-1" }), {
      exclusions: [],
      requireCanonicalShareClass: false,
    });
    expect(r.eligible).toBe(true);
    expect(r.warnings).toContain("non_canonical_share_class");
  });
});

describe("assessEligibility — couverture & inactif", () => {
  it("bloque un actif inactif", () => {
    expect(assessEligibility(asset({ isActive: false }), noCriteria).blockedBy).toContain(
      "inactive",
    );
  });
  it("applique un plancher de couverture quand exigé", () => {
    const partial = asset({ dataCoverage: "partial" });
    expect(assessEligibility(partial, { exclusions: [], minCoverage: "complete" }).eligible).toBe(
      false,
    );
    expect(assessEligibility(partial, { exclusions: [], minCoverage: "partial" }).eligible).toBe(
      true,
    );
  });
  it("couverture inconnue échoue tout plancher exigé", () => {
    const r = assessEligibility(asset({ dataCoverage: undefined }), {
      exclusions: [],
      minCoverage: "estimated",
    });
    expect(r.blockedBy).toContain("insufficient_coverage");
  });
});

describe("assessEligibility — motifs cumulés", () => {
  it("accumule tous les blocages, pas seulement le premier", () => {
    const r = assessEligibility(
      asset({ isActive: false, availableEu: false, excludedSectors: ["armes"] }),
      { exclusions: ["armes"] },
    );
    expect(r.blockedBy).toEqual(
      expect.arrayContaining(["inactive", "excluded_sector", "not_available_eu"]),
    );
  });
});

describe("filterEligible / partitionUniverse", () => {
  const universe: EligibilityAsset[] = [
    asset({ id: "ok", availableEu: true }),
    asset({ id: "excluded", availableEu: true, excludedSectors: ["fossiles"] }),
    asset({ id: "dup", availableEu: true, shareClassOf: "ok" }),
    asset({ id: "unknown-avail", availableEu: null }),
  ];

  it("filterEligible garde les seuls éligibles", () => {
    const ids = filterEligible(universe, { exclusions: ["fossiles"] }).map((a) => a.id);
    expect(ids).toEqual(["ok", "unknown-avail"]);
  });

  it("partitionUniverse rapporte total analysé + motifs (dénominateur honnête)", () => {
    const p = partitionUniverse(universe, { exclusions: ["fossiles"] });
    expect(p.analyzed).toBe(4);
    expect(p.eligible.map((a) => a.id)).toEqual(["ok", "unknown-avail"]);
    expect(p.excluded).toHaveLength(2);
    const dup = p.excluded.find((e) => e.asset.id === "dup");
    expect(dup?.reasons).toContain("non_canonical_share_class");
  });
});
