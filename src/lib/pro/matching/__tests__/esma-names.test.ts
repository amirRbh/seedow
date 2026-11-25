import { describe, expect, it } from "vitest";
import { match } from "../engine";
import { esmaRequirements, esmaTermsInName, exclusionsSatisfy } from "../esma-names";
import type { FundData } from "../types";

const cats = (name: string) => esmaTermsInName(name).map((m) => `${m.category}:${m.term}`);

describe("familles de termes (ESMA §15)", () => {
  it.each([
    ["Mirova Global Green Bond", ["environmental:green"]],
    ["Actions Climatiques", ["environmental:climatiques"]],
    ["ESG Leaders ISR", ["environmental:esg", "environmental:isr"]],
    ["Global Environment", ["environmental:environment"]],
    ["Energy Transition Impact", ["transition:transition", "impact:impact"]],
    ["Net-Zero Pathway", ["transition:net-zero"]],
    ["Euro Évolution Améliorée", ["transition:amelioree", "transition:evolution"]],
    ["Social Bonds", ["social:social"]],
    ["Égalité Femmes Hommes", ["social:egalite"]],
    ["Governance Leaders", ["governance:governance"]],
    ["Impactful Equity", ["impact:impactful"]],
    ["Sustainability Leaders", ["sustainability:sustainability"]],
    ["Fonds Développement Durables", ["sustainability:durables"]],
    ["Greenfield Infrastructure", []],
    ["Prisrisk", []],
    ["Actions Europe", []],
  ])("« %s »", (name, expected) => {
    expect(cats(name).sort()).toEqual([...expected].sort());
  });

  it("marque les rattachements interprétés (hors exemples ESMA)", () => {
    const r = esmaTermsInName("Amundi Responsible Investing Vert Carbone");
    expect(r.every((m) => m.category === "environmental" && m.interpreted)).toBe(true);
    expect(r).toHaveLength(3);
    expect(esmaTermsInName("Fonds Solidaire")[0]).toMatchObject({
      category: "social",
      interpreted: true,
    });
    expect(esmaTermsInName("Green")[0].interpreted).toBe(false);
  });
});

describe("exigences (ESMA §16 à 19)", () => {
  it("transition, social, gouvernance → CTB", () => {
    for (const n of ["Social Bonds", "Governance Leaders", "Climate Transition"]) {
      expect(esmaRequirements(esmaTermsInName(n)).exclusions).toBe("ctb");
    }
  });
  it("environnement, impact, durabilité → PAB", () => {
    for (const n of ["Green Bonds", "Impact Equity", "Sustainable Equity", "Social Impact"]) {
      expect(esmaRequirements(esmaTermsInName(n)).exclusions).toBe("pab");
    }
  });
  it("§19 : avec un terme « transition », seules les exigences CTB s'appliquent", () => {
    expect(esmaRequirements(esmaTermsInName("Green Transition"))).toMatchObject({
      exclusions: "ctb",
      meaningfulSustainableInvestment: false,
    });
  });
  it("durabilité → engagement significatif en investissements durables", () => {
    expect(
      esmaRequirements(esmaTermsInName("Sustainable Transition")).meaningfulSustainableInvestment,
    ).toBe(true);
    expect(esmaRequirements([])).toEqual({
      categories: [],
      exclusions: null,
      meaningfulSustainableInvestment: false,
    });
  });
  it("PAB couvre CTB, pas l'inverse", () => {
    expect(exclusionsSatisfy("pab", "ctb")).toBe(true);
    expect(exclusionsSatisfy("pab", "pab")).toBe(true);
    expect(exclusionsSatisfy("ctb", "ctb")).toBe(true);
    expect(exclusionsSatisfy("ctb", "pab")).toBe(false);
  });
});

const fund = (over: Partial<FundData>): FundData => ({
  isin: "FR0010592022",
  name: "Fonds Test",
  sfdr_article: 8,
  doc_date: "2026-06-01",
  min_sustainable_pct: 20,
  min_taxonomy_pct: 5,
  min_taxonomy_pct_excl_sovereign: 5,
  min_es_aligned_pct: 90,
  considers_pai: true,
  pai_categories: [],
  status: "validated",
  evidence: { benchmark_exclusions: { page: 4, quote: "exclusions des indices accord de Paris" } },
  ...over,
});
const codes = (f: FundData) =>
  match(
    { taxonomy_min_pct: null, sfdr_min_pct: null, pai_required: false, pai_categories: [] },
    f,
    { asOf: "2026-11-24" },
  ).alerts.map((a) => a.code);

describe("alerte NOM_EXCLUSIONS_NON_MENTIONNEES", () => {
  it.each([
    ["Green Bonds", "not_stated", true],
    ["Green Bonds", "ctb", true],
    ["Green Bonds", "pab", false],
    ["Social Bonds", "ctb", false],
    ["Social Bonds", "pab", false],
    ["Social Bonds", "not_stated", true],
    ["Actions Europe", "not_stated", false],
  ] as const)("%s, exclusions %s → alerte %s", (name, excl, expected) => {
    expect(
      codes(fund({ name, benchmark_exclusions: excl })).includes("NOM_EXCLUSIONS_NON_MENTIONNEES"),
    ).toBe(expected);
  });
  it("non évalué (extraction antérieure, null ou absent) → aucune alerte", () => {
    expect(codes(fund({ name: "Green Bonds", benchmark_exclusions: null }))).toEqual([]);
    expect(codes(fund({ name: "Green Bonds" }))).toEqual([]);
  });
  it("message factuel, cite la famille, l'exclusion attendue et la source", () => {
    const a = match(
      { taxonomy_min_pct: null, sfdr_min_pct: null, pai_required: false, pai_categories: [] },
      fund({ name: "Green Bonds", benchmark_exclusions: "ctb" }),
      { asOf: "2026-11-24" },
    ).alerts.find((x) => x.code === "NOM_EXCLUSIONS_NON_MENTIONNEES")!;
    expect(a.message).toMatch(/famille ESMA : environnement/);
    expect(a.message).toMatch(/PAB, art\. 12\(1\)\(a\) à \(g\)/);
    expect(a.message).toMatch(
      /mentionne seulement les exclusions des indices « transition climatique »/,
    );
    expect(a.sources[0]).toMatchObject({ field: "benchmark_exclusions", page: 4 });
    const interp = match(
      { taxonomy_min_pct: null, sfdr_min_pct: null, pai_required: false, pai_categories: [] },
      fund({ name: "Avenir Vert", benchmark_exclusions: "not_stated" }),
      { asOf: "2026-11-24" },
    ).alerts[0];
    expect(interp.message).toMatch(/rattachement interprété par Seedow/);
    expect(interp.message).toMatch(/telle que lue par Seedow, ne mentionne pas/);
  });
  it("NOM_DURABLE_SANS_ID suit la famille « durabilité » (ESMA §18)", () => {
    expect(codes(fund({ name: "Sustainable Equity", min_sustainable_pct: 0 }))).toContain(
      "NOM_DURABLE_SANS_ID",
    );
    expect(codes(fund({ name: "Actions ISR", min_sustainable_pct: 0 }))).not.toContain(
      "NOM_DURABLE_SANS_ID",
    );
  });
});
