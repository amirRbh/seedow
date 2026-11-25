/**
 * Règles de conformité du rapport et de la fiche de recueil, tirées de la
 * synthèse SPOT AMF (février 2026) et du document conjoint ACPR/AMF
 * (novembre 2025).
 */
import { describe, expect, it } from "vitest";
import { loadReportFonts } from "../../../../../scripts/pro/lib/fonts";
import { pdfPagesText } from "../../../../../scripts/pro/lib/pdf-text";
import { NEUTRAL_EXPLANATION, renderCollectionPdf } from "../collection-pdf";
import { ReportInputError, computeReport, sha256Hex } from "../model";
import { renderReportPdf } from "../pdf";

const fund = (isin: string, over: Record<string, unknown> = {}) => ({
  isin,
  data: {
    isin,
    name: `Fonds ${isin}`,
    sfdr_article: 8,
    doc_date: "2026-06-01",
    min_sustainable_pct: 10,
    min_taxonomy_pct: 0,
    min_taxonomy_pct_excl_sovereign: 0,
    min_es_aligned_pct: 90,
    considers_pai: true,
    pai_categories: [],
    status: "validated",
    evidence: {},
    ...over,
  },
  document: { doc_date: "2026-06-01", language: "fr", source_url: null, sha256: "b".repeat(64) },
  extraction: { model: "m", version: "prompt.v1", status: "validated", validated_at: null },
});

const profile = {
  client_ref: "CLI-9",
  collected_at: "2026-11-20",
  taxonomy_min_pct: null,
  sfdr_min_pct: 25,
  pai_required: false,
  pai_categories: [],
  preference_mode: "detailed",
};

const base = {
  report_id: "6f1c2a9e-3b7d-4e21-9a55-0c8d7e4f1b23",
  created_at: "2026-11-25T10:00:00Z",
  cabinet: { name: "Cabinet Test", orias_number: "00000000" },
  profile,
  funds: [fund("FR0010592022"), fund("LU0347711466", { min_sustainable_pct: 15 })],
};
const prefs10 = {
  taxonomy_min_pct: null,
  sfdr_min_pct: 10,
  pai_required: false,
  pai_categories: [],
};

describe("adaptation des préférences (ACPR/AMF, art. 54 §10)", () => {
  it("acceptée : le conseil applique les préférences adaptées, les résultats initiaux restent tracés", async () => {
    const r = await computeReport({
      ...base,
      adaptation: {
        proposal: "Aucun fonds n'atteint 25 % ; les deux fonds s'engagent sur 10 % et 15 %.",
        decision: "accepted",
        adapted: prefs10,
        reasons: "Le client préfère investir maintenant avec un minimum de 10 %.",
      },
    });
    expect(r.recommendation).toBe("issued");
    expect(r.effective_preferences.sfdr_min_pct).toBe(10);
    expect(r.initial_preferences.sfdr_min_pct).toBe(25);
    expect(r.results.map((x) => x.verdict)).toEqual(["ADEQUAT", "ADEQUAT"]);
    expect(r.initial_results!.map((x) => x.verdict)).toEqual(["NON_ADEQUAT", "NON_ADEQUAT"]);
    const text = (await pdfPagesText(await renderReportPdf(r, await loadReportFonts())))
      .join(" ")
      .replace(/\s+/g, " ");
    expect(text).toContain("Adaptation proposée pour ce conseil");
    expect(text).toContain("le recueil n'est pas modifié");
    expect(text).toContain("Décision du client : accepte l'adaptation");
    expect(text).toContain("Le client préfère investir maintenant");
    expect(text).toContain("Avec les préférences recueillies : 0 fonds adéquat(s) sur 2");
  }, 30_000);

  it("refusée : aucune recommandation, la décision et ses motifs sont enregistrés", async () => {
    const r = await computeReport({
      ...base,
      adaptation: {
        proposal: "Abaisser le minimum à 10 %.",
        decision: "refused",
        adapted: null,
        reasons: "Le client maintient 25 %.",
      },
    });
    expect(r.recommendation).toBe("none");
    expect(r.effective_preferences.sfdr_min_pct).toBe(25);
    const text = (await pdfPagesText(await renderReportPdf(r, await loadReportFonts())))
      .join(" ")
      .replace(/\s+/g, " ");
    expect(text).toContain(
      "Aucune recommandation n'est présentée comme correspondant aux préférences du client",
    );
    expect(text).toContain("Le client maintient 25 %.");
  }, 30_000);

  it("refusée si un fonds proposé correspond déjà aux préférences recueillies", async () => {
    await expect(
      computeReport({
        ...base,
        funds: [fund("FR0010592022", { min_sustainable_pct: 30 })],
        adaptation: { proposal: "x", decision: "accepted", adapted: prefs10, reasons: "y" },
      }),
    ).rejects.toThrow(ReportInputError);
  });

  it("refusée pour un client neutre, et cohérence décision ↔ préférences adaptées", async () => {
    await expect(
      computeReport({
        ...base,
        profile: { ...profile, sfdr_min_pct: null, preference_mode: "neutral" },
        adaptation: { proposal: "x", decision: "refused", adapted: null, reasons: "y" },
      }),
    ).rejects.toThrow(/neutre/);
    await expect(
      computeReport({
        ...base,
        adaptation: { proposal: "x", decision: "accepted", adapted: null, reasons: "y" },
      }),
    ).rejects.toThrow();
    await expect(
      computeReport({
        ...base,
        adaptation: { proposal: "x", decision: "refused", adapted: prefs10, reasons: "y" },
      }),
    ).rejects.toThrow();
  });
});

