import { describe, expect, it } from "vitest";
import { matchPortfolio } from "../portfolio";
import type { ClientPreferences, FundData } from "../types";

const AS_OF = "2026-11-24";
const fund = (isin: string, over: Partial<FundData> = {}): FundData => ({
  isin,
  name: `Fonds ${isin}`,
  sfdr_article: 8,
  doc_date: "2026-06-01",
  min_sustainable_pct: 20,
  min_taxonomy_pct: 2,
  min_taxonomy_pct_excl_sovereign: 4,
  min_es_aligned_pct: 90,
  considers_pai: true,
  pai_categories: ["ghg", "social"],
  status: "validated",
  evidence: {},
  ...over,
});
const prefs = (p: Partial<ClientPreferences>): ClientPreferences => ({
  taxonomy_min_pct: null,
  sfdr_min_pct: null,
  pai_required: false,
  pai_categories: [],
  ...p,
});

describe("portefeuille : moyennes pondérées", () => {
  it("(b) : 75 % à 20 % + 25 % à 4 % = 16 % → conforme à ≥ 15 %, pas à ≥ 17 %", () => {
    const lines = [
      { isin: "A", amount: 75_000, fund: fund("A") },
      { isin: "B", amount: 25_000, fund: fund("B", { min_sustainable_pct: 4 }) },
    ];
    const ok = matchPortfolio(prefs({ sfdr_min_pct: 15 }), lines, { asOf: AS_OF });
    expect(ok.axes[0]).toMatchObject({ status: "PASS", fund_value: "16 %" });
    expect(ok.verdict).toBe("ADEQUAT");
    expect(ok.verdict_reason).toMatch(/des annexes/);
    expect(ok.lines.map((l) => l.weight_pct)).toEqual([75, 25]);
    expect(ok.lines[1].result.verdict).toBe("NON_ADEQUAT"); // la ligne seule ne suffit pas
    expect(ok.total_amount).toBe(100_000);
    const ko = matchPortfolio(prefs({ sfdr_min_pct: 17 }), lines, { asOf: AS_OF });
    expect(ko.axes[0].status).toBe("FAIL");
    expect(ko.verdict).toBe("NON_ADEQUAT");
  });
  it("égalité stricte = conforme", () => {
    const r = matchPortfolio(
      prefs({ sfdr_min_pct: 20 }),
      [{ isin: "A", amount: 1, fund: fund("A") }],
      {
        asOf: AS_OF,
      },
    );
    expect(r.axes[0].status).toBe("PASS");
  });
  it("(a) : chaque ligne contribue par sa valeur la plus basse (avec/hors souverains)", () => {
    const r = matchPortfolio(
      prefs({ taxonomy_min_pct: 2 }),
      [
        { isin: "A", amount: 50, fund: fund("A") }, // min(2, 4) = 2
        {
          isin: "B",
          amount: 50,
          fund: fund("B", { min_taxonomy_pct: null, min_taxonomy_pct_excl_sovereign: 3 }),
        },
      ],
      { asOf: AS_OF },
    );
    expect(r.axes[0]).toMatchObject({ status: "PASS", fund_value: "2,5 %" });
  });
  it("ligne art. 6 = 0 %, même si des chiffres traînent", () => {
    const r = matchPortfolio(
      prefs({ sfdr_min_pct: 10 }),
      [
        { isin: "A", amount: 50, fund: fund("A") },
        { isin: "B", amount: 50, fund: fund("B", { sfdr_article: 6, min_sustainable_pct: 50 }) },
      ],
      { asOf: AS_OF },
    );
    expect(r.axes[0]).toMatchObject({ status: "PASS", fund_value: "10 %" });
  });
  it("donnée absente ou fonds inconnu → moyenne non calculable", () => {
    const r = matchPortfolio(
      prefs({ sfdr_min_pct: 10, taxonomy_min_pct: 1 }),
      [
        { isin: "A", amount: 50, fund: fund("A", { min_sustainable_pct: null }) },
        { isin: "B", amount: 50, fund: null },
      ],
      { asOf: AS_OF },
    );
    expect(r.axes.map((a) => a.status)).toEqual(["DONNEE_MANQUANTE", "DONNEE_MANQUANTE"]);
    expect(r.axes[1].detail).toMatch(/A, B/);
    expect(r.axes[0].detail).toMatch(/B\.$/);
    expect(r.verdict).toBe("A_VERIFIER");
  });
});

