/**
 * Modèle d'un rapport d'adéquation : entrées validées (zod), calcul des
 * résultats par le moteur, empreintes. Pur et compatible Workers (WebCrypto,
 * Intl), sans I/O.
 *
 * Empreintes :
 *   - `data_snapshot_hash` : SHA-256 du JSON canonique des données fonds
 *     utilisées (valeurs, preuves, document, extraction) ;
 *   - `content_hash` : SHA-256 du JSON canonique du contenu du rapport
 *     (identifiants, cabinet, profil, résultats, versions, data_snapshot_hash).
 * L'empreinte du fichier PDF lui-même ne peut pas figurer dans le fichier
 * qu'elle identifie : elle est calculée après rendu et archivée dans
 * `pro_reports.pdf_sha256`.
 */
import { z } from "zod";
import { PAI_CATEGORIES } from "../extraction/schema";
import { ENGINE_VERSION, match } from "../matching/engine";
import { matchPortfolio, type PortfolioResult } from "../matching/portfolio";
import {
  clientPreferencesSchema,
  fundDataSchema,
  type ClientPreferences,
  type MatchResult,
} from "../matching/types";

/** Mode de recueil (document conjoint ACPR/AMF, nov. 2025). */
export const PREFERENCE_MODES = ["neutral", "detailed", "predefined"] as const;
export type PreferenceMode = (typeof PREFERENCE_MODES)[number];

export const reportProfileSchema = z
  .object({
    client_ref: z
      .string()
      .regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/, "pseudonyme attendu (jamais un nom ni un email)"),
    collected_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    taxonomy_min_pct: z.number().gt(0).max(100).nullable(),
    sfdr_min_pct: z.number().gt(0).max(100).nullable(),
    pai_required: z.boolean(),
    pai_categories: z.array(z.enum(PAI_CATEGORIES)),
    preference_mode: z.enum(PREFERENCE_MODES).default("detailed"),
    predefined_label: z.string().nullable().default(null),
    predefined_description: z.string().nullable().default(null),
    joint_account: z.boolean().default(false),
    /** Ancien modèle (adaptation portée par le profil) : conservé pour relire les rapports antérieurs. */
    adapted: z.boolean().default(false),
    adaptation_note: z.string().nullable().default(null),
  })
  .refine((p) => !p.adapted || (p.adaptation_note ?? "").trim().length > 0, {
    message: "une adaptation des préférences doit être documentée",
    path: ["adaptation_note"],
  })
  .refine(
    (p) =>
      p.preference_mode !== "neutral" ||
      (p.taxonomy_min_pct === null && p.sfdr_min_pct === null && !p.pai_required),
    { message: "un client « neutre » n'a pas de critère de durabilité", path: ["preference_mode"] },
  )
  .refine(
    (p) =>
      p.preference_mode !== "predefined" ||
      ((p.predefined_label ?? "").trim() !== "" && (p.predefined_description ?? "").trim() !== ""),
    {
      message: "un profil prédéfini doit être nommé et décrit au client",
      path: ["predefined_label"],
    },
  );
export type ReportProfile = z.infer<typeof reportProfileSchema>;

export const reportFundSchema = z.object({
  isin: z.string().regex(/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/),
  /** Montant de la ligne (évaluation par portefeuille). */
  amount: z.number().positive().finite().optional(),
  data: fundDataSchema.nullable(),
  document: z
    .object({
      doc_date: z.string().nullable(),
      language: z.enum(["fr", "en"]).nullable(),
      source_url: z.string().nullable(),
      sha256: z.string().regex(/^[0-9a-f]{64}$/),
    })
    .nullable(),
  extraction: z
    .object({
      model: z.string(),
      version: z.string(),
      status: z.enum(["auto", "needs_review", "validated"]),
      validated_at: z.string().nullable(),
    })
    .nullable(),
});
export type ReportFund = z.infer<typeof reportFundSchema>;

export const reportInputSchema = z.object({
  report_id: z.string().uuid(),
  /** Horodatage ISO 8601 (UTC) de génération. */
  created_at: z.string().datetime(),
  cabinet: z.object({
    name: z.string().min(1).max(200),
    orias_number: z.string().regex(/^[0-9]{8}$/),
  }),
  profile: reportProfileSchema,
  funds: z.array(reportFundSchema).min(1).max(200),
  /**
   * Adaptation des préférences pour CE conseil (art. 54 §10 du règlement
   * délégué 2017/565 ; ESMA35-43-3172 §82-83) : proposition faite, décision
   * du client, préférences adaptées, motifs. Le profil recueilli n'est pas
   * modifié.
   */
  adaptation: z
    .object({
      proposal: z.string().trim().min(1).max(4000),
      decision: z.enum(["accepted", "refused"]),
      adapted: clientPreferencesSchema.nullable(),
      reasons: z.string().trim().min(1).max(4000),
    })
    .refine((a) => (a.decision === "accepted") === (a.adapted !== null), {
      message: "des préférences adaptées sont requises si, et seulement si, le client accepte",
      path: ["adapted"],
    })
    .optional(),
  /** Rapport de démonstration : bandeau « EXEMPLE » sur chaque page. */
  example: z.boolean().default(false),
});
export type ReportInput = z.infer<typeof reportInputSchema>;

export type EvaluationMode = "instrument" | "portfolio";

