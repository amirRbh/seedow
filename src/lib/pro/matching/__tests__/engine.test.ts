import { describe, expect, it } from "vitest";
import { ENGINE_VERSION, esgTermsInName, formatPct, isOlderThanMonths, match } from "../engine";
import {
  clientPreferencesSchema,
  fundDataSchema,
  type AlertCode,
  type AxisStatus,
  type ClientPreferences,
  type FundData,
  type Verdict,
} from "../types";

const AS_OF = "2026-11-24";

/** Fonds art. 8 « propre » : validé, PAI oui, toutes catégories, chiffres moyens. */
function fund(over: Partial<FundData> = {}): FundData {
  return {
    isin: "FR0010592022",
    name: "Fonds Test Actions",
    sfdr_article: 8,
    doc_date: "2026-06-01",
    min_sustainable_pct: 20,
    min_taxonomy_pct: 5,
    min_taxonomy_pct_excl_sovereign: 5,
    min_es_aligned_pct: 90,
    considers_pai: true,
    pai_categories: ["ghg", "biodiversity", "water", "waste", "social"],
    status: "validated",
    evidence: {
      min_sustainable_pct: {
        page: 1,
        quote: "proportion minimale de 20% d'investissements durables",
      },
      min_taxonomy_pct: { page: 5, quote: "au moins 5% alignés" },
      considers_pai: { page: 3, quote: "Oui, le produit prend en compte" },
    },
    ...over,
  };
}

const prefs = (over: Partial<ClientPreferences> = {}): ClientPreferences => ({
  taxonomy_min_pct: null,
  sfdr_min_pct: null,
  pai_required: false,
  pai_categories: [],
  ...over,
});

const codes = (f: FundData) => match(prefs(), f, { asOf: AS_OF }).alerts.map((a) => a.code);

