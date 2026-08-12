import { describe, expect, it } from "vitest";
import { ISharesConnector, iSharesRawFromText } from "../connectors/ishares";

// Extrait réel de fiche iShares (section Sustainability Characteristics), tel
// que rendu par extraction texte.
const ESGU = `
MSCI ESG Fund Rating (AAA-CCC) A
MSCI ESG Quality Score (0-10) 7.07
MSCI Weighted Average Carbon Intensity
(Tons CO2E/$M SALES) 69.03
MSCI Implied Temperature Rise (0-3.0+ °C) > 2.5° - 3.0° C
All data is from MSCI ESG Fund Ratings as of 04/17/2026, based on holdings as of 03/31/2026.
`;

const URL = "https://www.ishares.com/uk/factsheet/ESGU.pdf";
const RETRIEVED = "2026-08-12T00:00:00Z";

describe("ISharesConnector.extract", () => {
  it("transforme une factsheet en observations sourcées", () => {
    const c = new ISharesConnector();
    const raw = iSharesRawFromText(ESGU, URL, RETRIEVED);
    const obs = c.extract(raw);
    const byField = Object.fromEntries(obs.map((o) => [o.field, o]));

    expect(byField.esg_score.value).toBe(70.7); // 7.07 × 10
    expect(byField.msci_esg_quality_score.value).toBe(7.07);
    expect(byField.msci_esg_rating.value).toBe("A");
    expect(byField.waci_tco2e_per_musd_sales.value).toBe(69.03);
    expect(byField.implied_temp_rise.value).toBe(">2.5-3.0°C");
  });

  it("chaque observation porte sa provenance complète (§3)", () => {
    const c = new ISharesConnector();
    const obs = c.extract(iSharesRawFromText(ESGU, URL, RETRIEVED));
    for (const o of obs) {
      expect(o.sourceKey).toBe("ishares_factsheet");
      expect(o.sourceUrl).toBe(URL);
      expect(o.referenceDate).toBe("2026-04-17"); // MSCI as of, en ISO
      expect(o.retrievedAt).toBe(RETRIEVED);
      expect(o.confidence).toBe("high");
      expect(o.method).toMatch(/ishares_factsheet/);
    }
  });

  it("un document vide ne produit AUCUNE observation (§9 ne jamais inventer)", () => {
    const c = new ISharesConnector();
    expect(c.extract(iSharesRawFromText("aucune donnée ici", URL, RETRIEVED))).toHaveLength(0);
  });

  it("ignore un contenu non-PDF", () => {
    const c = new ISharesConnector();
    const raw = { ...iSharesRawFromText(ESGU, URL, RETRIEVED), contentType: "json" as const };
    expect(c.extract(raw)).toHaveLength(0);
  });

  it("fetch renvoie null sans downloader injecté (réseau non câblé)", async () => {
    const c = new ISharesConnector();
    expect(await c.fetch("IE00B4L5Y983")).toBeNull();
  });
});