export interface ComputedReport {
  input: ReportInput;
  /** Par fonds : chaque ligne confrontée isolément aux préférences retenues. */
  evaluation: EvaluationMode;
  /** Préférences recueillies (profil). */
  initial_preferences: ClientPreferences;
  /** Préférences appliquées à la recommandation (adaptées si le client l'a accepté). */
  effective_preferences: ClientPreferences;
  /** « none » : le client a refusé d'adapter ses préférences, aucun conseil n'est délivré. */
  recommendation: "issued" | "none";
  results: MatchResult[];
  /** Évaluation globale, en mode portefeuille. */
  portfolio: PortfolioResult | null;
  /** Évaluation avec les préférences initiales, lorsqu'une adaptation a été proposée. */
  initial_results: MatchResult[] | null;
  initial_portfolio: PortfolioResult | null;
  engine_version: string;
  extraction_versions: string[];
  /** Date de référence (Europe/Paris) servant au calcul de l'ancienneté. */
  as_of: string;
  /** Date et heure lisibles, Europe/Paris. */
  created_at_label: string;
  data_snapshot_hash: string;
  content_hash: string;
}

/** JSON canonique : clés triées récursivement, `undefined` omis. */
export function canonicalJson(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v))
    return `[${v.map((x) => (x === undefined ? "null" : canonicalJson(x))).join(",")}]`;
  const o = v as Record<string, unknown>;
  return `{${Object.keys(o)
    .filter((k) => o[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${canonicalJson(o[k])}`)
    .join(",")}}`;
}

export async function sha256Hex(data: string | Uint8Array): Promise<string> {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  const buf = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const PARIS = "Europe/Paris";

export function parisDate(iso: string): string {
  // en-CA formate en AAAA-MM-JJ.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: PARIS,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

export function parisDateTimeLabel(iso: string): string {
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat("fr-FR", {
    timeZone: PARIS,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
  const time = new Intl.DateTimeFormat("fr-FR", {
    timeZone: PARIS,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(d);
  return `${date} à ${time} (heure de Paris)`;
}

export class ReportInputError extends Error {}

function evaluate(
  prefs: ClientPreferences,
  input: ReportInput,
  mode: EvaluationMode,
  asOf: string,
): { results: MatchResult[]; portfolio: PortfolioResult | null } {
  const results = input.funds.map((f) => match(prefs, f.data, { asOf, isin: f.isin }));
  const portfolio =
    mode === "portfolio"
      ? matchPortfolio(
          prefs,
          input.funds.map((f) => ({ isin: f.isin, amount: f.amount!, fund: f.data })),
          { asOf },
        )
      : null;
  return { results, portfolio };
}

export async function computeReport(raw: unknown): Promise<ComputedReport> {
  const input = reportInputSchema.parse(raw);
  const as_of = parisDate(input.created_at);
  const withAmount = input.funds.filter((f) => f.amount !== undefined).length;
  if (withAmount > 0 && withAmount < input.funds.length) {
    throw new ReportInputError("Montants à renseigner pour toutes les lignes, ou pour aucune.");
  }
  const evaluation: EvaluationMode = withAmount > 0 ? "portfolio" : "instrument";
  const initial_preferences = clientPreferencesSchema.parse({
    taxonomy_min_pct: input.profile.taxonomy_min_pct,
    sfdr_min_pct: input.profile.sfdr_min_pct,
    pai_required: input.profile.pai_required,
    pai_categories: input.profile.pai_categories,
  });
  const initial = evaluate(initial_preferences, input, evaluation, as_of);

  const adaptation = input.adaptation;
  if (adaptation) {
    if (input.profile.preference_mode === "neutral") {
      throw new ReportInputError("Un client « neutre » n'a pas de préférence à adapter.");
    }
    // ACPR/AMF : on ne propose d'adapter qu'après avoir constaté qu'aucune
    // option ne correspond aux préférences exprimées.
    const somethingMatches =
      evaluation === "portfolio"
        ? initial.portfolio!.verdict === "ADEQUAT"
        : initial.results.some((r) => r.verdict === "ADEQUAT");
    if (somethingMatches) {
      throw new ReportInputError(
        evaluation === "portfolio"
          ? "Adaptation non justifiée : le portefeuille proposé correspond aux préférences recueillies."
          : "Adaptation non justifiée : au moins un fonds proposé correspond aux préférences recueillies.",
      );
    }
  }
  const effective_preferences =
    adaptation?.decision === "accepted" ? adaptation.adapted! : initial_preferences;
  const effective =
    adaptation?.decision === "accepted"
      ? evaluate(effective_preferences, input, evaluation, as_of)
      : initial;
  const recommendation = adaptation?.decision === "refused" ? "none" : "issued";

  const data_snapshot_hash = await sha256Hex(canonicalJson(input.funds));
  const content_hash = await sha256Hex(
    canonicalJson({
      report_id: input.report_id,
      created_at: input.created_at,
      cabinet: input.cabinet,
      profile: input.profile,
      adaptation: input.adaptation ?? null,
      evaluation,
      recommendation,
      results: effective.results,
      portfolio: effective.portfolio,
      engine_version: ENGINE_VERSION,
      data_snapshot_hash,
    }),
  );
  return {
    input,
    evaluation,
    initial_preferences,
    effective_preferences,
    recommendation,
    results: effective.results,
    portfolio: effective.portfolio,
    initial_results: adaptation ? initial.results : null,
    initial_portfolio: adaptation ? initial.portfolio : null,
    engine_version: ENGINE_VERSION,
    extraction_versions: [
      ...new Set(input.funds.flatMap((f) => (f.extraction ? [f.extraction.version] : []))),
    ].sort(),
    as_of,
    created_at_label: parisDateTimeLabel(input.created_at),
    data_snapshot_hash,
    content_hash,
  };
}