describe("axes et verdicts (table de cas)", () => {
  type Case = {
    name: string;
    profile: Partial<ClientPreferences>;
    fund: Partial<FundData> | null;
    axes: Partial<Record<"a" | "b" | "c", AxisStatus>>;
    verdict: Verdict;
  };
  const cases: Case[] = [
    // Client sans préférence
    { name: "aucune préférence → NEUTRE", profile: {}, fund: {}, axes: {}, verdict: "NEUTRE" },
    {
      name: "aucune préférence, fonds sans données → NEUTRE",
      profile: {},
      fund: null,
      axes: {},
      verdict: "NEUTRE",
    },
    {
      name: "aucune préférence, needs_review → NEUTRE",
      profile: {},
      fund: { status: "needs_review" },
      axes: {},
      verdict: "NEUTRE",
    },
    // (a) taxinomie
    {
      name: "(a) au-dessus",
      profile: { taxonomy_min_pct: 3 },
      fund: {},
      axes: { a: "PASS" },
      verdict: "ADEQUAT",
    },
    {
      name: "(a) égalité stricte = PASS",
      profile: { taxonomy_min_pct: 5 },
      fund: {},
      axes: { a: "PASS" },
      verdict: "ADEQUAT",
    },
    {
      name: "(a) en dessous",
      profile: { taxonomy_min_pct: 5.01 },
      fund: {},
      axes: { a: "FAIL" },
      verdict: "NON_ADEQUAT",
    },
    {
      name: "(a) valeur la plus conservatrice : hors souverains plus basse",
      profile: { taxonomy_min_pct: 5 },
      fund: { min_taxonomy_pct: 6, min_taxonomy_pct_excl_sovereign: 4 },
      axes: { a: "FAIL" },
      verdict: "NON_ADEQUAT",
    },
    {
      name: "(a) valeur la plus conservatrice : avec souverains plus basse",
      profile: { taxonomy_min_pct: 5 },
      fund: { min_taxonomy_pct: 4, min_taxonomy_pct_excl_sovereign: 9 },
      axes: { a: "FAIL" },
      verdict: "NON_ADEQUAT",
    },
    {
      name: "(a) seule la valeur hors souverains existe",
      profile: { taxonomy_min_pct: 5 },
      fund: { min_taxonomy_pct: null, min_taxonomy_pct_excl_sovereign: 7 },
      axes: { a: "PASS" },
      verdict: "ADEQUAT",
    },
    {
      name: "(a) seule la valeur avec souverains existe",
      profile: { taxonomy_min_pct: 5 },
      fund: { min_taxonomy_pct: 7, min_taxonomy_pct_excl_sovereign: null },
      axes: { a: "PASS" },
      verdict: "ADEQUAT",
    },
    {
      name: "(a) aucune valeur → DONNEE_MANQUANTE",
      profile: { taxonomy_min_pct: 5 },
      fund: { min_taxonomy_pct: null, min_taxonomy_pct_excl_sovereign: null },
      axes: { a: "DONNEE_MANQUANTE" },
      verdict: "A_VERIFIER",
    },
    // (b) SFDR
    {
      name: "(b) au-dessus",
      profile: { sfdr_min_pct: 10 },
      fund: {},
      axes: { b: "PASS" },
      verdict: "ADEQUAT",
    },
    {
      name: "(b) égalité",
      profile: { sfdr_min_pct: 20 },
      fund: {},
      axes: { b: "PASS" },
      verdict: "ADEQUAT",
    },
    {
      name: "(b) en dessous",
      profile: { sfdr_min_pct: 25 },
      fund: {},
      axes: { b: "FAIL" },
      verdict: "NON_ADEQUAT",
    },
    {
      name: "(b) null → DONNEE_MANQUANTE",
      profile: { sfdr_min_pct: 10 },
      fund: { min_sustainable_pct: null },
      axes: { b: "DONNEE_MANQUANTE" },
      verdict: "A_VERIFIER",
    },
    {
      name: "(b) 0 % face à un minimum demandé",
      profile: { sfdr_min_pct: 1 },
      fund: { min_sustainable_pct: 0 },
      axes: { b: "FAIL" },
      verdict: "NON_ADEQUAT",
    },
    // (c) PAI
    {
      name: "(c) oui",
      profile: { pai_required: true },
      fund: {},
      axes: { c: "PASS" },
      verdict: "ADEQUAT",
    },
    {
      name: "(c) non",
      profile: { pai_required: true },
      fund: { considers_pai: false },
      axes: { c: "FAIL" },
      verdict: "NON_ADEQUAT",
    },
    {
      name: "(c) null → DONNEE_MANQUANTE",
      profile: { pai_required: true },
      fund: { considers_pai: null },
      axes: { c: "DONNEE_MANQUANTE" },
      verdict: "A_VERIFIER",
    },
    {
      name: "(c) catégories demandées toutes identifiées",
      profile: { pai_required: true, pai_categories: ["ghg", "water"] },
      fund: {},
      axes: { c: "PASS" },
      verdict: "ADEQUAT",
    },
    {
      name: "(c) catégorie demandée non identifiable → A_CONFIRMER",
      profile: { pai_required: true, pai_categories: ["ghg", "water"] },
      fund: { pai_categories: ["ghg"] },
      axes: { c: "A_CONFIRMER" },
      verdict: "A_VERIFIER",
    },
    {
      name: "(c) catégories demandées, fonds sans catégorie identifiée",
      profile: { pai_required: true, pai_categories: ["social"] },
      fund: { pai_categories: [] },
      axes: { c: "A_CONFIRMER" },
      verdict: "A_VERIFIER",
    },
    {
      name: "(c) PAI non : FAIL même si des catégories sont demandées",
      profile: { pai_required: true, pai_categories: ["ghg"] },
      fund: { considers_pai: false, pai_categories: [] },
      axes: { c: "FAIL" },
      verdict: "NON_ADEQUAT",
    },
    // Combinaisons
    {
      name: "trois axes PASS → ADEQUAT",
      profile: { taxonomy_min_pct: 5, sfdr_min_pct: 20, pai_required: true },
      fund: {},
      axes: { a: "PASS", b: "PASS", c: "PASS" },
      verdict: "ADEQUAT",
    },
    {
      name: "PASS + FAIL → PARTIEL",
      profile: { taxonomy_min_pct: 10, sfdr_min_pct: 10 },
      fund: {},
      axes: { a: "FAIL", b: "PASS" },
      verdict: "PARTIEL",
    },
    {
      name: "FAIL + A_CONFIRMER → PARTIEL",
      profile: { sfdr_min_pct: 50, pai_required: true, pai_categories: ["water"] },
      fund: { pai_categories: [] },
      axes: { b: "FAIL", c: "A_CONFIRMER" },
      verdict: "PARTIEL",
    },
    {
      name: "PASS + A_CONFIRMER → A_VERIFIER",
      profile: { sfdr_min_pct: 10, pai_required: true, pai_categories: ["water"] },
      fund: { pai_categories: [] },
      axes: { b: "PASS", c: "A_CONFIRMER" },
      verdict: "A_VERIFIER",
    },
    {
      name: "tous FAIL → NON_ADEQUAT",
      profile: { taxonomy_min_pct: 50, sfdr_min_pct: 50, pai_required: true },
      fund: { considers_pai: false },
      axes: { a: "FAIL", b: "FAIL", c: "FAIL" },
      verdict: "NON_ADEQUAT",
    },
    {
      name: "donnée manquante l'emporte sur un FAIL → A_VERIFIER",
      profile: { taxonomy_min_pct: 50, sfdr_min_pct: 10 },
      fund: { min_sustainable_pct: null },
      axes: { a: "FAIL", b: "DONNEE_MANQUANTE" },
      verdict: "A_VERIFIER",
    },
    {
      name: "needs_review → A_VERIFIER même si tout passe",
      profile: { sfdr_min_pct: 10 },
      fund: { status: "needs_review" },
      axes: { b: "PASS" },
      verdict: "A_VERIFIER",
    },
    {
      name: "statut auto (non revu) n'empêche pas ADEQUAT (alerte NON_VALIDE à part)",
      profile: { sfdr_min_pct: 10 },
      fund: { status: "auto" },
      axes: { b: "PASS" },
      verdict: "ADEQUAT",
    },
    // Article 6
    {
      name: "art. 6 : (a) et (b) FAIL",
      profile: { taxonomy_min_pct: 1, sfdr_min_pct: 1 },
      fund: {
        sfdr_article: 6,
        min_sustainable_pct: null,
        min_taxonomy_pct: null,
        min_taxonomy_pct_excl_sovereign: null,
      },
      axes: { a: "FAIL", b: "FAIL" },
      verdict: "NON_ADEQUAT",
    },
    {
      name: "art. 6 : (a)/(b) FAIL même si des chiffres traînent",
      profile: { taxonomy_min_pct: 1, sfdr_min_pct: 1 },
      fund: { sfdr_article: 6 },
      axes: { a: "FAIL", b: "FAIL" },
      verdict: "NON_ADEQUAT",
    },
    {
      name: "art. 6 + PAI oui → PARTIEL",
      profile: { sfdr_min_pct: 1, pai_required: true },
      fund: { sfdr_article: 6, min_sustainable_pct: null },
      axes: { b: "FAIL", c: "PASS" },
      verdict: "PARTIEL",
    },
    {
      name: "art. 6 + PAI inconnu → A_VERIFIER",
      profile: { sfdr_min_pct: 1, pai_required: true },
      fund: { sfdr_article: 6, considers_pai: null },
      axes: { b: "FAIL", c: "DONNEE_MANQUANTE" },
      verdict: "A_VERIFIER",
    },
    {
      name: "article inconnu : on juge sur les chiffres",
      profile: { sfdr_min_pct: 10 },
      fund: { sfdr_article: null },
      axes: { b: "PASS" },
      verdict: "ADEQUAT",
    },
    // Fonds sans aucune donnée
    {
      name: "ISIN sans données → tous les axes DONNEE_MANQUANTE",
      profile: { taxonomy_min_pct: 1, sfdr_min_pct: 1, pai_required: true },
      fund: null,
      axes: { a: "DONNEE_MANQUANTE", b: "DONNEE_MANQUANTE", c: "DONNEE_MANQUANTE" },
      verdict: "A_VERIFIER",
    },
  ];

  it.each(cases)("$name", ({ profile, fund: f, axes, verdict }) => {
    const r = match(prefs(profile), f === null ? null : fund(f), {
      asOf: AS_OF,
      isin: "LU0000000000",
    });
    expect(Object.fromEntries(r.axes.map((a) => [a.axis, a.status]))).toEqual(axes);
    expect(r.verdict).toBe(verdict);
    expect(r.engine_version).toBe(ENGINE_VERSION);
  });

  it("chaque axe expose demande, valeur du fonds et source (page + citation)", () => {
    const r = match(prefs({ sfdr_min_pct: 10, taxonomy_min_pct: 2, pai_required: true }), fund(), {
      asOf: AS_OF,
    });
    const [a, b, c] = r.axes;
    expect(a).toMatchObject({ requested: "≥ 2 %", fund_value: "5 %" });
    expect(a.sources.map((s) => s.field)).toEqual([
      "min_taxonomy_pct",
      "min_taxonomy_pct_excl_sovereign",
    ]);
    expect(a.detail).toMatch(/valeur la plus basse des deux graphiques/);
    expect(b).toMatchObject({ requested: "≥ 10 %", fund_value: "20 %" });
    expect(b.sources).toEqual([
      {
        field: "min_sustainable_pct",
        page: 1,
        quote: "proportion minimale de 20% d'investissements durables",
      },
    ]);
    expect(c.sources[0]).toMatchObject({ field: "considers_pai", page: 3 });
  });

  it("libellés (c) : catégories demandées et identifiées", () => {
    const ok = match(prefs({ pai_required: true, pai_categories: ["ghg", "social"] }), fund(), {
      asOf: AS_OF,
    });
    expect(ok.axes[0].fund_value).toBe("oui (GES, social)");
    expect(ok.axes[0].sources.map((s) => s.field)).toContain("pai_category:ghg");
    const partial = match(
      prefs({ pai_required: true, pai_categories: ["ghg", "water"] }),
      fund({ pai_categories: ["ghg", "social"] }),
      { asOf: AS_OF },
    );
    expect(partial.axes[0].fund_value).toBe("oui (identifiées : GES, social)");
    expect(partial.axes[0].detail).toMatch(/catégories : eau\. Catégories identifiées : GES\./);
    const none = match(
      prefs({ pai_required: true, pai_categories: ["water"] }),
      fund({ pai_categories: [] }),
      {
        asOf: AS_OF,
      },
    );
    expect(none.axes[0].fund_value).toBe("oui");
    expect(none.axes[0].detail).not.toMatch(/Catégories identifiées/);
  });

  it("source sans preuve enregistrée → page et citation null", () => {
    const r = match(prefs({ sfdr_min_pct: 1 }), fund({ evidence: {} }), { asOf: AS_OF });
    expect(r.axes[0].sources).toEqual([{ field: "min_sustainable_pct", page: null, quote: null }]);
  });

  it("ISIN sans données : l'ISIN demandé est restitué, pas d'alerte", () => {
    const r = match(prefs({ sfdr_min_pct: 1 }), null, { asOf: AS_OF, isin: "LU1234567890" });
    expect(r).toMatchObject({ isin: "LU1234567890", fund_name: null, alerts: [] });
    expect(match(prefs(), null, { asOf: AS_OF }).isin).toBe("");
  });
});

