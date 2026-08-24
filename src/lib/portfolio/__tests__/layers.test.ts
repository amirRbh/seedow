import { describe, it, expect } from "vitest";
import { describeAssetLayers, isPresentable } from "../layers";
import { makeAsset } from "./fixtures";

/**
 * Note sur le fixture : `makeAsset` applique ses défauts avec `??`, donc lui
 * passer `esg_score_source: null` rend `"manual"` — et `esg_data_asof` n'y
 * figure pas du tout. Les cas « sans source » et « avec date » sont donc
 * construits par surcharge explicite après le fixture, plutôt qu'à travers lui.
 */

describe("couches d'actif", () => {
  it("distingue « absent de la source » de « pas chargé »", () => {
    // Aucune identité fournie : on ne sait pas, ce n'est pas la même chose
    // qu'affirmer que le fonds n'a pas d'ISIN.
    const notLoaded = describeAssetLayers({ asset: makeAsset({ id: "a" }) });
    expect(notLoaded.layers.identity.unknown).toContain("isin");
    expect(notLoaded.layers.identity.missing).not.toContain("isin");

    // Identité fournie mais vide : là, c'est bien une absence.
    const loadedEmpty = describeAssetLayers({
      asset: makeAsset({ id: "a" }),
      identity: { isin: null, issuer: null, domicile: null, currency: null },
    });
    expect(loadedEmpty.layers.identity.missing).toContain("isin");
    expect(loadedEmpty.layers.identity.unknown).not.toContain("isin");
  });

  it("reconnaît une identité complète", () => {
    const l = describeAssetLayers({
      asset: makeAsset({ id: "a", ter: 0.002 }),
      identity: { isin: "IE00B4L5Y983", issuer: "iShares", domicile: "IE", currency: "EUR" },
    });
    expect(l.layers.identity.status).toBe("complete");
    expect(l.layers.identity.missing).toEqual([]);
  });

  it("ne compte pas un score ESG non sourcé comme une note", () => {
    const unsourced = describeAssetLayers({
      asset: { ...makeAsset({ id: "a", esg_score: 0 }), esg_score_source: null },
    });
    expect(unsourced.layers.values.missing).toContain("esg_score");

    const sourced = describeAssetLayers({
      asset: makeAsset({ id: "a", esg_score: 72, esg_score_source: "MSCI" }),
    });
    expect(sourced.layers.values.missing).not.toContain("esg_score");
  });

  it("laisse la composition « inconnue » tant qu'elle n'a pas été consultée", () => {
    const notAsked = describeAssetLayers({ asset: makeAsset({ id: "a" }) });
    expect(notAsked.layers.structure.unknown).toContain("holdings");

    const asked = describeAssetLayers({ asset: makeAsset({ id: "a" }), holdingsCount: 0 });
    expect(asked.layers.structure.missing).toContain("holdings");

    const present = describeAssetLayers({ asset: makeAsset({ id: "a" }), holdingsCount: 120 });
    expect(present.layers.structure.missing).not.toContain("holdings");
  });

  it("considère la couche marché vide sans historique de cours", () => {
    const noHistory = describeAssetLayers({
      asset: makeAsset({ id: "a", stats_observations: 0 }),
    });
    expect(noHistory.layers.market.missing).toContain("price_history");
    // Rendement et volatilité restent présents : ce sont des a priori de classe.
    expect(noHistory.layers.market.status).toBe("partial");

    const withHistory = describeAssetLayers({
      asset: makeAsset({ id: "a", stats_observations: 250 }),
    });
    expect(withHistory.layers.market.status).toBe("complete");
  });

  it("un actif sans ESG reste présentable — il n'est pas effacé", () => {
    const l = describeAssetLayers({
      asset: { ...makeAsset({ id: "a", esg_score: 0 }), esg_score_source: null },
      identity: { isin: "IE00B4L5Y983", issuer: "iShares", domicile: "IE", currency: "EUR" },
    });
    expect(l.layers.values.status).not.toBe("complete");
    expect(isPresentable(l)).toBe(true);
    // Et l'on sait dire précisément ce qui lui manque.
    expect(l.layers.values.missing.length).toBeGreaterThan(0);
  });

  describe("source partielle — un modèle de vue n'est pas un Asset", () => {
    it("ne conclut ni à une note ni à son absence quand la source n'est pas chargée", () => {
      const l = describeAssetLayers({ asset: { name: "ETF X", ter: 0.002, volatility: 0.15 } });
      expect(l.layers.values.unknown).toContain("esg_score");
      expect(l.layers.values.missing).not.toContain("esg_score");
      expect(l.layers.market.unknown).toContain("price_history");
    });

    it("accepte un Asset complet sans conversion", () => {
      const l = describeAssetLayers({
        asset: makeAsset({ id: "a", esg_score: 72, esg_score_source: "MSCI" }),
      });
      expect(l.layers.values.status).not.toBe("unknown");
    });

    it("un fonds non noté reste présentable, avec ses manques nommés", () => {
      const l = describeAssetLayers({
        asset: {
          name: "ETF Catalogue",
          ter: 0.0025,
          asset_class: "equity_dev",
          region: null,
          excluded_sectors: [],
          cause_exposure: {},
          esg_score: 0,
          esg_score_source: null,
          env_score: null,
          social_score: null,
          governance_score: null,
          sfdr_article: null,
          carbon_intensity_gco2e_per_eur: null,
          waci_tco2e_per_musd_sales: null,
          expected_return: 0.05,
          volatility: 0.16,
          stats_observations: 0,
        },
        identity: { isin: "LU1234567890", issuer: "Amundi", currency: "EUR", domicile: null },
      });
      expect(isPresentable(l)).toBe(true);
      expect(l.layers.values.status).toBe("missing");
      expect(l.layers.values.missing).toContain("esg_score");
      expect(l.layers.identity.missing).toEqual(["domicile"]);
    });
  });

  it("liste les couches exploitables", () => {
    const l = describeAssetLayers({ asset: makeAsset({ id: "a" }) });
    expect(l.usable).toContain("structure");
    expect(l.usable).toContain("market");
  });
});
