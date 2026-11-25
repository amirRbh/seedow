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
import { clientPreferencesSchema, fundDataSchema, type MatchResult } from "../matching/types";

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
    adapted: z.boolean(),
    adaptation_note: z.string().nullable(),
  })
  .refine((p) => !p.adapted || (p.adaptation_note ?? "").trim().length > 0, {
    message: "une adaptation des préférences doit être documentée",
    path: ["adaptation_note"],
  });
export type ReportProfile = z.infer<typeof reportProfileSchema>;

export const reportFundSchema = z.object({
  isin: z.string().regex(/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/),
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
  /** Rapport de démonstration : bandeau « EXEMPLE » sur chaque page. */
  example: z.boolean().default(false),
});
export type ReportInput = z.infer<typeof reportInputSchema>;

export interface ComputedReport {
  input: ReportInput;
  results: MatchResult[];
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

export async function computeReport(raw: unknown): Promise<ComputedReport> {
  const input = reportInputSchema.parse(raw);
  const as_of = parisDate(input.created_at);
  const preferences = clientPreferencesSchema.parse({
    taxonomy_min_pct: input.profile.taxonomy_min_pct,
    sfdr_min_pct: input.profile.sfdr_min_pct,
    pai_required: input.profile.pai_required,
    pai_categories: input.profile.pai_categories,
  });
  const results = input.funds.map((f) => match(preferences, f.data, { asOf: as_of, isin: f.isin }));
  const data_snapshot_hash = await sha256Hex(canonicalJson(input.funds));
  const content_hash = await sha256Hex(
    canonicalJson({
      report_id: input.report_id,
      created_at: input.created_at,
      cabinet: input.cabinet,
      profile: input.profile,
      results,
      engine_version: ENGINE_VERSION,
      data_snapshot_hash,
    }),
  );
  return {
    input,
    results,
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