describe("alertes", () => {
  it("fonds propre et validé : aucune alerte", () => {
    expect(codes(fund())).toEqual([]);
  });

  type AlertCase = { name: string; fund: Partial<FundData>; has: AlertCode[]; not?: AlertCode[] };
  const cases: AlertCase[] = [
    {
      name: "nom ESG + #1 < 80 %",
      fund: { name: "Actions Climat Europe", min_es_aligned_pct: 79.9 },
      has: ["NOM_ESG_ALLOCATION_FAIBLE"],
    },
    {
      name: "nom ESG + #1 = 80 % (seuil atteint)",
      fund: { name: "Actions Climat Europe", min_es_aligned_pct: 80 },
      has: [],
      not: ["NOM_ESG_ALLOCATION_FAIBLE"],
    },
    {
      name: "nom ESG + #1 inconnu : rien à constater",
      fund: { name: "Green Bonds", min_es_aligned_pct: null },
      has: [],
      not: ["NOM_ESG_ALLOCATION_FAIBLE"],
    },
    {
      name: "nom neutre + #1 faible",
      fund: { name: "Actions Europe", min_es_aligned_pct: 10 },
      has: [],
      not: ["NOM_ESG_ALLOCATION_FAIBLE"],
    },
    {
      name: "« durable » + 0 % durable",
      fund: { name: "Patrimoine Durable", min_sustainable_pct: 0 },
      has: ["NOM_DURABLE_SANS_ID", "ART8_ZERO_INVEST_DURABLE"],
    },
    {
      name: "« Sustainable » + 0 %",
      fund: { name: "Global Sustainable Equity", min_sustainable_pct: 0, sfdr_article: 9 },
      has: ["NOM_DURABLE_SANS_ID"],
      not: ["ART8_ZERO_INVEST_DURABLE"],
    },
    {
      name: "« durable » + 1 %",
      fund: { name: "Patrimoine Durable", min_sustainable_pct: 1 },
      has: [],
      not: ["NOM_DURABLE_SANS_ID"],
    },
    {
      name: "« durable » + inconnu",
      fund: { name: "Patrimoine Durable", min_sustainable_pct: null },
      has: [],
      not: ["NOM_DURABLE_SANS_ID"],
    },
    {
      name: "« ISR » seul ne déclenche pas NOM_DURABLE_SANS_ID",
      fund: { name: "Actions ISR", min_sustainable_pct: 0 },
      has: ["ART8_ZERO_INVEST_DURABLE"],
      not: ["NOM_DURABLE_SANS_ID"],
    },
    {
      name: "art. 8 à 0 % durable",
      fund: { min_sustainable_pct: 0 },
      has: ["ART8_ZERO_INVEST_DURABLE"],
    },
    {
      name: "art. 9 à 0 % : pas d'alerte art. 8",
      fund: { sfdr_article: 9, min_sustainable_pct: 0 },
      has: [],
      not: ["ART8_ZERO_INVEST_DURABLE"],
    },
    { name: "taxinomie 0 % (avec souverains)", fund: { min_taxonomy_pct: 0 }, has: ["TAXO_ZERO"] },
    {
      name: "taxinomie 0 % (hors souverains seulement)",
      fund: { min_taxonomy_pct: 3, min_taxonomy_pct_excl_sovereign: 0 },
      has: ["TAXO_ZERO"],
    },
    {
      name: "taxinomie inconnue : rien",
      fund: { min_taxonomy_pct: null, min_taxonomy_pct_excl_sovereign: null },
      has: [],
      not: ["TAXO_ZERO"],
    },
    { name: "PAI non", fund: { considers_pai: false }, has: ["PAI_NON"] },
    {
      name: "PAI inconnu : pas d'alerte PAI_NON",
      fund: { considers_pai: null },
      has: [],
      not: ["PAI_NON"],
    },
    { name: "document de plus de 12 mois", fund: { doc_date: "2025-11-23" }, has: ["DOC_ANCIEN"] },
    {
      name: "document d'exactement 12 mois",
      fund: { doc_date: "2025-11-24" },
      has: [],
      not: ["DOC_ANCIEN"],
    },
    { name: "document non daté", fund: { doc_date: null }, has: [], not: ["DOC_ANCIEN"] },
    { name: "statut auto", fund: { status: "auto" }, has: ["NON_VALIDE"] },
    { name: "statut needs_review", fund: { status: "needs_review" }, has: ["NON_VALIDE"] },
  ];

  it.each(cases)("$name", ({ fund: f, has, not = [] }) => {
    const got = codes(fund(f));
    for (const c of has) expect(got).toContain(c);
    for (const c of not) expect(got).not.toContain(c);
    if (has.length === 0) expect(got).toEqual([]);
  });

  it("messages factuels : pas d'intention prêtée au gérant", () => {
    const all = match(
      prefs(),
      fund({
        name: "Durable Climat Impact",
        min_es_aligned_pct: 10,
        min_sustainable_pct: 0,
        min_taxonomy_pct: 0,
        considers_pai: false,
        doc_date: "2024-01-01",
        status: "needs_review",
      }),
      { asOf: AS_OF },
    ).alerts;
    expect(all.map((a) => a.code)).toEqual([
      "NOM_ESG_ALLOCATION_FAIBLE",
      "NOM_DURABLE_SANS_ID",
      "ART8_ZERO_INVEST_DURABLE",
      "TAXO_ZERO",
      "PAI_NON",
      "DOC_ANCIEN",
      "NON_VALIDE",
    ]);
    const text = all
      .map((a) => a.message)
      .join(" ")
      .toLowerCase();
    for (const word of [
      "greenwashing",
      "trompe",
      "mensong",
      "fraude",
      "abusi",
      "induire en erreur",
    ]) {
      expect(text).not.toContain(word);
    }
    expect(all[0].message).toMatch(/les termes « durable », « climat », « impact »/);
    expect(all[0].message).toMatch(/10 %.*80 %/);
    expect(all[5].message).toMatch(/datée du 2024-01-01/);
    expect(all.find((a) => a.code === "NON_VALIDE")?.message).toMatch(/en attente de revue/);
    expect(codes(fund({ status: "auto" }))).toEqual(["NON_VALIDE"]);
  });

  it("niveaux : info pour les constats neutres, attention sinon", () => {
    const levels = Object.fromEntries(
      match(prefs(), fund({ min_sustainable_pct: 0, min_taxonomy_pct: 0, considers_pai: false }), {
        asOf: AS_OF,
      }).alerts.map((a) => [a.code, a.level]),
    );
    expect(levels).toEqual({
      ART8_ZERO_INVEST_DURABLE: "info",
      TAXO_ZERO: "info",
      PAI_NON: "attention",
    });
  });
});

