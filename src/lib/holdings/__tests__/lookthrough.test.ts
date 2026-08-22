import { describe, expect, it } from "vitest";
import { buildLookThroughProfile, type HoldingLine } from "../lookthrough";

const lines: HoldingLine[] = [
  {
    securityName: "Apple",
    securityIsin: "US0378331005",
    sector: "Tech",
    country: "United States",
    weightPct: 20,
  },
  {
    securityName: "Microsoft",
    securityIsin: "US5949181045",
    sector: "Tech",
    country: "United States",
    weightPct: 15,
  },
  {
    securityName: "Nestle",
    securityIsin: "CH0038863350",
    sector: "Staples",
    country: "Switzerland",
    weightPct: 5,
  },
];

describe("buildLookThroughProfile", () => {
  const p = buildLookThroughProfile(lines, "2026-07-31");

  it("compte les titres et la couverture (somme des poids connus)", () => {
    expect(p.holdingsCount).toBe(3);
    expect(p.coveragePct).toBeCloseTo(40, 6);
    expect(p.asOf).toBe("2026-07-31");
  });

  it("top holdings triés par poids décroissant, bornés", () => {
    expect(p.topHoldings.map((h) => h.name)).toEqual(["Apple", "Microsoft", "Nestle"]);
    expect(buildLookThroughProfile(lines, null, 1).topHoldings).toHaveLength(1);
  });

  it("répartition sectorielle et géographique agrégées et triées", () => {
    expect(p.sectorBreakdown).toEqual([
      { key: "Tech", weightPct: 35 },
      { key: "Staples", weightPct: 5 },
    ]);
    expect(p.geographyBreakdown[0]).toEqual({ key: "United States", weightPct: 35 });
  });

  it("répartition vide si la dimension n'est pas fournie (jamais inventée)", () => {
    const noSector = lines.map((l) => ({ ...l, sector: null }));
    expect(buildLookThroughProfile(noSector, "2026-07-31").sectorBreakdown).toEqual([]);
  });

  it("concentration sur les titres sous-jacents (HHI + équivalent-N + top)", () => {
    // parts couvertes : 0.5, 0.375, 0.125 → HHI = 0.40625
    expect(p.concentration?.hhi).toBeCloseTo(0.40625, 6);
    expect(p.concentration?.effectiveHoldings).toBeCloseTo(1 / 0.40625, 6);
    expect(p.concentration?.topWeightPct).toBeCloseTo(20, 6);
  });

  it("composition vide → couverture 0, concentration nulle, pas de /0", () => {
    const empty = buildLookThroughProfile([], null);
    expect(empty.holdingsCount).toBe(0);
    expect(empty.coveragePct).toBe(0);
    expect(empty.concentration).toBeNull();
  });

  it("ignore les poids nuls/absents dans les agrégats", () => {
    const withNull: HoldingLine[] = [
      { securityName: "A", securityIsin: null, sector: "X", country: null, weightPct: null },
      { securityName: "B", securityIsin: null, sector: "X", country: null, weightPct: 10 },
    ];
    const prof = buildLookThroughProfile(withNull, null);
    expect(prof.coveragePct).toBe(10);
    expect(prof.sectorBreakdown).toEqual([{ key: "X", weightPct: 10 }]);
    expect(prof.holdingsCount).toBe(2); // compte les lignes, même à poids inconnu
  });
});
