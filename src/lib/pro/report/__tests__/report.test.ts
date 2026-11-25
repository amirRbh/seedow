import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { loadReportFonts } from "../../../../../scripts/pro/lib/fonts";
import { pdfPagesText } from "../../../../../scripts/pro/lib/pdf-text";
import { canonicalJson, computeReport, parisDate, parisDateTimeLabel, sha256Hex } from "../model";
import { ENGINE_VERSION } from "../../matching/engine";
import { LEGAL_NOTICE, renderReportPdf, wrapText } from "../pdf";

const fund = (isin: string, over: Record<string, unknown> = {}) => ({
  isin,
  data: {
    isin,
    name: "Fonds Durable Test",
    sfdr_article: 8,
    doc_date: "2026-03-01",
    min_sustainable_pct: 20,
    min_taxonomy_pct: 1,
    min_taxonomy_pct_excl_sovereign: null,
    min_es_aligned_pct: 70,
    considers_pai: true,
    pai_categories: ["ghg"],
    status: "validated",
    evidence: {
      min_sustainable_pct: {
        page: 2,
        quote: "une proportion minimale de 20 % d'investissements durables",
      },
    },
    ...over,
  },
  document: {
    doc_date: "2026-03-01",
    language: "fr",
    source_url: "https://example.org/a.pdf",
    sha256: "a".repeat(64),
  },
  extraction: {
    model: "claude-sonnet-5-5",
    version: "prompt.v1",
    status: "validated",
    validated_at: "2026-03-02T10:00:00Z",
  },
});

const input = {
  report_id: "6f1c2a9e-3b7d-4e21-9a55-0c8d7e4f1b23",
  created_at: "2026-11-24T23:30:00Z",
  cabinet: { name: "Cabinet Test", orias_number: "00000000" },
  profile: {
    client_ref: "CLI-1",
    collected_at: "2026-11-20",
    taxonomy_min_pct: null,
    sfdr_min_pct: 10,
    pai_required: true,
    pai_categories: ["ghg"],
    adapted: false,
    adaptation_note: null,
  },
  funds: [
    fund("FR0010592022"),
    { isin: "LU0347711466", data: null, document: null, extraction: null },
  ],
};

