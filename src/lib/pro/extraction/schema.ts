/**
 * Schéma de la sortie d'extraction d'une annexe précontractuelle SFDR
 * (RTS 2022/1288, annexe II pour l'art. 8, annexe III pour l'art. 9).
 *
 * Chaque valeur arrive avec SA preuve : `{value, page, quote, ambiguous, visual, note}`.
 *   - `page`  : index physique de la page dans le PDF (1 = première page du fichier) ;
 *   - `quote` : citation verbatim, vérifiée ensuite contre le texte de la page ;
 *   - `ambiguous` : le document donne plusieurs chiffres ou une fourchette ;
 *   - `visual` : la valeur n'est lisible que sur un élément graphique (case cochée,
 *     camembert) — la citation est alors le libellé textuel le plus proche.
 *
 * Valeur absente du document → `null`. Jamais de déduction.
 *
 * Module pur : zod + un JSON Schema écrit à la main pour `output_config.format`
 * (structured outputs). Les deux sont tenus en phase par un test.
 */
import { z } from "zod";

export const PAI_CATEGORIES = ["ghg", "biodiversity", "water", "waste", "social"] as const;
export type PaiCategory = (typeof PAI_CATEGORIES)[number];

export const FOSSIL_GAS_NUCLEAR = ["no", "fossil_gas", "nuclear", "both"] as const;

/** Exclusions d'indice de référence (orientations ESMA sur les noms de fonds). */
export const BENCHMARK_EXCLUSIONS = ["pab", "ctb"] as const;
export type FossilGasNuclear = (typeof FOSSIL_GAS_NUCLEAR)[number];

/** Champs « pourcentage » : engagement minimum, en % de l'actif. */
export const PCT_FIELDS = [
  "min_sustainable_pct",
  "min_sustainable_env_pct",
  "min_sustainable_social_pct",
  "min_taxonomy_pct",
  "min_taxonomy_pct_excl_sovereign",
  "min_es_aligned_pct",
] as const;
export type PctField = (typeof PCT_FIELDS)[number];

const evidenceFields = {
  page: z.number().int().min(1).nullable(),
  quote: z.string().nullable(),
  ambiguous: z.boolean(),
  visual: z.boolean(),
  note: z.string().nullable(),
};

function field<T extends z.ZodTypeAny>(value: T) {
  return z.object({ value: value.nullable(), ...evidenceFields }).strict();
}

const pct = z.number().min(0).max(100);

