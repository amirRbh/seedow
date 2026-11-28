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
  /**
   * Identité telle que le DOCUMENT l'énonce (pas la vérité externe) : un champ
   * absent du document est attendu à `null`, et toute valeur est une invention.
   * `management_company_accepted` : variantes jugées acceptables (citation
   * indirecte), notées justes elles aussi.
   */
  identity: z
    .object({
      fund_name: z.string().nullable(),
      isin: z.string().nullable(),
      lei: z.string().nullable(),
      management_company: z.string().nullable(),
      management_company_accepted: z.array(z.string()).optional(),
    })
    .strict()
    .optional(),
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

// ---------------------------------------------------------------------------
// Identité : nom, ISIN, LEI, société de gestion, catégorie SFDR
// ---------------------------------------------------------------------------

export const IDENTITY_FIELDS = ["fund_name", "isin", "lei", "management_company"] as const;
export type IdentityField = (typeof IDENTITY_FIELDS)[number];

export interface IdentityValues {
  fund_name: string | null;
  isin: string | null;
  lei: string | null;
  management_company: string | null;
}

/** Comparaison de libellés : casse, accents, ponctuation et espaces ignorés. */
export function normalizeLabel(x: string): string {
  return x
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export interface IdentityReport {
  perField: Record<IdentityField, { correct: number; total: number }>;
  /** Valeurs données alors que le document ne les énonce pas. */
  invented: { fixture: string; field: IdentityField; actual: string }[];
  mismatches: { fixture: string; field: IdentityField; expected: unknown; actual: unknown }[];
}

export function scoreIdentity(
  expected: Record<string, ExpectedFixture>,
  actual: Record<string, IdentityValues>,
): IdentityReport {
  const perField = Object.fromEntries(
    IDENTITY_FIELDS.map((f) => [f, { correct: 0, total: 0 }]),
  ) as IdentityReport["perField"];
  const invented: IdentityReport["invented"] = [];
  const mismatches: IdentityReport["mismatches"] = [];

  for (const [name, exp] of Object.entries(expected)) {
    const id = exp.identity;
    if (!id) continue;
    const got = actual[name];
    for (const f of IDENTITY_FIELDS) {
      perField[f].total++;
      const want = id[f];
      const a = got ? got[f] : undefined;
      let ok: boolean;
      if (a === undefined) ok = false;
      else if (want === null) {
        ok =
          a === null ||
          (f === "management_company" &&
            (id.management_company_accepted ?? []).some(
              (v) => normalizeLabel(v) === normalizeLabel(a),
            ));
        if (!ok && a !== null) invented.push({ fixture: name, field: f, actual: a });
      } else if (a === null) ok = false;
      else if (f === "fund_name" || f === "management_company") {
        ok = normalizeLabel(want) === normalizeLabel(a);
      } else ok = want === a;
      if (ok) perField[f].correct++;
      else mismatches.push({ fixture: name, field: f, expected: want, actual: a ?? "∅" });
    }
  }
  return { perField, invented, mismatches };
}

export function formatIdentity(r: IdentityReport): string {
  const lines = ["champ d'identité                   | justes | précision", "-".repeat(60)];
  for (const f of IDENTITY_FIELDS) {
    const c = r.perField[f];
    lines.push(`${f.padEnd(35)}| ${`${c.correct}/${c.total}`.padEnd(7)}| ${pctStr(c)}`);
  }
  lines.push(`valeurs inventées (absentes du document) : ${r.invented.length}`);
  return lines.join("\n");
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
