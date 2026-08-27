import { describe, expect, it } from "vitest";
import { buildEuroBreakdown, DEFAULT_REFERENCE_AMOUNT } from "@/lib/impact/euroBreakdown";
import type { HoldingLine } from "@/lib/portfolio/holdings-summary";

const line = (
  name: string,
  weightPct: number | null,
  sector: string | null = null,
): HoldingLine => ({ name, ticker: null, sector, weightPct });

describe("buildEuroBreakdown", () => {
  it("renvoie null sans aucune ligne exploitable — l'absence se dit, elle ne se dessine pas", () => {
    expect(buildEuroBreakdown([])).toBeNull();
    expect(buildEuroBreakdown([line("Cash", null), line("Zéro", 0)])).toBeNull();
  });

  it("renvoie null sur un montant de référence absurde", () => {
    const holdings = [line("Apple", 5, "Technologie")];
    expect(buildEuroBreakdown(holdings, { amount: 0 })).toBeNull();
    expect(buildEuroBreakdown(holdings, { amount: -100 })).toBeNull();
    expect(buildEuroBreakdown(holdings, { amount: Number.NaN })).toBeNull();
  });

  it("convertit un poids publié en euros sur le montant de référence", () => {
    const b = buildEuroBreakdown([line("Apple", 4.2, "Technologie")]);
    expect(b).not.toBeNull();
    expect(b!.amount).toBe(DEFAULT_REFERENCE_AMOUNT);
    expect(b!.companies[0]).toMatchObject({ key: "Apple", weightPct: 4.2 });
    expect(b!.companies[0].euros).toBeCloseTo(42, 6);
  });

  it("ne renormalise jamais : l'écart à 100 % ressort en part non décrite", () => {
    const b = buildEuroBreakdown([
      line("Apple", 40, "Technologie"),
      line("Nestlé", 35, "Consommation"),
    ]);
    expect(b!.totalWeightPct).toBeCloseTo(75, 6);
    expect(b!.describedEuros).toBeCloseTo(750, 6);
    expect(b!.undescribedEuros).toBeCloseTo(250, 6);
    expect(b!.publishedOver100).toBe(false);
    // La somme des secteurs vaut la part décrite, jamais le montant total.
    const sectorSum = b!.sectors.reduce((s, x) => s + x.euros, 0);
    expect(sectorSum).toBeCloseTo(750, 6);
  });

  it("borne la part non décrite à zéro quand la somme publiée dépasse 100 %", () => {
    const b = buildEuroBreakdown([line("A", 60, "Technologie"), line("B", 55, "Santé")]);
    expect(b!.publishedOver100).toBe(true);
    expect(b!.undescribedEuros).toBe(0);
    expect(b!.describedEuros).toBe(1000);
  });

  it("sépare « secteur non publié » de « autres secteurs »", () => {
    const b = buildEuroBreakdown(
      [
        line("A", 30, "Technologie"),
        line("B", 20, "Santé"),
        line("C", 10, "Énergie"),
        line("D", 5, "  "),
        line("E", 5, null),
      ],
      { sectorLimit: 2 },
    );
    expect(b!.sectors.map((s) => s.key)).toEqual(["Technologie", "Santé"]);
    // Énergie sort de la limite → agrégé, mais toujours un secteur connu.
    expect(b!.sectorsRestEuros).toBeCloseTo(100, 6);
    // Secteur vide ou absent : jamais rangé sous « autres ».
    expect(b!.sectorUnknownEuros).toBeCloseTo(100, 6);
  });

  it("agrège la queue des positions et en donne le compte", () => {
    const holdings = Array.from({ length: 12 }, (_, i) => line(`Ligne ${i}`, 12 - i, "Divers"));
    const b = buildEuroBreakdown(holdings, { companyLimit: 3 });
    expect(b!.companies).toHaveLength(3);
    expect(b!.companies.map((c) => c.key)).toEqual(["Ligne 0", "Ligne 1", "Ligne 2"]);
    expect(b!.companiesRestCount).toBe(9);
    // Σ des 9 restantes : poids 9+8+...+1 = 45 → 450 € sur 1 000 €.
    expect(b!.companiesRestEuros).toBeCloseTo(450, 6);
  });

  it("chiffre les frais annuels sur le montant, et ne les invente pas", () => {
    const holdings = [line("A", 100, "Technologie")];
    expect(buildEuroBreakdown(holdings, { ter: 0.0022 })!.feesPerYear).toBeCloseTo(2.2, 6);
    expect(buildEuroBreakdown(holdings, { ter: null })!.feesPerYear).toBeNull();
    expect(buildEuroBreakdown(holdings, { ter: Number.NaN })!.feesPerYear).toBeNull();
    expect(buildEuroBreakdown(holdings, { ter: 0 })!.feesPerYear).toBe(0);
  });

  it("suit le montant de référence choisi", () => {
    const holdings = [line("A", 50, "Technologie")];
    expect(buildEuroBreakdown(holdings, { amount: 100 })!.companies[0].euros).toBeCloseTo(50, 6);
    expect(buildEuroBreakdown(holdings, { amount: 10000 })!.companies[0].euros).toBeCloseTo(
      5000,
      6,
    );
  });

  it("somme les lignes d'un même secteur et ignore les poids inexploitables", () => {
    const b = buildEuroBreakdown([
      line("A", 10, "Santé"),
      line("B", 15, "Santé"),
      line("C", Number.POSITIVE_INFINITY, "Santé"),
      line("D", -3, "Santé"),
    ]);
    expect(b!.lineCount).toBe(2);
    expect(b!.sectors).toEqual([{ key: "Santé", weightPct: 25, euros: 250 }]);
  });
});
