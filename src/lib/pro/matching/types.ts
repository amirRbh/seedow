/**
 * Entrées du moteur de matching, validées par zod (les mêmes schémas servent
 * aux formulaires `/pro` et aux scripts).
 */
import { z } from "zod";
import { PAI_CATEGORIES, type PaiCategory } from "../extraction/schema";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date attendue au format AAAA-MM-JJ");
const pct = z.number().min(0).max(100);

/**
 * Préférences de durabilité du client (règl. délégué 2017/565 art. 2(7)).
 * `null` = axe non exprimé. Un minimum exprimé est strictement positif : « au
 * moins 0 % » n'est pas une préférence.
 */
export const clientPreferencesSchema = z
  .object({
    taxonomy_min_pct: z.number().gt(0).max(100).nullable(),
    sfdr_min_pct: z.number().gt(0).max(100).nullable(),
    pai_required: z.boolean(),
    pai_categories: z.array(z.enum(PAI_CATEGORIES)),
  })
  .refine((p) => p.pai_required || p.pai_categories.length === 0, {
    message: "des catégories PAI n'ont de sens que si les PAI sont demandées",
    path: ["pai_categories"],
  });
export type ClientPreferences = z.infer<typeof clientPreferencesSchema>;

/** Référence de preuve : page de l'annexe et citation. */
export const evidenceRefSchema = z.object({
  page: z.number().int().min(1).nullable(),
  quote: z.string().nullable(),
});
export type EvidenceRef = z.infer<typeof evidenceRefSchema>;

/** Données d'un fonds telles que lues dans `pro_fund_current_data`. */
export const fundDataSchema = z.object({
  isin: z.string().regex(/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/),
  name: z.string().min(1),
  sfdr_article: z.union([z.literal(6), z.literal(8), z.literal(9)]).nullable(),
  doc_date: isoDate.nullable(),
  min_sustainable_pct: pct.nullable(),
  min_taxonomy_pct: pct.nullable(),
  min_taxonomy_pct_excl_sovereign: pct.nullable(),
  min_es_aligned_pct: pct.nullable(),
  considers_pai: z.boolean().nullable(),
  pai_categories: z.array(z.enum(PAI_CATEGORIES)),
  status: z.enum(["auto", "needs_review", "validated"]),
  /** Preuves par champ (sous-ensemble de `evidence` jsonb). */
  evidence: z.record(z.string(), evidenceRefSchema).default({}),
});
export type FundData = z.infer<typeof fundDataSchema>;

export const matchOptionsSchema = z.object({
  /** Date de référence (date du rapport), pour l'ancienneté des documents. */
  asOf: isoDate,
});
export type MatchOptions = z.infer<typeof matchOptionsSchema>;

export type Axis = "a" | "b" | "c";
export type AxisStatus = "PASS" | "FAIL" | "DONNEE_MANQUANTE" | "A_CONFIRMER";
export type Verdict = "ADEQUAT" | "PARTIEL" | "NON_ADEQUAT" | "A_VERIFIER" | "NEUTRE";

export interface AxisSource {
  field: string;
  page: number | null;
  quote: string | null;
}

export interface AxisResult {
  axis: Axis;
  status: AxisStatus;
  /** Ce que le client demande (ex. « ≥ 10 % », « PAI : GES, eau »). */
  requested: string;
  /** Ce que l'annexe engage (ex. « 8 % », « non communiqué »). */
  fund_value: string;
  /** Explication factuelle, sans jugement. */
  detail: string;
  sources: AxisSource[];
}

export type AlertCode =
  | "NOM_ESG_ALLOCATION_FAIBLE"
  | "NOM_DURABLE_SANS_ID"
  | "ART8_ZERO_INVEST_DURABLE"
  | "TAXO_ZERO"
  | "PAI_NON"
  | "DOC_ANCIEN"
  | "NON_VALIDE";

export interface Alert {
  code: AlertCode;
  level: "info" | "attention";
  message: string;
  sources: AxisSource[];
}

export interface MatchResult {
  isin: string;
  fund_name: string | null;
  verdict: Verdict;
  /** Raison du verdict, en une phrase factuelle. */
  verdict_reason: string;
  axes: AxisResult[];
  alerts: Alert[];
  engine_version: string;
}

export type { PaiCategory };