export const extractionSchema = z
  .object({
    language: z.enum(["fr", "en"]).nullable(),
    fund_name: field(z.string().min(1)),
    isin: field(z.string().regex(/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/)),
    lei: field(z.string().min(1)),
    management_company: field(z.string().min(1)),
    sfdr_article: field(z.union([z.literal(6), z.literal(8), z.literal(9)])),
    doc_date: field(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
    min_sustainable_pct: field(pct),
    min_sustainable_env_pct: field(pct),
    min_sustainable_social_pct: field(pct),
    min_taxonomy_pct: field(pct),
    min_taxonomy_pct_excl_sovereign: field(pct),
    min_es_aligned_pct: field(pct),
    considers_pai: field(z.boolean()),
    pai_all_mandatory_indicators: field(z.boolean()),
    pai_categories: z.array(
      z
        .object({
          category: z.enum(PAI_CATEGORIES),
          page: z.number().int().min(1),
          quote: z.string(),
        })
        .strict(),
    ),
    fossil_gas_nuclear: field(z.enum(FOSSIL_GAS_NUCLEAR)),
    /** Depuis prompt.v2 ; absent des extractions v1. */
    benchmark_exclusions: field(z.enum(BENCHMARK_EXCLUSIONS)).optional(),
  })
  .strict();

export type Extraction = z.infer<typeof extractionSchema>;
export type ExtractionField = Exclude<keyof Extraction, "language" | "pai_categories">;
export type FieldEvidence = NonNullable<Extraction[ExtractionField]>;

/** Champs à valeur + preuve, dans l'ordre du schéma. */
export const EVIDENCE_FIELDS = [
  "fund_name",
  "isin",
  "lei",
  "management_company",
  "sfdr_article",
  "doc_date",
  ...PCT_FIELDS,
  "considers_pai",
  "pai_all_mandatory_indicators",
  "fossil_gas_nuclear",
  "benchmark_exclusions",
] as const satisfies readonly ExtractionField[];

/**
 * Champs clés : ceux dont dépend directement le matching des axes (a), (b), (c).
 * Null alors que le fonds est art. 8/9, citation non vérifiée, valeur ambiguë
 * ou lue seulement sur un graphique → `needs_review`.
 */
export const KEY_FIELDS = [
  "sfdr_article",
  "min_sustainable_pct",
  "min_taxonomy_pct",
  "considers_pai",
] as const satisfies readonly ExtractionField[];

// ---------------------------------------------------------------------------
// JSON Schema pour `output_config.format` (structured outputs).
// Tous les objets : `additionalProperties: false` et tous les champs requis.
// ---------------------------------------------------------------------------

type JsonSchema = Record<string, unknown>;

const nullable = (s: JsonSchema): JsonSchema => ({ anyOf: [s, { type: "null" }] });

function jsonField(value: JsonSchema, description: string): JsonSchema {
  return {
    type: "object",
    description,
    additionalProperties: false,
    required: ["value", "page", "quote", "ambiguous", "visual", "note"],
    properties: {
      value: nullable(value),
      page: nullable({ type: "integer" }),
      quote: nullable({ type: "string" }),
      ambiguous: { type: "boolean" },
      visual: { type: "boolean" },
      note: nullable({ type: "string" }),
    },
  };
}

const jsonPct = { type: "number" };

export const extractionJsonSchema: JsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "language",
    ...EVIDENCE_FIELDS.slice(0, 6),
    ...PCT_FIELDS,
    "considers_pai",
    "pai_all_mandatory_indicators",
    "pai_categories",
    "fossil_gas_nuclear",
    "benchmark_exclusions",
  ],
  properties: {
    language: nullable({ type: "string", enum: ["fr", "en"] }),
    fund_name: jsonField({ type: "string" }, "Dénomination du produit"),
    isin: jsonField({ type: "string" }, "Code ISIN s'il figure dans le document, sinon null"),
    lei: jsonField({ type: "string" }, "Identifiant d'entité juridique (LEI)"),
    management_company: jsonField({ type: "string" }, "Société de gestion"),
    sfdr_article: jsonField({ type: "integer", enum: [6, 8, 9] }, "Article SFDR du modèle"),
    doc_date: jsonField({ type: "string" }, "Date du document, AAAA-MM-JJ"),
    min_sustainable_pct: jsonField(
      jsonPct,
      "(b) proportion minimale totale d'investissements durables",
    ),
    min_sustainable_env_pct: jsonField(jsonPct, "minimum durable à objectif environnemental"),
    min_sustainable_social_pct: jsonField(jsonPct, "minimum durable à objectif social"),
    min_taxonomy_pct: jsonField(
      jsonPct,
      "(a) minimum aligné taxinomie, obligations souveraines comprises",
    ),
    min_taxonomy_pct_excl_sovereign: jsonField(
      jsonPct,
      "(a) minimum aligné taxinomie, hors souverains",
    ),
    min_es_aligned_pct: jsonField(jsonPct, "proportion minimale #1 de l'allocation des actifs"),
    considers_pai: jsonField({ type: "boolean" }, "(c) réponse à la question PAI"),
    pai_all_mandatory_indicators: jsonField(
      { type: "boolean" },
      "le document affirme prendre en compte tous les indicateurs obligatoires (tableau 1, annexe I)",
    ),
    pai_categories: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["category", "page", "quote"],
        properties: {
          category: { type: "string", enum: [...PAI_CATEGORIES] },
          page: { type: "integer" },
          quote: { type: "string" },
        },
      },
    },
    fossil_gas_nuclear: jsonField(
      { type: "string", enum: [...FOSSIL_GAS_NUCLEAR] },
      "réponse à la question gaz fossile / nucléaire",
    ),
    benchmark_exclusions: jsonField(
      { type: "string", enum: [...BENCHMARK_EXCLUSIONS] },
      "exclusions d'indice de référence « accord de Paris » (pab) ou « transition climatique » (ctb) affirmées",
    ),
  },
};
