/**
 * Passage d'une extraction vérifiée aux lignes `pro_*`. Module pur.
 */
import type { Extraction, FossilGasNuclear, PaiCategory } from "./schema";
import type { EvidenceMap, VerificationResult } from "./verify";

/** Valeurs « métier » d'une extraction, celles que lit le moteur de matching. */
export interface SustainabilityValues {
  sfdr_article: 6 | 8 | 9 | null;
  doc_date: string | null;
  min_sustainable_pct: number | null;
  min_sustainable_env_pct: number | null;
  min_sustainable_social_pct: number | null;
  min_taxonomy_pct: number | null;
  min_taxonomy_pct_excl_sovereign: number | null;
  min_es_aligned_pct: number | null;
  considers_pai: boolean | null;
  pai_categories: PaiCategory[];
  fossil_gas_nuclear: FossilGasNuclear | null;
}

export function sustainabilityValues(
  x: Extraction,
  v: Pick<VerificationResult, "paiCategories">,
): SustainabilityValues {
  return {
    sfdr_article: x.sfdr_article.value,
    doc_date: x.doc_date.value,
    min_sustainable_pct: x.min_sustainable_pct.value,
    min_sustainable_env_pct: x.min_sustainable_env_pct.value,
    min_sustainable_social_pct: x.min_sustainable_social_pct.value,
    min_taxonomy_pct: x.min_taxonomy_pct.value,
    min_taxonomy_pct_excl_sovereign: x.min_taxonomy_pct_excl_sovereign.value,
    min_es_aligned_pct: x.min_es_aligned_pct.value,
    considers_pai: x.considers_pai.value,
    pai_categories: v.paiCategories,
    fossil_gas_nuclear: x.fossil_gas_nuclear.value,
  };
}

export interface SustainabilityRow {
  document_id: string;
  isin: string;
  min_sustainable_pct: number | null;
  min_sustainable_env_pct: number | null;
  min_sustainable_social_pct: number | null;
  min_taxonomy_pct: number | null;
  min_taxonomy_pct_excl_sovereign: number | null;
  min_es_aligned_pct: number | null;
  considers_pai: boolean | null;
  pai_categories: PaiCategory[];
  fossil_gas_nuclear: FossilGasNuclear | null;
  /** "not_stated" : cherché (prompt v2+), non trouvé ; null : non évalué (v1). */
  benchmark_exclusions: "pab" | "ctb" | "not_stated" | null;
  /** Preuves par champ, plus `_review_reasons` (raisons de la mise en revue). */
  evidence: Record<string, EvidenceMap[string] | string[]>;
  extraction_model: string;
  extraction_version: string;
  status: "auto" | "needs_review";
}

export function sustainabilityRow(args: {
  documentId: string;
  isin: string;
  extraction: Extraction;
  verification: VerificationResult;
  model: string;
  version: string;
}): SustainabilityRow {
  const vals = sustainabilityValues(args.extraction, args.verification);
  return {
    document_id: args.documentId,
    isin: args.isin,
    min_sustainable_pct: vals.min_sustainable_pct,
    min_sustainable_env_pct: vals.min_sustainable_env_pct,
    min_sustainable_social_pct: vals.min_sustainable_social_pct,
    min_taxonomy_pct: vals.min_taxonomy_pct,
    min_taxonomy_pct_excl_sovereign: vals.min_taxonomy_pct_excl_sovereign,
    min_es_aligned_pct: vals.min_es_aligned_pct,
    considers_pai: vals.considers_pai,
    pai_categories: vals.pai_categories,
    fossil_gas_nuclear: vals.fossil_gas_nuclear,
    benchmark_exclusions:
      args.extraction.benchmark_exclusions === undefined
        ? null
        : (args.extraction.benchmark_exclusions.value ?? "not_stated"),
    evidence: {
      ...args.verification.evidence,
      ...(args.verification.reviewReasons.length > 0
        ? { _review_reasons: args.verification.reviewReasons }
        : {}),
    },
    extraction_model: args.model,
    extraction_version: args.version,
    status: args.verification.status,
  };
}
