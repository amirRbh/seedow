import { describe, expect, it } from "vitest";
import { buildCollectionImpact, type CollectionFund } from "../collection-impact";
import type { HoldingLine } from "../lookthrough";

const h = (
  name: string,
  isin: string | null,
  weightPct: number,
  sector = "Tech",
  country = "US",
): HoldingLine => ({
  securityName: name,
  securityIsin: isin,
  sector,
  country,
  weightPct,
});

describe("buildCollectionImpact — consolidation par titre sous-jacent", () => {
  it("dédup : deux fonds détenant Apple → une exposition consolidée", () => {
    const funds: CollectionFund[] = [
      { assetId: "f1", weight: 0.5, holdings: [h("Apple", "US0378331005", 100)] },
      { assetId: "f2", weight: 0.5, holdings: [h("Apple", "US0378331005", 100)] },
    ];
    const impact = buildCollectionImpact(funds);
    expect(impact.underlyingCount).toBe(1); // un seul titre distinct
    expect(impact.topSecurities[0].name).toBe("Apple");
    expect(impact.topSecurities[0].weightPct).toBeCloseTo(100, 6); // 50%·100% + 50%·100%
    // Deux fonds identiques → overlap = 1 (parfaitement redondants).
    expect(impact.overlap).toBeCloseTo(1, 6);
  });

  it("détecte la fausse diversification (fonds identiques → diversification basse)", () => {
    const same = [h("A", "I1", 50), h("B", "I2", 50)];
    const funds: CollectionFund[] = [
      { assetId: "f1", weight: 0.5, holdings: same },
      { assetId: "f2", weight: 0.5, holdings: same },
    ];
    const impact = buildCollectionImpact(funds);
    // 2 titres équipondérés → HHI=0.5 → diversification=0.5, ~2 titres effectifs.
    expect(impact.trueDiversification).toBeCloseTo(0.5, 6);
    expect(impact.effectiveHoldings).toBeCloseTo(2, 6);
    expect(impact.overlap).toBeCloseTo(1, 6);
  });

  it("exposition consolidée en % du TOTAL collection (non renormalisée)", () => {
    const funds: CollectionFund[] = [
      { assetId: "f1", weight: 0.5, holdings: [h("Apple", "I1", 20), h("MSFT", "I2", 10)] },
    ];
    const impact = buildCollectionImpact(funds);
    // Apple = 50%·20% = 10% de la collection.
    const apple = impact.topSecurities.find((s) => s.name === "Apple");
    expect(apple?.weightPct).toBeCloseTo(10, 6);
  });

  it("secteurs/géo agrégés en % de la collection", () => {
    const funds: CollectionFund[] = [
      {
        assetId: "f1",
        weight: 1,
        holdings: [h("A", "I1", 30, "Tech", "US"), h("B", "I2", 20, "Energy", "FR")],
      },
    ];
    const impact = buildCollectionImpact(funds);
    expect(impact.sectorBreakdown[0]).toEqual({ key: "Tech", weightPct: 30 });
    expect(impact.geographyBreakdown.find((s) => s.key === "FR")?.weightPct).toBeCloseTo(20, 6);
  });

  it("couverture honnête : un fonds sans holdings abaisse la couverture, jamais inventé", () => {
    const funds: CollectionFund[] = [
      { assetId: "f1", weight: 0.5, holdings: [h("Apple", "I1", 100)] },
      { assetId: "f2", weight: 0.5, holdings: [] }, // composition inconnue
    ];
    const impact = buildCollectionImpact(funds);
    expect(impact.coverage).toBeCloseTo(0.5, 6);
    expect(impact.coveredFunds).toBe(1);
    expect(impact.totalFunds).toBe(2);
    // < 2 fonds couverts → overlap non calculable (null), jamais 0 trompeur.
    expect(impact.overlap).toBeNull();
  });

  it("collection sans aucune composition → tout null/vide, pas de /0", () => {
    const funds: CollectionFund[] = [{ assetId: "f1", weight: 1, holdings: [] }];
    const impact = buildCollectionImpact(funds);
    expect(impact.coverage).toBe(0);
    expect(impact.underlyingCount).toBe(0);
    expect(impact.trueDiversification).toBeNull();
    expect(impact.effectiveHoldings).toBeNull();
    expect(impact.topSecurities).toEqual([]);
  });

  it("deux fonds DISJOINTS → overlap 0, diversification élevée", () => {
    const funds: CollectionFund[] = [
      { assetId: "f1", weight: 0.5, holdings: [h("A", "I1", 100)] },
      { assetId: "f2", weight: 0.5, holdings: [h("B", "I2", 100)] },
    ];
    const impact = buildCollectionImpact(funds);
    expect(impact.overlap).toBeCloseTo(0, 6);
    expect(impact.underlyingCount).toBe(2);
    expect(impact.trueDiversification).toBeCloseTo(0.5, 6);
  });
});
