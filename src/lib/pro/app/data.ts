/**
 * Passage des lignes Supabase (`pro_fund_current_data`, `pro_client_profiles`)
 * aux entrées du moteur et du rapport. Pur, testé : toute ligne lue en base
 * repasse par zod avant d'atteindre le moteur.
 */
import { z } from "zod";
import { PAI_CATEGORIES } from "../extraction/schema";
import type { ClientPreferences, EvidenceRef, FundData } from "../matching/types";
import type { ReportFund, ReportProfile } from "../report/model";

/** PostgREST renvoie les `numeric` en nombre ou en chaîne selon la configuration. */
const num = z
  .union([z.number(), z.string()])
  .nullable()
  .transform((v) => (v === null ? null : Number(v)));

export const currentDataRowSchema = z.object({
  isin: z.string(),
  fund_name: z.string(),
  sfdr_article: z.number().nullable(),
  doc_date: z.string().nullable(),
  doc_language: z.enum(["fr", "en"]).nullable(),
  doc_source_url: z.string().nullable(),
  doc_sha256: z.string(),
  min_sustainable_pct: num,
  min_taxonomy_pct: num,
  min_taxonomy_pct_excl_sovereign: num,
  min_es_aligned_pct: num,
  considers_pai: z.boolean().nullable(),
  pai_categories: z.array(z.enum(PAI_CATEGORIES)).nullable(),
  status: z.enum(["auto", "needs_review", "validated"]),
  evidence: z.record(z.string(), z.unknown()).nullable(),
  extraction_model: z.string(),
  extraction_version: z.string(),
  validated_at: z.string().nullable(),
});
export type CurrentDataRow = z.infer<typeof currentDataRowSchema>;

const evidenceEntry = z.object({
  page: z.number().int().nullable().optional(),
  quote: z.string().nullable().optional(),
});

/** Garde les preuves {page, quote} ; ignore `_review_reasons` et toute entrée mal formée. */
export function evidenceRefs(
  evidence: Record<string, unknown> | null,
): Record<string, EvidenceRef> {
  const out: Record<string, EvidenceRef> = {};
  for (const [k, v] of Object.entries(evidence ?? {})) {
    if (k.startsWith("_")) continue;
    const p = evidenceEntry.safeParse(v);
    if (!p.success) continue;
    const page = p.data.page ?? null;
    out[k] = { page: page !== null && page >= 1 ? page : null, quote: p.data.quote ?? null };
  }
  return out;
}

const article = (a: number | null): 6 | 8 | 9 | null => (a === 6 || a === 8 || a === 9 ? a : null);

export function toFundData(row: CurrentDataRow): FundData {
  return {
    isin: row.isin,
    name: row.fund_name,
    sfdr_article: article(row.sfdr_article),
    doc_date: row.doc_date,
    min_sustainable_pct: row.min_sustainable_pct,
    min_taxonomy_pct: row.min_taxonomy_pct,
    min_taxonomy_pct_excl_sovereign: row.min_taxonomy_pct_excl_sovereign,
    min_es_aligned_pct: row.min_es_aligned_pct,
    considers_pai: row.considers_pai,
    pai_categories: row.pai_categories ?? [],
    status: row.status,
    evidence: evidenceRefs(row.evidence),
  };
}

/** Fonds du rapport dans l'ordre demandé ; ISIN absent de la base → données nulles. */
export function toReportFunds(
  isins: readonly string[],
  rows: readonly CurrentDataRow[],
): ReportFund[] {
  const byIsin = new Map(rows.map((r) => [r.isin, r]));
  return isins.map((isin) => {
    const row = byIsin.get(isin);
    if (!row) return { isin, data: null, document: null, extraction: null };
    return {
      isin,
      data: toFundData(row),
      document: {
        doc_date: row.doc_date,
        language: row.doc_language,
        source_url: row.doc_source_url,
        sha256: row.doc_sha256,
      },
      extraction: {
        model: row.extraction_model,
        version: row.extraction_version,
        status: row.status,
        validated_at: row.validated_at,
      },
    };
  });
}

export const clientProfileRowSchema = z.object({
  id: z.string().uuid(),
  cabinet_id: z.string().uuid(),
  client_ref: z.string(),
  taxonomy_min_pct: num,
  sfdr_min_pct: num,
  pai_required: z.boolean(),
  pai_categories: z.array(z.enum(PAI_CATEGORIES)),
  collected_at: z.string(),
  adapted: z.boolean(),
  adaptation_note: z.string().nullable(),
  created_at: z.string(),
});
export type ClientProfileRow = z.infer<typeof clientProfileRowSchema>;

export function toPreferences(p: ClientProfileRow): ClientPreferences {
  return {
    taxonomy_min_pct: p.taxonomy_min_pct,
    sfdr_min_pct: p.sfdr_min_pct,
    pai_required: p.pai_required,
    pai_categories: p.pai_categories,
  };
}

export function toReportProfile(p: ClientProfileRow): ReportProfile {
  return {
    client_ref: p.client_ref,
    collected_at: p.collected_at,
    ...toPreferences(p),
    adapted: p.adapted,
    adaptation_note: p.adaptation_note,
  };
}

/** Saisie du formulaire de préférences (`/pro/clients/new`). */
export const clientProfileInputSchema = z
  .object({
    client_ref: z
      .string()
      .trim()
      .regex(
        /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/,
        "Pseudonyme interne uniquement (lettres, chiffres, . _ -) : jamais le nom ni l'email du client.",
      ),
    collected_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date de recueil requise"),
    taxonomy_min_pct: z.number().gt(0, "Un minimum exprimé est supérieur à 0").max(100).nullable(),
    sfdr_min_pct: z.number().gt(0, "Un minimum exprimé est supérieur à 0").max(100).nullable(),
    pai_required: z.boolean(),
    pai_categories: z.array(z.enum(PAI_CATEGORIES)),
    adapted: z.boolean(),
    adaptation_note: z.string().trim().max(4000).nullable(),
  })
  .refine((p) => p.pai_required || p.pai_categories.length === 0, {
    message: "Des catégories PAI supposent que les PAI soient demandées",
    path: ["pai_categories"],
  })
  .refine((p) => !p.adapted || (p.adaptation_note ?? "").length > 0, {
    message: "Une adaptation des préférences doit être documentée",
    path: ["adaptation_note"],
  });
export type ClientProfileInput = z.infer<typeof clientProfileInputSchema>;
