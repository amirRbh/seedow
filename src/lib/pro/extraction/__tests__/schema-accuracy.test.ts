import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { expectedFileSchema, sameValue, scoreExtractions, type ExpectedFixture } from "../accuracy";
import { extractionJsonSchema, extractionSchema } from "../schema";
import type { SustainabilityValues } from "../to-row";

describe("schéma d'extraction", () => {
  it("le JSON Schema (structured outputs) et le schéma zod ont les mêmes champs", () => {
    const props = Object.keys(extractionJsonSchema.properties as object).sort();
    expect(props).toEqual(Object.keys(extractionSchema.shape).sort());
    expect([...(extractionJsonSchema.required as string[])].sort()).toEqual(props);
  });
  it("tous les objets du JSON Schema interdisent les propriétés additionnelles", () => {
    const walk = (s: unknown): void => {
      if (!s || typeof s !== "object") return;
      const o = s as Record<string, unknown>;
      if (o.type === "object") expect(o.additionalProperties).toBe(false);
      Object.values(o).forEach(walk);
    };
    walk(extractionJsonSchema);
  });
  it("refuse un pourcentage hors bornes et un champ inconnu", () => {
    const f = { value: null, page: null, quote: null, ambiguous: false, visual: false, note: null };
    const base = Object.fromEntries(
      Object.keys(extractionSchema.shape).map((k) => [
        k,
        k === "pai_categories" ? [] : k === "language" ? "fr" : f,
      ]),
    );
    expect(extractionSchema.safeParse(base).success).toBe(true);
    expect(
      extractionSchema.safeParse({ ...base, min_taxonomy_pct: { ...f, value: 120 } }).success,
    ).toBe(false);
    expect(extractionSchema.safeParse({ ...base, extra: 1 }).success).toBe(false);
  });
});

describe("notation de précision", () => {
  const fields: ExpectedFixture["fields"] = {
    sfdr_article: 8,
    doc_date: null,
    min_sustainable_pct: 10,
    min_sustainable_env_pct: null,
    min_sustainable_social_pct: null,
    min_taxonomy_pct: 0,
    min_taxonomy_pct_excl_sovereign: 0,
    min_es_aligned_pct: 90,
    considers_pai: true,
    pai_categories: ["ghg", "social"],
    fossil_gas_nuclear: "no",
  };
  const expected = { "a.pdf": { isin: null, source_url: null, fund_name: null, fields } };

  it("compare nombres, null et ensembles", () => {
    expect(sameValue(10, 10.001)).toBe(true);
    expect(sameValue(null, 0)).toBe(false);
    expect(sameValue(["social", "ghg"], ["ghg", "social"])).toBe(true);
  });
  it("100 % quand tout concorde, écarts listés sinon, document manquant = faux partout", () => {
    const actual: Record<string, SustainabilityValues> = { "a.pdf": { ...fields } };
    expect(scoreExtractions(expected, actual).overall).toEqual({ correct: 11, total: 11 });
    const wrong = scoreExtractions(expected, { "a.pdf": { ...fields, considers_pai: false } });
    expect(wrong.perAxis.c).toEqual({ correct: 1, total: 2 });
    expect(wrong.mismatches).toHaveLength(1);
    expect(scoreExtractions(expected, {}).overall.correct).toBe(0);
  });
  it("expected.json des fixtures est valide et chaque PDF existe", async () => {
    const file = expectedFileSchema.parse(
      JSON.parse(await readFile("fixtures/annexes/expected.json", "utf8")),
    );
    for (const name of Object.keys(file.fixtures)) {
      const head = (await readFile(`fixtures/annexes/${name}`)).subarray(0, 4).toString("latin1");
      expect(head).toBe("%PDF");
    }
  });
});

describe("exclusions d'indice de référence (prompt v2)", () => {
  it("v1 : non évalué ; v2 : pab, ctb ou not_stated", async () => {
    const { sustainabilityRow } = await import("../to-row");
    const f = { value: null, page: null, quote: null, ambiguous: false, visual: false, note: null };
    const base = Object.fromEntries(
      Object.keys(extractionSchema.shape)
        .filter((k) => k !== "benchmark_exclusions")
        .map((k) => [k, k === "pai_categories" ? [] : k === "language" ? "fr" : f]),
    );
    const row = (x: unknown) =>
      sustainabilityRow({
        documentId: "d",
        isin: "FR0010592022",
        extraction: extractionSchema.parse(x),
        verification: { evidence: {}, status: "auto", reviewReasons: [], paiCategories: [] },
        model: "m",
        version: "v",
      }).benchmark_exclusions;
    expect(row(base)).toBeNull();
    expect(row({ ...base, benchmark_exclusions: f })).toBe("not_stated");
    expect(
      row({ ...base, benchmark_exclusions: { ...f, value: "pab", page: 3, quote: "q" } }),
    ).toBe("pab");
    expect(extractionJsonSchema.required).toContain("benchmark_exclusions");
  });
});