describe("utilitaires", () => {
  it.each([
    ["Mirova Global Green Bond", ["green"]],
    ["Amundi Responsible Investing", ["responsible"]],
    ["Fonds Responsable Europe", ["responsible"]],
    ["Sustainability Leaders", ["sustainable"]],
    ["Actions Climatiques", ["climat"]],
    ["Fonds Développement Durables", ["durable"]],
    ["ESG Leaders ISR", ["ESG", "ISR"]],
    ["Energy Transition Impact", ["impact", "transition"]],
    ["Impactful Equity", []],
    ["Greenfield Infrastructure", []],
    ["Prisrisk", []],
  ])("termes ESG dans « %s »", (name, terms) => {
    expect(esgTermsInName(name).sort()).toEqual([...terms].sort());
  });

  it("formatPct : virgule décimale, arrondi au centième", () => {
    expect(formatPct(10)).toBe("10 %");
    expect(formatPct(55.5)).toBe("55,5 %");
    expect(formatPct(2.345)).toBe("2,35 %");
  });

  it("isOlderThanMonths gère les fins d'année et le 29 février", () => {
    expect(isOlderThanMonths("2025-12-15", "2026-12-15", 12)).toBe(false);
    expect(isOlderThanMonths("2025-12-15", "2026-12-16", 12)).toBe(true);
    expect(isOlderThanMonths("2024-02-29", "2025-02-28", 12)).toBe(false);
    expect(isOlderThanMonths("2024-02-29", "2025-03-01", 12)).toBe(true);
    expect(isOlderThanMonths("2026-01-31", "2026-07-31", 6)).toBe(false);
  });
});

