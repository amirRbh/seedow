import { describe, it, expect } from "vitest";
import {
  assetFieldProvenance,
  assetProvenance,
  isExternalSource,
  provenanceCoverage,
} from "../provenance";
import { makeAsset } from "@/lib/portfolio/__tests__/fixtures";

/**
 * Note sur le fixture : `makeAsset` applique ses défauts avec `??`, donc lui
 * passer `esg_score_source: null` rend `"manual"` — et `esg_data_asof` n'y
 * figure pas du tout. Les cas « sans source » et « avec date » sont donc
 * construits par surcharge explicite après le fixture, plutôt qu'à travers lui.
 */

describe("provenance d'un champ", () => {
  it("rend valeur, source et date quand tout est là", () => {
    const p = assetFieldProvenance(
      { ...makeAsset({ esg_score: 72, esg_score_source: "MSCI" }), esg_data_asof: "2026-06-30" },
      "esg_score",
    );
    expect(p).toEqual({
      field: "esg_score",
      value: 72,
      source: "MSCI",
      asOf: "2026-06-30",
      confidence: null,
    });
  });

  it("rend null quand la source manque — un chiffre non attribuable n'est pas une mesure", () => {
    const p = assetFieldProvenance(
      { ...makeAsset({ esg_score: 72 }), esg_score_source: null },
      "esg_score",
    );
    expect(p).toBeNull();
  });

  it("rend null quand la valeur manque, même avec une source", () => {
    const p = assetFieldProvenance(
      makeAsset({ esg_score_source: "MSCI", waci_tco2e_per_musd_sales: null }),
      "waci_tco2e_per_musd_sales",
    );
    expect(p).toBeNull();
  });

  it("ne fabrique jamais d'attribution par défaut sur une source vide", () => {
    const p = assetFieldProvenance(
      { ...makeAsset({ esg_score: 72 }), esg_score_source: "   " },
      "esg_score",
    );
    expect(p).toBeNull();
  });

  it("préfère la source carbone pour les champs carbone", () => {
    const p = assetFieldProvenance(
      makeAsset({
        esg_score_source: "MSCI",
        carbon_intensity_gco2e_per_eur: 120,
        carbon_intensity_source: "Émetteur",
        carbon_intensity_updated_at: "2026-05-01T00:00:00Z",
      }),
      "carbon_intensity_gco2e_per_eur",
    );
    expect(p?.source).toBe("Émetteur");
    expect(p?.asOf).toBe("2026-05-01T00:00:00Z");
  });

  it("accepte une date absente sans perdre la source", () => {
    const p = assetFieldProvenance(
      { ...makeAsset({ esg_score: 60, esg_score_source: "MSCI" }), esg_data_asof: null },
      "esg_score",
    );
    expect(p?.source).toBe("MSCI");
    expect(p?.asOf).toBeNull();
  });

  it("ne retient que les champs réellement attribuables", () => {
    const all = assetProvenance(
      makeAsset({ esg_score: 72, esg_score_source: "MSCI", waci_tco2e_per_musd_sales: null }),
    );
    expect(all.map((p) => p.field)).toContain("esg_score");
    expect(all.map((p) => p.field)).not.toContain("waci_tco2e_per_musd_sales");
  });

  it("mesure la couverture au lieu d'annoncer un « vérifié » de façade", () => {
    const asset = makeAsset({ esg_score: 72, esg_score_source: "MSCI" });
    expect(provenanceCoverage(asset, ["esg_score"])).toBe(1);
    expect(provenanceCoverage(asset, ["esg_score", "waci_tco2e_per_musd_sales"])).toBe(0.5);
    expect(provenanceCoverage(asset, [])).toBeNull();
  });

  it("distingue une estimation interne d'un fournisseur externe", () => {
    expect(isExternalSource("MSCI")).toBe(true);
    expect(isExternalSource("seedow-internal-v2")).toBe(false);
  });
});
