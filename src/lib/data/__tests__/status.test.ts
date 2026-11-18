import { describe, expect, it } from "vitest";
import { ageInDays, primarySourceStatus, toProvenanceStatus, weakestStatus } from "../status";
import { DATA_SOURCES } from "../sources";

const NOW = new Date("2026-11-18T12:00:00Z");

describe("statut d'une donnée de source primaire", () => {
  it("vérifiée dans sa fenêtre de fraîcheur", () => {
    expect(primarySourceStatus(true, "2026-11-17", "fund_holdings", NOW)).toBe("VERIFIED");
  });
  it("périmée au-delà", () => {
    expect(primarySourceStatus(true, "2026-09-01", "fund_holdings", NOW)).toBe("STALE");
  });
  it("sans valeur ou sans date : indisponible, jamais vérifiée", () => {
    expect(primarySourceStatus(false, "2026-11-17", "fund_holdings", NOW)).toBe("UNAVAILABLE");
    expect(primarySourceStatus(true, null, "fund_holdings", NOW)).toBe("UNAVAILABLE");
  });
  it("âge en jours", () => {
    expect(ageInDays("2026-11-08", NOW)).toBe(10);
    expect(ageInDays("pas une date", NOW)).toBeNull();
  });
});

describe("un calcul vaut son entrée la plus faible", () => {
  it("vérifié + simulé = simulé", () => {
    expect(weakestStatus(["VERIFIED", "SIMULATED"])).toBe("SIMULATED");
  });
  it("vérifié + périmé = périmé", () => {
    expect(weakestStatus(["VERIFIED", "STALE"])).toBe("STALE");
  });
  it("aucune entrée : indisponible", () => {
    expect(weakestStatus([])).toBe("UNAVAILABLE");
  });
  it("seul VERIFIED devient « vérifié » dans l'interface historique", () => {
    expect(toProvenanceStatus("SIMULATED")).toBe("unknown");
    expect(toProvenanceStatus("ESTIMATED")).toBe("modelled");
  });
});

describe("registre des sources", () => {
  it("identifiants uniques", () => {
    const ids = DATA_SOURCES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("une source non intégrée ne produit jamais de donnée vérifiée", () => {
    for (const s of DATA_SOURCES.filter((x) => x.integration === "not_integrated")) {
      expect(s.producesStatus).toBe("UNAVAILABLE");
    }
  });
});