describe("validation des entrées (zod)", () => {
  it("préférences : minimum strictement positif, catégories seulement si PAI demandées", () => {
    expect(clientPreferencesSchema.safeParse(prefs({ sfdr_min_pct: 10 })).success).toBe(true);
    expect(clientPreferencesSchema.safeParse(prefs({ sfdr_min_pct: 0 })).success).toBe(false);
    expect(clientPreferencesSchema.safeParse(prefs({ taxonomy_min_pct: 101 })).success).toBe(false);
    expect(clientPreferencesSchema.safeParse(prefs({ pai_categories: ["ghg"] })).success).toBe(
      false,
    );
    expect(
      clientPreferencesSchema.safeParse(prefs({ pai_required: true, pai_categories: ["ghg"] }))
        .success,
    ).toBe(true);
  });
  it("données fonds : ISIN, dates et pourcentages contrôlés ; evidence par défaut {}", () => {
    const { evidence: _e, ...noEvidence } = fund();
    expect(fundDataSchema.parse(noEvidence).evidence).toEqual({});
    expect(fundDataSchema.safeParse({ ...fund(), isin: "FR123" }).success).toBe(false);
    expect(fundDataSchema.safeParse({ ...fund(), doc_date: "01/06/2026" }).success).toBe(false);
    expect(fundDataSchema.safeParse({ ...fund(), min_sustainable_pct: -1 }).success).toBe(false);
  });
  it("déterminisme : même entrée, même sortie", () => {
    const p = prefs({
      taxonomy_min_pct: 3,
      sfdr_min_pct: 10,
      pai_required: true,
      pai_categories: ["ghg"],
    });
    expect(match(p, fund(), { asOf: AS_OF })).toEqual(match(p, fund(), { asOf: AS_OF }));
  });
});

describe("raison du verdict", () => {
  it.each([
    [prefs(), fund(), /Aucune préférence/],
    [prefs({ sfdr_min_pct: 1 }), null, /Aucune donnée disponible/],
    [prefs({ sfdr_min_pct: 1 }), fund({ status: "needs_review" }), /en attente de revue humaine/],
    [prefs({ sfdr_min_pct: 1 }), fund({ min_sustainable_pct: null }), /absente de l'annexe/],
    [prefs({ sfdr_min_pct: 1 }), fund(), /Chaque préférence exprimée est satisfaite/],
    [prefs({ sfdr_min_pct: 99 }), fund(), /Aucune des préférences/],
    [
      prefs({ pai_required: true, pai_categories: ["water"] }),
      fund({ pai_categories: [] }),
      /reste à confirmer/,
    ],
    [prefs({ sfdr_min_pct: 99, pai_required: true }), fund(), /Une partie seulement/],
  ] as const)("%#", (p, f, re) => {
    expect(match(p, f, { asOf: AS_OF }).verdict_reason).toMatch(re);
  });
});
