import { describe, expect, it } from "vitest";
import { AmfGecoConnector, gecoRawFromRecord } from "../connectors/amf-geco";

const URL = "https://geco.amf-france.org/opc/LU";
const RETRIEVED = "2026-08-14T00:00:00Z";

// IE00B4L5Y983 : ISIN réel valide (iShares Core MSCI World), checksum OK.
const RECORD = JSON.stringify({
  denomination: "iShares Core MSCI World UCITS ETF",
  code_isin: "IE00B4L5Y983",
  classification_sfdr: 8,
  frais_courants_pct: 0.2,
  date_reference: "2026-05-01",
});

describe("AmfGecoConnector.extract", () => {
  it("produit identité + réglementaire, sourcés AMF (priorité 1)", () => {
    const obs = new AmfGecoConnector().extract(gecoRawFromRecord(RECORD, URL, RETRIEVED));
    const byField = Object.fromEntries(obs.map((o) => [o.field, o]));
    expect(byField.fund_name.value).toBe("iShares Core MSCI World UCITS ETF");
    expect(byField.isin.value).toBe("IE00B4L5Y983");
    expect(byField.isin.validation.status).toBe("valid");
    expect(byField.sfdr_article.value).toBe(8);
    expect(byField.ter.value).toBeCloseTo(0.002, 6);
    for (const o of obs) {
      expect(o.sourceKey).toBe("amf_geco");
      expect(o.confidence).toBe("high");
    }
  });

  it("marque un ISIN invalide comme rejeté (non publiable)", () => {
    const bad = JSON.stringify({ code_isin: "XX0000000000", date_reference: "2026-05-01" });
    const obs = new AmfGecoConnector().extract(gecoRawFromRecord(bad, URL, RETRIEVED));
    const isin = obs.find((o) => o.field === "isin");
    expect(isin?.validation.status).toBe("rejected");
  });

  it("ignore un JSON illisible et un contenu non-JSON", () => {
    const c = new AmfGecoConnector();
    expect(c.extract(gecoRawFromRecord("{pas du json", URL, RETRIEVED))).toHaveLength(0);
    const pdf = { ...gecoRawFromRecord(RECORD, URL, RETRIEVED), contentType: "pdf_text" as const };
    expect(c.extract(pdf)).toHaveLength(0);
  });
});