it("(a) sans aucune valeur de taxinomie sur une ligne → non calculable", () => {
  const r = matchPortfolio(
    prefs({ taxonomy_min_pct: 1 }),
    [
      {
        isin: "A",
        amount: 1,
        fund: fund("A", { min_taxonomy_pct: null, min_taxonomy_pct_excl_sovereign: null }),
      },
    ],
    { asOf: AS_OF },
  );
  expect(r.axes[0].status).toBe("DONNEE_MANQUANTE");
});

describe("portefeuille : PAI cumulatives", () => {
  const two = (b: Partial<FundData>) => [
    { isin: "A", amount: 50, fund: fund("A") },
    { isin: "B", amount: 50, fund: fund("B", b) },
  ];
  it("toutes les lignes, toutes les catégories → conforme", () => {
    const r = matchPortfolio(prefs({ pai_required: true, pai_categories: ["ghg"] }), two({}), {
      asOf: AS_OF,
    });
    expect(r.axes[0]).toMatchObject({ status: "PASS", fund_value: "oui sur chaque ligne" });
    expect(r.axes[0].detail).toMatch(/GES/);
    expect(
      matchPortfolio(prefs({ pai_required: true }), two({}), { asOf: AS_OF }).axes[0].detail,
    ).not.toMatch(/catégories/);
  });
  it("une ligne « non » → non conforme, et la ligne est nommée", () => {
    const r = matchPortfolio(prefs({ pai_required: true }), two({ considers_pai: false }), {
      asOf: AS_OF,
    });
    expect(r.axes[0]).toMatchObject({ status: "FAIL", fund_value: "non pour 1 ligne(s)" });
    expect(r.axes[0].detail).toMatch(/B\.$/);
  });
  it("une ligne inconnue → donnée manquante ; catégorie non identifiée → à confirmer", () => {
    expect(
      matchPortfolio(prefs({ pai_required: true }), two({ considers_pai: null }), { asOf: AS_OF })
        .axes[0].status,
    ).toBe("DONNEE_MANQUANTE");
    const r = matchPortfolio(prefs({ pai_required: true, pai_categories: ["water"] }), two({}), {
      asOf: AS_OF,
    });
    expect(r.axes[0].status).toBe("A_CONFIRMER");
    expect(r.verdict).toBe("A_VERIFIER");
  });
});

describe("portefeuille : garde-fous", () => {
  it("ligne en attente de revue → à vérifier", () => {
    const r = matchPortfolio(
      prefs({ sfdr_min_pct: 1 }),
      [{ isin: "A", amount: 1, fund: fund("A", { status: "needs_review" }) }],
      { asOf: AS_OF },
    );
    expect(r).toMatchObject({
      verdict: "A_VERIFIER",
      verdict_reason: expect.stringMatching(/au moins une ligne/),
    });
  });
  it("aucune préférence → neutre", () => {
    expect(
      matchPortfolio(prefs({}), [{ isin: "A", amount: 1, fund: fund("A") }], { asOf: AS_OF })
        .verdict,
    ).toBe("NEUTRE");
  });
  it("refuse un portefeuille vide ou un montant nul, négatif ou non fini", () => {
    expect(() => matchPortfolio(prefs({}), [], { asOf: AS_OF })).toThrow(/vide/);
    for (const amount of [0, -5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() =>
        matchPortfolio(prefs({}), [{ isin: "A", amount, fund: null }], { asOf: AS_OF }),
      ).toThrow(/strictement positif/);
    }
  });
});
