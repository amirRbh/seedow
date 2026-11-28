import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  expectedFileSchema,
  formatIdentity,
  normalizeLabel,
  scoreIdentity,
  type ExpectedFixture,
} from "../accuracy";

const base: ExpectedFixture = {
  isin: null,
  source_url: null,
  fund_name: "Fonds A",
  identity: {
    fund_name: "Fonds Éthique Monde",
    isin: null,
    lei: "969500XJ8EY8J6QDD528",
    management_company: null,
    management_company_accepted: ["Crédit Mutuel Asset Management"],
  },
  fields: {
    sfdr_article: 8,
    doc_date: null,
    min_sustainable_pct: null,
    min_sustainable_env_pct: null,
    min_sustainable_social_pct: null,
    min_taxonomy_pct: null,
    min_taxonomy_pct_excl_sovereign: null,
    min_es_aligned_pct: null,
    considers_pai: null,
    pai_categories: [],
    fossil_gas_nuclear: null,
  },
};

describe("notation de l'identité extraite", () => {
  it("ignore casse, accents et ponctuation sur les libellés", () => {
    expect(normalizeLabel("FONDS ÉTHIQUE – Monde")).toBe(normalizeLabel("fonds ethique monde"));
  });

  it("compte juste une valeur absente du document laissée à null", () => {
    const r = scoreIdentity(
      { a: base },
      {
        a: {
          fund_name: "FONDS ETHIQUE MONDE",
          isin: null,
          lei: "969500XJ8EY8J6QDD528",
          management_company: null,
        },
      },
    );
    expect(r.perField.fund_name.correct).toBe(1);
    expect(r.perField.isin.correct).toBe(1);
    expect(r.perField.lei.correct).toBe(1);
    expect(r.perField.management_company.correct).toBe(1);
    expect(r.invented).toHaveLength(0);
  });

  it("signale comme inventé un ISIN que le document ne donne pas", () => {
    const r = scoreIdentity(
      { a: base },
      {
        a: {
          fund_name: "Fonds Éthique Monde",
          isin: "FR0010592022",
          lei: "969500XJ8EY8J6QDD528",
          management_company: null,
        },
      },
    );
    expect(r.perField.isin.correct).toBe(0);
    expect(r.invented).toEqual([{ fixture: "a", field: "isin", actual: "FR0010592022" }]);
  });

  it("accepte une variante explicitement admise pour la société de gestion", () => {
    const r = scoreIdentity(
      { a: base },
      {
        a: {
          fund_name: "Fonds Éthique Monde",
          isin: null,
          lei: "969500XJ8EY8J6QDD528",
          management_company: "Credit Mutuel Asset Management",
        },
      },
    );
    expect(r.perField.management_company.correct).toBe(1);
    expect(r.invented).toHaveLength(0);
  });

  it("compte faux un LEI différent ou un document non extrait", () => {
    const r = scoreIdentity(
      { a: base, b: base },
      {
        a: {
          fund_name: "Fonds Éthique Monde",
          isin: null,
          lei: "969500XJ8EY8J6QDD529",
          management_company: null,
        },
      },
    );
    expect(r.perField.lei).toEqual({ correct: 0, total: 2 });
    expect(r.mismatches.some((m) => m.fixture === "b" && m.actual === "∅")).toBe(true);
    expect(formatIdentity(r)).toContain("lei");
  });

  it("le jeu de référence décrit l'identité des 7 annexes, sans ISIN dans le document", () => {
    const file = expectedFileSchema.parse(
      JSON.parse(readFileSync("fixtures/annexes/expected.json", "utf8")),
    );
    const ids = Object.values(file.fixtures).map((f) => f.identity);
    expect(ids).toHaveLength(7);
    for (const id of ids) {
      expect(id).toBeDefined();
      expect(id!.isin).toBeNull();
      // Clé de contrôle ISO 17442 (mod 97 = 1).
      const digits = id!.lei!.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
      expect(BigInt(digits) % 97n).toBe(1n);
    }
  });
});
