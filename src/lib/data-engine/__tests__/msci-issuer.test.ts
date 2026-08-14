import { describe, expect, it } from "vitest";
import { parseMsciSustainability } from "@/lib/esg/msci-sustainability-parser";
import { AmundiConnector, amundiRawFromText } from "../connectors/amundi";
import { VanguardConnector, vanguardRawFromText } from "../connectors/vanguard";

// Bloc « Sustainability Characteristics » façon Amundi (libellés MSCI standard
// + article SFDR + frais courants). Modélise le rendu texte d'un document officiel.
const AMUNDI = `
Amundi MSCI World SRI Climate Net Zero Ambition UCITS ETF
Ongoing Charges 0.18%
SFDR classification: Article 8
Sustainability Characteristics
MSCI ESG Rating (AAA-CCC): AA
MSCI ESG Quality Score (0-10): 8.20
MSCI Weighted Average Carbon Intensity
(Tons CO2E/$M SALES) 42.50
MSCI Implied Temperature Rise (0-3.0+ °C): 1.5° C
All data is from MSCI ESG Fund Ratings as of 05/15/2026, based on holdings as of 04/30/2026.
`;

// Bloc façon Vanguard (OCF, ITR en bande, « as of » sans « Fund »).
const VANGUARD = `
Vanguard ESG Global All Cap UCITS ETF (VWRP)
OCF 0.24%
SFDR Article 8
MSCI ESG Rating (AAA-CCC) A
MSCI ESG Quality Score (0-10) 6.85
(Tons CO2E/$M SALES) 95.10
Implied Temperature Rise (0-3.0+ °C) > 2.0° - 2.5° C
MSCI ESG Fund Ratings as of 06/01/2026
`;

const RETRIEVED = "2026-08-14T00:00:00Z";

describe("parseMsciSustainability", () => {
  it("extrait le bloc MSCI + SFDR + TER (Amundi)", () => {
    const p = parseMsciSustainability(AMUNDI);
    expect(p.msciRating).toBe("AA");
    expect(p.qualityScore).toBe(8.2);
    expect(p.esgScore).toBe(82);
    expect(p.waci).toBe(42.5);
    expect(p.impliedTempRise).toBe("1.5°C");
    expect(p.sfdrArticle).toBe(8);
    expect(p.ter).toBeCloseTo(0.0018, 6);
    expect(p.asOf).toBe("2026-05-15");
  });

  it("tolère les variantes de libellés (Vanguard : OCF, bande ITR)", () => {
    const p = parseMsciSustainability(VANGUARD);
    expect(p.msciRating).toBe("A");
    expect(p.esgScore).toBe(68.5);
    expect(p.waci).toBe(95.1);
    expect(p.impliedTempRise).toBe(">2.0-2.5°C");
    expect(p.sfdrArticle).toBe(8);
    expect(p.ter).toBeCloseTo(0.0024, 6);
    expect(p.asOf).toBe("2026-06-01");
  });

  it("n'invente rien : un texte sans données ne renvoie que des null", () => {
    const p = parseMsciSustainability("Document sans caractéristiques de durabilité.");
    expect(p).toEqual({
      msciRating: null,
      qualityScore: null,
      esgScore: null,
      waci: null,
      impliedTempRise: null,
      sfdrArticle: null,
      ter: null,
      asOf: null,
    });
  });

  it("rejette un TER hors bornes plausibles", () => {
    expect(parseMsciSustainability("TER 42%").ter).toBeNull();
  });
});

describe("AmundiConnector / VanguardConnector.extract", () => {
  it("Amundi produit des observations sourcées et datées", () => {
    const obs = new AmundiConnector().extract(
      amundiRawFromText(AMUNDI, "https://www.amundietf.fr/x", RETRIEVED),
    );
    const byField = Object.fromEntries(obs.map((o) => [o.field, o]));
    expect(byField.esg_score.value).toBe(82);
    expect(byField.waci_tco2e_per_musd_sales.value).toBe(42.5);
    expect(byField.sfdr_article.value).toBe(8);
    expect(byField.ter.value).toBeCloseTo(0.0018, 6);
    for (const o of obs) {
      expect(o.sourceKey).toBe("amundi_factsheet");
      expect(o.method).toBe("pdf_parse:amundi_factsheet");
      expect(o.confidence).toBe("high");
      expect(o.sourceUrl).toBe("https://www.amundietf.fr/x");
    }
  });

  it("Vanguard produit des observations sourcées", () => {
    const obs = new VanguardConnector().extract(
      vanguardRawFromText(VANGUARD, "https://www.vanguard.co.uk/x", RETRIEVED),
    );
    const byField = Object.fromEntries(obs.map((o) => [o.field, o]));
    expect(byField.esg_score.value).toBe(68.5);
    expect(byField.msci_esg_rating.value).toBe("A");
    expect(obs.every((o) => o.sourceKey === "vanguard_factsheet")).toBe(true);
  });

  it("ignore un contenu non-PDF et un document vide", () => {
    const c = new AmundiConnector();
    expect(c.extract(amundiRawFromText("rien", "u", RETRIEVED))).toHaveLength(0);
    const json = { ...amundiRawFromText(AMUNDI, "u", RETRIEVED), contentType: "json" as const };
    expect(c.extract(json)).toHaveLength(0);
  });

  it("fetch renvoie null sans downloader injecté (réseau non câblé)", async () => {
    expect(await new VanguardConnector().fetch("IE00B4L5Y983")).toBeNull();
  });
});
