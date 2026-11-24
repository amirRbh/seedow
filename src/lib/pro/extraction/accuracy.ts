/**
 * Mesure de précision de l'extraction contre un attendu saisi à la main
 * (`fixtures/annexes/expected.json`). Module pur.
 */
import { z } from "zod";
import { FOSSIL_GAS_NUCLEAR, PAI_CATEGORIES } from "./schema";
import type { SustainabilityValues } from "./to-row";

export const SCORED_FIELDS = [
  "sfdr_article",
  "doc_date",
  "min_sustainable_pct",
  "min_sustainable_env_pct",
  "min_sustainable_social_pct",
  "min_taxonomy_pct",
  "min_taxonomy_pct_excl_sovereign",
  "min_es_aligned_pct",
  "considers_pai",
  "pai_categories",
  "fossil_gas_nuclear",
] as const satisfies readonly (keyof SustainabilityValues)[];
export type ScoredField = (typeof SCORED_FIELDS)[number];

/** Champs des préférences MiFID : objectif 100 %. */
export const AXIS_FIELDS: Record<"a" | "b" | "c", readonly ScoredField[]> = {
  a: ["min_taxonomy_pct", "min_taxonomy_pct_excl_sovereign"],
  b: ["min_sustainable_pct"],
  c: ["considers_pai", "pai_categories"],
};

const pct = z.number().min(0).max(100).nullable();

export const expectedFixtureSchema = z.object({
  isin: z.string().nullable(),
  source_url: z.string().url().nullable(),
  fund_name: z.string().nullable(),
  fields: z
    .object({
      sfdr_article: z.union([z.literal(6), z.literal(8), z.literal(9)]).nullable(),
      doc_date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .nullable(),
      min_sustainable_pct: pct,
      min_sustainable_env_pct: pct,
      min_sustainable_social_pct: pct,
      min_taxonomy_pct: pct,
      min_taxonomy_pct_excl_sovereign: pct,
      min_es_aligned_pct: pct,
      considers_pai: z.boolean().nullable(),
      pai_categories: z.array(z.enum(PAI_CATEGORIES)),
      fossil_gas_nuclear: z.enum(FOSSIL_GAS_NUCLEAR).nullable(),
    })
    .strict(),
  /** Le pipeline doit-il envoyer ce document en revue ? (indicatif, non noté) */
  expect_needs_review: z.boolean().optional(),
  notes: z.string().optional(),
});
export type ExpectedFixture = z.infer<typeof expectedFixtureSchema>;

export const expectedFileSchema = z.object({
  _comment: z.string().optional(),
  fixtures: z.record(z.string(), expectedFixtureSchema),
});

export function sameValue(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    const sa = new Set(a);
    return sa.size === new Set(b).size && b.every((x) => sa.has(x));
  }
  if (typeof a === "number" && typeof b === "number") return Math.abs(a - b) < 0.005;
  return a === b;
}

export interface FieldMismatch {
  fixture: string;
  field: ScoredField;
  expected: unknown;
  actual: unknown;
}

export interface AccuracyReport {
  perField: Record<ScoredField, { correct: number; total: number }>;
  perAxis: Record<"a" | "b" | "c", { correct: number; total: number }>;
  overall: { correct: number; total: number };
  mismatches: FieldMismatch[];
}

export function scoreExtractions(
  expected: Record<string, ExpectedFixture>,
  actual: Record<string, SustainabilityValues>,
): AccuracyReport {
  const perField = Object.fromEntries(
    SCORED_FIELDS.map((f) => [f, { correct: 0, total: 0 }]),
  ) as AccuracyReport["perField"];
  const mismatches: FieldMismatch[] = [];

  for (const [name, exp] of Object.entries(expected)) {
    const got = actual[name];
    for (const f of SCORED_FIELDS) {
      perField[f].total++;
      const a = got ? got[f] : undefined;
      if (got && sameValue(exp.fields[f], a)) perField[f].correct++;
      else mismatches.push({ fixture: name, field: f, expected: exp.fields[f], actual: a ?? "∅" });
    }
  }

  const sum = (fs: readonly ScoredField[]) =>
    fs.reduce(
      (acc, f) => ({
        correct: acc.correct + perField[f].correct,
        total: acc.total + perField[f].total,
      }),
      { correct: 0, total: 0 },
    );

  return {
    perField,
    perAxis: { a: sum(AXIS_FIELDS.a), b: sum(AXIS_FIELDS.b), c: sum(AXIS_FIELDS.c) },
    overall: sum(SCORED_FIELDS),
    mismatches,
  };
}

const pctStr = (c: { correct: number; total: number }) =>
  c.total === 0 ? "—" : `${((100 * c.correct) / c.total).toFixed(1)} %`;

/** Tableau texte lisible (CLI, sortie de test). */
export function formatAccuracy(r: AccuracyReport): string {
  const lines = ["champ                              | justes | précision", "-".repeat(60)];
  for (const f of SCORED_FIELDS) {
    const c = r.perField[f];
    lines.push(`${f.padEnd(35)}| ${`${c.correct}/${c.total}`.padEnd(7)}| ${pctStr(c)}`);
  }
  lines.push("-".repeat(60));
  for (const k of ["a", "b", "c"] as const) {
    const c = r.perAxis[k];
    lines.push(`axe (${k})`.padEnd(35) + `| ${`${c.correct}/${c.total}`.padEnd(7)}| ${pctStr(c)}`);
  }
  lines.push(
    "TOTAL".padEnd(35) +
      `| ${`${r.overall.correct}/${r.overall.total}`.padEnd(7)}| ${pctStr(r.overall)}`,
  );
  return lines.join("\n");
}