describe("modèle du rapport", () => {
  it("JSON canonique : ordre des clés indifférent, undefined omis", () => {
    expect(canonicalJson({ b: 1, a: { d: [1, undefined], c: null }, e: undefined })).toBe(
      '{"a":{"c":null,"d":[1,null]},"b":1}',
    );
    expect(canonicalJson({ x: 1, y: 2 })).toBe(canonicalJson({ y: 2, x: 1 }));
  });
  it("sha256 (WebCrypto) sur texte et octets", async () => {
    expect(await sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
    expect(await sha256Hex(new TextEncoder().encode("abc"))).toBe(await sha256Hex("abc"));
  });
  it("dates en heure de Paris (la date de référence suit Paris, pas UTC)", () => {
    expect(parisDate("2026-11-24T23:30:00Z")).toBe("2026-11-25");
    expect(parisDateTimeLabel("2026-07-01T10:00:00Z")).toBe(
      "01/07/2026 à 12:00:00 (heure de Paris)",
    );
  });
  it("calcule verdicts, versions et empreintes ; ISIN sans données → À vérifier", async () => {
    const r = await computeReport(input);
    expect(r.as_of).toBe("2026-11-25");
    expect(r.results.map((x) => x.verdict)).toEqual(["ADEQUAT", "A_VERIFIER"]);
    expect(r.results[1].isin).toBe("LU0347711466");
    expect(r.extraction_versions).toEqual(["prompt.v1"]);
    expect(r.data_snapshot_hash).toMatch(/^[0-9a-f]{64}$/);
    const again = await computeReport(JSON.parse(JSON.stringify(input)));
    expect(again.content_hash).toBe(r.content_hash);
  });
  it("l'empreinte des données change si une donnée fonds change", async () => {
    const a = await computeReport(input);
    const b = await computeReport({
      ...input,
      funds: [fund("FR0010592022", { min_sustainable_pct: 21 })],
    });
    expect(b.data_snapshot_hash).not.toBe(a.data_snapshot_hash);
  });
  it("refuse un email comme client_ref, une adaptation non documentée, un ORIAS invalide", async () => {
    await expect(
      computeReport({ ...input, profile: { ...input.profile, client_ref: "jean@x.fr" } }),
    ).rejects.toThrow();
    await expect(
      computeReport({ ...input, profile: { ...input.profile, adapted: true } }),
    ).rejects.toThrow(/documentée/);
    await expect(
      computeReport({ ...input, cabinet: { name: "X", orias_number: "123" } }),
    ).rejects.toThrow();
  });
});

describe("rendu PDF", () => {
  it("coupe les mots trop longs (URL, empreintes)", async () => {
    const r = await computeReport(input);
    const pdf = await renderReportPdf(r, await loadReportFonts());
    expect(pdf.length).toBeGreaterThan(10_000);
    // Rendu déterministe : mêmes entrées → mêmes octets.
    const pdf2 = await renderReportPdf(r, await loadReportFonts());
    expect(await sha256Hex(pdf2)).toBe(await sha256Hex(pdf));

    const text = (await pdfPagesText(pdf)).join("\n").replace(/\s+/g, " ");
    for (const s of [
      "Cabinet Test",
      "00000000",
      "CLI-1",
      "6f1c2a9e-3b7d-4e21-9a55-0c8d7e4f1b23",
      "Adéquat",
      "À vérifier",
      "une proportion minimale de 20 % d'investissements durables",
      "Aucune donnée disponible pour ce fonds.",
      r.data_snapshot_hash,
      r.content_hash,
      ENGINE_VERSION,
      LEGAL_NOTICE,
    ]) {
      expect(text).toContain(s);
    }
    expect(text).not.toContain("EXEMPLE");
  }, 30_000);

  it("bandeau EXEMPLE et adaptation documentée", async () => {
    const r = await computeReport({
      ...input,
      example: true,
      profile: {
        ...input.profile,
        adapted: true,
        adaptation_note: "Préférence taxinomie retirée le 2026-11-20.",
      },
    });
    const text = (await pdfPagesText(await renderReportPdf(r, await loadReportFonts()))).join(" ");
    expect(text).toContain("EXEMPLE");
    expect(text).toContain("Préférence taxinomie retirée le 2026-11-20.");
  }, 30_000);

  it("wrapText respecte la largeur", async () => {
    const { PDFDocument } = await import("pdf-lib");
    const doc = await PDFDocument.create();
    const { StandardFonts } = await import("pdf-lib");
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const lines = wrapText(`court ${"x".repeat(200)} fin`, font, 10, 100);
    expect(lines.length).toBeGreaterThan(3);
    for (const l of lines) expect(font.widthOfTextAtSize(l, 10)).toBeLessThanOrEqual(100);
    expect(wrapText("a\nb", font, 10, 100)).toEqual(["a", "b"]);
  });
});

describe("rapport d'exemple versionné", () => {
  it("fixtures/report/sample-report.pdf contient les 5 fonds et la mention légale", async () => {
    const text = (
      await pdfPagesText(new Uint8Array(await readFile("fixtures/report/sample-report.pdf")))
    )
      .join(" ")
      .replace(/\s+/g, " ");
    for (const isin of [
      "LU0347711466",
      "FR0010592022",
      "FR0010158220",
      "FR0013439528",
      "FR0011250281",
    ]) {
      expect(text).toContain(isin);
    }
    expect(text).toContain(LEGAL_NOTICE);
  }, 30_000);
});

describe("synthèse de scan (1 page)", () => {
  it("tient sur une page et annonce le chiffre clé du profil choisi", async () => {
    const { scanContract } = await import("../../scan/scan");
    const { DEFAULT_SCAN_PROFILES } = await import("../../matching/profiles");
    const { renderScanPdf } = await import("../scan-pdf");
    const { fundDataSchema } = await import("../../matching/types");
    const data = (
      JSON.parse(await readFile("fixtures/scan/sample-funds-data.json", "utf8")) as unknown[]
    ).map((d) => fundDataSchema.parse(d));
    const many = Array.from({ length: 60 }, (_, i) => `FR${String(i).padStart(9, "0")}0`);
    const result = scanContract(
      {
        insurer: "A",
        contract_name: "C",
        list_date: "2026-10-01",
        source_url: null,
        as_of: "2026-11-24",
      },
      [...data.map((d) => d.isin), ...many],
      new Map(data.map((d) => [d.isin, d])),
      DEFAULT_SCAN_PROFILES,
    );
    const pdf = await renderScanPdf(result, "FORT", await loadReportFonts());
    const pages = await pdfPagesText(pdf);
    expect(pages).toHaveLength(1);
    const text = pages[0].replace(/\s+/g, " ");
    expect(text).toContain("2 UC sur 65 non adéquates pour un profil fort");
    expect(text).toContain("Profils types : hypothèses de travail");
    expect(text).toContain(LEGAL_NOTICE);
  }, 30_000);
});
