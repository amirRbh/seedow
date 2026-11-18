import { describe, expect, it } from "vitest";
import { computePortfolioExposure, securityKey, UNCLASSIFIED, type Position } from "../exposure";

/**
 * Cas construits pour être vérifiés à la main. Portefeuille de 10 000 :
 *   - Fonds A, 6 000, ventilé : Technologie 50 %, Énergie 10 %, Santé 40 %.
 *   - Fonds B, 3 000, SANS ventilation publiée.
 *   - Action X en direct, 1 000, secteur Technologie.
 */
const fundA: Position = {
  id: "A",
  label: "Fonds A",
  kind: "fund",
  marketValue: 6000,
  assetClass: "Actions",
  ter: 0.002,
  composition: {
    sector: [
      { label: "Technologie", weightPct: 50 },
      { label: "Energy", weightPct: 10 },
      { label: "Santé", weightPct: 40 },
    ],
    geography: [{ label: "États-Unis", weightPct: 70 }],
    currency: [
      { label: "USD", weightPct: 70 },
      { label: "EUR", weightPct: 30 },
    ],
    holdings: [
      { key: "X", name: "Action X", sector: "Technologie", weightPct: 5 },
      { key: "Y", name: "Action Y", sector: "Energy", weightPct: 4 },
    ],
  },
};
const fundB: Position = {
  id: "B",
  label: "Fonds B",
  kind: "fund",
  marketValue: 3000,
  assetClass: "Obligations",
  ter: null,
  composition: null,
};
const directX: Position = {
  id: "X-direct",
  label: "Action X",
  kind: "direct",
  marketValue: 1000,
  assetClass: "Actions",
  security: {
    key: "X",
    name: "Action X",
    sector: "Technologie",
    geography: "États-Unis",
    currency: "USD",
  },
};

describe("exposition sectorielle pondérée par la valeur", () => {
  const r = computePortfolioExposure([fundA, fundB, directX]);

  it("Technologie = (6000 × 50 % + 1000) / 10 000 = 40 %", () => {
    const tech = r.sector.buckets.find((b) => b.label === "Technologie")!;
    expect(tech.value).toBeCloseTo(4000, 6);
    expect(tech.weightPct).toBeCloseTo(40, 6);
  });

  it("le fonds sans ventilation n'est PAS compté à zéro : il est « non ventilé »", () => {
    expect(r.sector.unclassifiedValue).toBeCloseTo(3000, 6);
    expect(r.sector.unclassifiedPct).toBeCloseTo(30, 6);
    expect(r.sector.coveragePct).toBeCloseTo(70, 6);
  });

  it("les pourcentages se lisent sur le total : connus + non ventilé = 100 %", () => {
    const sum = r.sector.buckets.reduce((s, b) => s + b.weightPct, 0) + r.sector.unclassifiedPct;
    expect(sum).toBeCloseTo(100, 6);
  });

  it("une ventilation géographique partielle (70 %) laisse le reste non ventilé", () => {
    // Fonds A : 30 % de 6 000 = 1 800 non ventilé ; Fonds B : 3 000 ; X direct ventilé.
    expect(r.geography.unclassifiedValue).toBeCloseTo(4800, 6);
    expect(r.geography.buckets[0]).toMatchObject({ label: "États-Unis" });
    expect(r.geography.buckets[0].value).toBeCloseTo(4200 + 1000, 6);
  });
});

describe("look-through sans double comptage", () => {
  const r = computePortfolioExposure([fundA, fundB, directX]);

  it("Action X : 1 000 en direct + 6 000 × 5 % = 300 via le fonds A, une seule ligne", () => {
    const x = r.holdings.find((h) => h.key === "X")!;
    expect(r.holdings.filter((h) => h.key === "X")).toHaveLength(1);
    expect(x.directValue).toBeCloseTo(1000, 6);
    expect(x.indirectValue).toBeCloseTo(300, 6);
    expect(x.totalValue).toBeCloseTo(1300, 6);
    expect(x.weightPct).toBeCloseTo(13, 6);
    expect(x.contributions.map((c) => c.positionId).sort()).toEqual(["A", "X-direct"]);
  });

  it("couverture look-through = direct + titres listés des fonds", () => {
    // 1 000 direct + 6 000 × 9 % = 540 → 1 540 / 10 000.
    expect(r.lookThroughCoveragePct).toBeCloseTo(15.4, 6);
  });
});

describe("énergie (GICS), frais et concentration", () => {
  const r = computePortfolioExposure([fundA, fundB, directX]);

  it("Énergie = 6 000 × 10 % = 600, soit 6 % ; couverture 70 % (borne basse)", () => {
    expect(r.energy.value).toBeCloseTo(600, 6);
    expect(r.energy.weightPct).toBeCloseTo(6, 6);
    expect(r.energy.coveragePct).toBeCloseTo(70, 6);
  });

  it("TER moyen pondéré sur la seule part dont les frais sont connus", () => {
    // Seul le fonds A a un TER connu : 0,20 % sur 6 000 → 12 par an, couverture 60 %.
    expect(r.fees.weightedTer).toBeCloseTo(0.002, 10);
    expect(r.fees.annualCost).toBeCloseTo(12, 6);
    expect(r.fees.coveragePct).toBeCloseTo(60, 6);
  });

  it("HHI des positions = 0,6² + 0,3² + 0,1² = 0,46", () => {
    expect(r.concentration.positionHhi).toBeCloseTo(0.46, 10);
    expect(r.concentration.effectivePositions).toBeCloseTo(1 / 0.46, 4);
    expect(r.concentration.largestPositionPct).toBeCloseTo(60, 6);
  });

  it("aucun TER connu : null, jamais 0 %", () => {
    expect(computePortfolioExposure([fundB]).fees.weightedTer).toBeNull();
  });
});

describe("garde-fous", () => {
  it("une valeur de marché invalide est écartée et signalée", () => {
    const r = computePortfolioExposure([fundA, { ...fundB, marketValue: Number.NaN }]);
    expect(r.totalValue).toBe(6000);
    expect(r.issues).toContain("invalid_market_value:B");
  });

  it("une ventilation qui dépasse 100 % est ramenée à 100 % et signalée", () => {
    const over: Position = {
      ...fundA,
      composition: {
        sector: [
          { label: "Tech", weightPct: 80 },
          { label: "Santé", weightPct: 40 },
        ],
      },
    };
    const r = computePortfolioExposure([over]);
    const sum = r.sector.buckets.reduce((s, b) => s + b.value, 0);
    expect(sum).toBeCloseTo(6000, 6);
    expect(r.issues).toContain("weights_over_100:sector:A");
  });

  it("portefeuille vide : zéros, pas de division par zéro", () => {
    const r = computePortfolioExposure([]);
    expect(r.totalValue).toBe(0);
    expect(r.sector.coveragePct).toBe(0);
    expect(r.concentration.effectivePositions).toBe(0);
  });

  it("classe d'actifs absente : comptée en « non ventilé », pas ignorée", () => {
    const r = computePortfolioExposure([{ ...fundB, assetClass: null }]);
    expect(r.assetAllocation[0].label).toBe(UNCLASSIFIED);
  });
});

describe("clé de titre", () => {
  it("ISIN valide prioritaire", () => {
    expect(securityKey({ isin: "us0378331005", name: "Apple Inc" })).toBe("US0378331005");
  });
  it("sans ISIN : ticker + nom normalisé, insensible aux suffixes juridiques", () => {
    expect(securityKey({ ticker: "AAPL", name: "APPLE INC" })).toBe(
      securityKey({ ticker: "aapl", name: "Apple" }),
    );
  });
});
