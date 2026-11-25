import { describe, expect, it } from "vitest";
import {
  clientProfileInputSchema,
  currentDataRowSchema,
  evidenceRefs,
  toFundData,
  toReportFunds,
  toReportProfile,
  clientProfileRowSchema,
} from "../data";
import { inboxFileName, isValidIsin, parseInboxFileName, parseIsinList } from "../isin";

describe("ISIN", () => {
  it.each([
    "US0378331005",
    "FR0010592022",
    "LU0347711466",
    "FR0011250281",
    "FR0013439528",
    "FR0010158220",
  ])("%s est valide", (isin) => expect(isValidIsin(isin)).toBe(true));
  it.each(["US0378331006", "FR001059202", "fr0010592022", "FR00105920AA"])(
    "%s est refusé",
    (isin) => expect(isValidIsin(isin)).toBe(false),
  );

  it("lit une liste collée, un CSV, dédoublonne et signale les clés fausses", () => {
    const csv = `isin;nom\n"FR0010592022";Ecofi Enjeux Futurs\nlu0347711466;BNPP\nFR0010592022;doublon\nUS0378331006;faux`;
    expect(parseIsinList(csv)).toEqual({
      isins: ["FR0010592022", "LU0347711466"],
      invalid: ["US0378331006"],
      truncated: 0,
    });
    expect(parseIsinList("FR0010592022, LU0347711466\tFR0011250281").isins).toHaveLength(3);
    expect(parseIsinList("US0378331006 US0378331006").invalid).toEqual(["US0378331006"]);
  });
  it("tronque au-delà de la limite", () => {
    const r = parseIsinList("FR0010592022 LU0347711466 FR0011250281", 2);
    expect(r.isins).toEqual(["FR0010592022", "LU0347711466"]);
    expect(r.truncated).toBe(1);
  });
});

const row = {
  isin: "FR0010592022",
  fund_name: "Ecofi Enjeux Futurs",
  sfdr_article: 9,
  doc_date: null,
  doc_language: "fr",
  doc_source_url: "https://example.org/a.pdf",
  doc_sha256: "a".repeat(64),
  min_sustainable_pct: "100.00",
  min_taxonomy_pct: 0,
  min_taxonomy_pct_excl_sovereign: null,
  min_es_aligned_pct: 100,
  considers_pai: true,
  pai_categories: null,
  status: "needs_review",
  evidence: {
    min_sustainable_pct: { page: 4, quote: "investit 100% de ses actifs", verified: true },
    considers_pai: { page: 0, quote: null },
    broken: "x",
    _review_reasons: ["ambigu"],
  },
  extraction_model: "claude-sonnet-5-5",
  extraction_version: "prompt.v1",
  validated_at: null,
  id: "ignored-extra-column",
};

describe("lignes Supabase → moteur / rapport", () => {
  it("convertit les numeric en nombres et filtre les preuves", () => {
    const f = toFundData(currentDataRowSchema.parse(row));
    expect(f.min_sustainable_pct).toBe(100);
    expect(f.pai_categories).toEqual([]);
    expect(f.evidence).toEqual({
      min_sustainable_pct: { page: 4, quote: "investit 100% de ses actifs" },
      considers_pai: { page: null, quote: null },
    });
  });
  it("article SFDR inattendu → null", () => {
    expect(
      toFundData(currentDataRowSchema.parse({ ...row, sfdr_article: 7 })).sfdr_article,
    ).toBeNull();
  });
  it("evidenceRefs tolère null", () => {
    expect(evidenceRefs(null)).toEqual({});
  });
  it("garde l'ordre demandé, ISIN inconnu → données nulles", () => {
    const funds = toReportFunds(
      ["LU0347711466", "FR0010592022"],
      [currentDataRowSchema.parse(row)],
    );
    expect(funds[0]).toEqual({
      isin: "LU0347711466",
      data: null,
      document: null,
      extraction: null,
    });
    expect(funds[1].document?.sha256).toBe("a".repeat(64));
    expect(funds[1].extraction).toEqual({
      model: "claude-sonnet-5-5",
      version: "prompt.v1",
      status: "needs_review",
      validated_at: null,
    });
  });
  it("profil client → profil de rapport", () => {
    const p = clientProfileRowSchema.parse({
      id: "6f1c2a9e-3b7d-4e21-9a55-0c8d7e4f1b23",
      cabinet_id: "6f1c2a9e-3b7d-4e21-9a55-0c8d7e4f1b24",
      client_ref: "CLI-1",
      taxonomy_min_pct: null,
      sfdr_min_pct: "25.00",
      pai_required: true,
      pai_categories: ["ghg"],
      collected_at: "2026-11-18",
      adapted: false,
      adaptation_note: null,
      created_at: "2026-11-18T10:00:00Z",
    });
    expect(toReportProfile(p)).toEqual({
      client_ref: "CLI-1",
      collected_at: "2026-11-18",
      taxonomy_min_pct: null,
      sfdr_min_pct: 25,
      pai_required: true,
      pai_categories: ["ghg"],
      adapted: false,
      adaptation_note: null,
    });
  });
});

describe("formulaire de préférences", () => {
  const ok = {
    client_ref: "CLI-2026-014",
    collected_at: "2026-11-18",
    taxonomy_min_pct: null,
    sfdr_min_pct: 25,
    pai_required: true,
    pai_categories: ["ghg"],
    adapted: false,
    adaptation_note: null,
  };
  it("accepte un profil complet", () => {
    expect(clientProfileInputSchema.safeParse(ok).success).toBe(true);
  });
  it.each([
    ["email comme pseudonyme", { client_ref: "jean.dupont@gmail.com" }],
    ["nom avec espace", { client_ref: "Jean Dupont" }],
    ["minimum à 0", { sfdr_min_pct: 0 }],
    ["catégories sans PAI", { pai_required: false }],
    ["adaptation sans note", { adapted: true, adaptation_note: "  " }],
    ["date absente", { collected_at: "" }],
  ])("refuse : %s", (_, over) => {
    expect(clientProfileInputSchema.safeParse({ ...ok, ...over }).success).toBe(false);
  });
});

describe("nom des dépôts d'annexes", () => {
  it("aller-retour, et refus des noms hors convention", () => {
    expect(parseInboxFileName(inboxFileName("FR0010592022", 1764000000000))).toBe("FR0010592022");
    expect(parseInboxFileName("FR0010592023__1.pdf")).toBeNull();
    expect(parseInboxFileName("annexe.pdf")).toBeNull();
    expect(parseInboxFileName("FR0010592022__1.pdf.exe")).toBeNull();
    expect(parseInboxFileName("FR0010592022__../x.pdf")).toBeNull();
  });
});
