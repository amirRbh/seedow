import { describe, expect, it } from "vitest";
import type { GecoIdentity } from "../../../data-engine/sources/geco.server";
import { dateKey, fundRow, pickDocument } from "../fund-row";
import type { UniverseFund } from "../universe";

const u: UniverseFund = {
  isin: "FR0010592022",
  name: "ECOFI ENJEUX FUTURS",
  management_company: "ECOFI INVESTISSEMENTS",
  amf_classification: "Actions internationales",
  legal_form: "OPCVM",
  esma_terms: ["futurs"],
  esma_baseline: "PAB",
  selection_reason: "GECO (AMF) au 2026-10-09 : …",
  source_url: "https://geco.amf-france.org/produits-financiers/c1",
};
const id: GecoIdentity = {
  fundName: "Ecofi Enjeux Futurs",
  shareName: "Part C",
  managementCompany: "ECOFI INVESTISSEMENTS",
  managerLei: "969500xj8ey8j6qdd528",
  domicile: "France",
  legalNature: "FCP",
  amfClassification: "Actions internationales",
  currency: "eur",
  status: "Vivant",
  inceptionDate: null,
};

describe("ligne pro_funds depuis GECO", () => {
  it("prend l'identité GECO, normalise LEI et devise, garde la provenance", () => {
    const r = fundRow(u, id, "https://geco.amf-france.org/back-office/x", "2026-11-28T00:00:00Z");
    expect(r).toMatchObject({
      name: "Ecofi Enjeux Futurs",
      management_company_lei: "969500XJ8EY8J6QDD528",
      currency: "EUR",
      identity_source: "amf_geco",
      identity_source_url: "https://geco.amf-france.org/back-office/x",
      identity_retrieved_at: "2026-11-28T00:00:00Z",
    });
  });

  it("sans réponse GECO : retombe sur la liste de départ, sans rien inventer", () => {
    const r = fundRow(u, null, "ignored", "t");
    expect(r.name).toBe("ECOFI ENJEUX FUTURS");
    expect(r.management_company_lei).toBeNull();
    expect(r.currency).toBeNull();
    expect(r.identity_source_url).toBe(u.source_url);
  });

  it("écarte un LEI ou une devise mal formés", () => {
    const r = fundRow(u, { ...id, managerLei: "ABC", currency: "EURO" }, "s", "t");
    expect(r.management_company_lei).toBeNull();
    expect(r.currency).toBeNull();
  });
});

describe("choix des documents GECO", () => {
  const docs = [
    { docType: "Prospectus", dateEffet: "01/02/2025", format: "pdf", url: "p1" },
    { docType: "Prospectus", dateEffet: "2026-03-01", format: "pdf", url: "p2" },
    { docType: "DIC PRIIPS toutes opérations", dateEffet: "2026-01-01", format: "pdf", url: "k1" },
    { docType: "Rapport annuel", dateEffet: "2026-05-01", format: "pdf", url: "r" },
  ];
  it("prend le plus récent du type préféré", () => {
    expect(pickDocument(docs, ["kid", "dici"])?.url).toBe("k1");
    expect(pickDocument(docs, ["sfdr", "prospectus"])?.url).toBe("p2");
    expect(pickDocument(docs, ["factsheet"])).toBeNull();
  });
  it("lit les dates françaises et ISO", () => {
    expect(dateKey("01/02/2025")).toBe("2025-02-01");
    expect(dateKey("2026-03-01T00:00:00")).toBe("2026-03-01");
    expect(dateKey(null)).toBe("");
  });
});
