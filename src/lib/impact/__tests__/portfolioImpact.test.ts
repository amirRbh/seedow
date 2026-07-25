import { describe, it, expect } from "vitest";
import { buildPortfolioImpact } from "../portfolioImpact";

describe("buildPortfolioImpact", () => {
  it("ne fabrique aucun chiffre carbone quand l'intensité est absente", () => {
    const view = buildPortfolioImpact(
      { carbon_intensity_gco2e_per_eur: null, carbon_intensity_coverage: 0, esg_score: 82 },
      1000,
    );
    expect(view.measured).toBe(false);
    expect(view.intensityGco2ePerEur).toBeNull();
    expect(view.financedEmissionsKgPerYear).toBeNull();
    expect(view.presentation.show).toBe(false);
    expect(view.presentation.reasonKey).toBe("impact.reason.no_data");
    // Le score ESG reste un repère réel disponible.
    expect(view.esgScore).toBe(82);
  });

  it("mesure l'empreinte financée et montre des équivalences quand couverture pleine", () => {
    // 100 gCO₂e/€/an × 1000 € × couverture 1 = 100 000 g = 100 kg/an.
    const view = buildPortfolioImpact(
      { carbon_intensity_gco2e_per_eur: 100, carbon_intensity_coverage: 1, esg_score: 78 },
      1000,
    );
    expect(view.measured).toBe(true);
    expect(view.financedEmissionsKgPerYear).toBeCloseTo(100, 5);
    expect(view.presentation.show).toBe(true);
    expect(view.presentation.equivalences.length).toBeGreaterThan(0);
    // Chaque équivalence porte sa source et son millésime (contrat transparence).
    for (const e of view.presentation.equivalences) {
      expect(e.source).toBeTruthy();
      expect(e.asOf).toBeGreaterThan(2000);
    }
  });

  it("mesure l'empreinte mais REFUSE les équivalences sous le seuil de couverture", () => {
    const view = buildPortfolioImpact(
      { carbon_intensity_gco2e_per_eur: 100, carbon_intensity_coverage: 0.3, esg_score: 78 },
      1000,
    );
    expect(view.measured).toBe(true);
    // Émissions calculées sur la seule part couverte : 100 × (1000 × 0,3) / 1000 = 30 kg.
    expect(view.financedEmissionsKgPerYear).toBeCloseTo(30, 5);
    expect(view.presentation.show).toBe(false);
    expect(view.presentation.reasonKey).toBe("impact.reason.low_coverage");
  });

  it("borne une couverture aberrante et reste défensif sur les entrées invalides", () => {
    const view = buildPortfolioImpact(
      { carbon_intensity_gco2e_per_eur: 50, carbon_intensity_coverage: 1.7, esg_score: Number.NaN },
      500,
    );
    expect(view.coverage).toBe(1);
    expect(view.esgScore).toBe(0);
  });

  it("ne calcule pas d'empreinte sur un montant nul ou négatif", () => {
    const view = buildPortfolioImpact(
      { carbon_intensity_gco2e_per_eur: 100, carbon_intensity_coverage: 1, esg_score: 70 },
      0,
    );
    expect(view.financedEmissionsKgPerYear).toBeNull();
    expect(view.presentation.show).toBe(false);
  });
});