describe("approche portefeuille dans le rapport", () => {
  it("montants sur toutes les lignes → moyenne pondérée et section dédiée", async () => {
    const r = await computeReport({
      ...base,
      profile: { ...profile, sfdr_min_pct: 12 },
      funds: [
        { ...fund("FR0010592022"), amount: 50_000 },
        { ...fund("LU0347711466", { min_sustainable_pct: 15 }), amount: 50_000 },
      ],
    });
    expect(r.evaluation).toBe("portfolio");
    expect(r.portfolio!.axes[0]).toMatchObject({ status: "PASS", fund_value: "12,5 %" });
    const text = (await pdfPagesText(await renderReportPdf(r, await loadReportFonts())))
      .join(" ")
      .replace(/\s+/g, " ");
    expect(text).toContain("Évaluation de l'allocation (approche portefeuille)");
    expect(text).toContain("Verdict de l'allocation : Adéquat");
  }, 30_000);

  it("adaptation en portefeuille : seulement si l'allocation ne correspond pas", async () => {
    await expect(
      computeReport({
        ...base,
        profile: { ...profile, sfdr_min_pct: 12 },
        funds: [{ ...fund("FR0010592022", { min_sustainable_pct: 20 }), amount: 1 }],
        adaptation: { proposal: "x", decision: "refused", adapted: null, reasons: "y" },
      }),
    ).rejects.toThrow(/portefeuille proposé correspond/);
  });

  it("montants partiels refusés", async () => {
    await expect(
      computeReport({
        ...base,
        funds: [{ ...fund("FR0010592022"), amount: 1 }, fund("LU0347711466")],
      }),
    ).rejects.toThrow(/toutes les lignes, ou pour aucune/);
  });
});

describe("modes de recueil", () => {
  it("neutre : le rapport le dit explicitement (SPOT AMF §3.4.2)", async () => {
    const r = await computeReport({
      ...base,
      profile: { ...profile, sfdr_min_pct: null, preference_mode: "neutral" },
    });
    expect(r.results.every((x) => x.verdict === "NEUTRE")).toBe(true);
    const text = (await pdfPagesText(await renderReportPdf(r, await loadReportFonts())))
      .join(" ")
      .replace(/\s+/g, " ");
    expect(text).toContain("client « neutre »");
  }, 30_000);

  it("prédéfini : nom et description exigés et restitués", async () => {
    await expect(
      computeReport({ ...base, profile: { ...profile, preference_mode: "predefined" } }),
    ).rejects.toThrow(/nommé et décrit/);
    const r = await computeReport({
      ...base,
      profile: {
        ...profile,
        preference_mode: "predefined",
        predefined_label: "Engagé",
        predefined_description: "Au moins 25 % d'investissements durables au sens SFDR.",
        joint_account: true,
      },
    });
    const text = (await pdfPagesText(await renderReportPdf(r, await loadReportFonts())))
      .join(" ")
      .replace(/\s+/g, " ");
    expect(text).toContain("Profil prédéfini choisi : Engagé");
    expect(text).toContain("Compte joint");
  }, 30_000);

  it("neutre avec critère refusé", async () => {
    await expect(
      computeReport({ ...base, profile: { ...profile, preference_mode: "neutral" } }),
    ).rejects.toThrow(/neutre/);
  });
});

describe("fiche de recueil", () => {
  const snap = (p: Record<string, unknown>) => ({
    record_id: "7f1c2a9e-3b7d-4e21-9a55-0c8d7e4f1b23",
    created_at: "2026-11-25T10:00:00Z",
    cabinet: { name: "Cabinet Test", orias_number: "00000000" },
    profile: { ...profile, ...p },
  });

  it("trace l'explication neutre, le parcours et les réponses ; rendu déterministe", async () => {
    const fonts = await loadReportFonts();
    const pdf = await renderCollectionPdf(snap({}), fonts);
    expect(await sha256Hex(await renderCollectionPdf(snap({}), fonts))).toBe(await sha256Hex(pdf));
    const text = (await pdfPagesText(pdf)).join(" ").replace(/\s+/g, " ");
    for (const part of NEUTRAL_EXPLANATION) expect(text).toContain(part.title);
    expect(text).toContain("Oui (préférences détaillées ci-dessous)");
    expect(text).toContain("au moins 25 %");
    expect(text).toContain("Le conseiller");
    expect(text).not.toContain("EXEMPLE");
  }, 30_000);

  it("neutre et prédéfini", async () => {
    const fonts = await loadReportFonts();
    const neutral = (
      await pdfPagesText(
        await renderCollectionPdf(snap({ sfdr_min_pct: null, preference_mode: "neutral" }), fonts),
      )
    )
      .join(" ")
      .replace(/\s+/g, " ");
    expect(neutral).toContain("Non, ou ne se prononce pas");
    expect(neutral).toContain("Aucune préférence de durabilité n'est retenue");
    const pre = (
      await pdfPagesText(
        await renderCollectionPdf(
          {
            ...snap({
              preference_mode: "predefined",
              predefined_label: "Engagé",
              predefined_description: "Au moins 25 % d'investissements durables.",
              pai_required: true,
              pai_categories: ["ghg"],
              joint_account: true,
            }),
            example: true,
          },
          fonts,
        ),
      )
    )
      .join(" ")
      .replace(/\s+/g, " ");
    expect(pre).toContain("Profil prédéfini choisi : Engagé");
    expect(pre).toContain("thèmes : GES");
    expect(pre).toContain("une fiche est établie pour chaque co-titulaire");
    expect(pre).toContain("EXEMPLE");
  }, 30_000);
});
