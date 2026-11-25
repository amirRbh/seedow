/**
 * Fonctions serveur de Seedow Pro. Toutes authentifiées (`requireSupabaseAuth`),
 * toutes les entrées validées par zod.
 *
 * Lectures et écritures « cabinet » avec le client de l'utilisateur : c'est la
 * RLS qui garantit qu'un cabinet ne touche qu'à ses profils et rapports.
 * Seule la génération de rapport écrit en service role (`pro_reports` n'a
 * aucune policy d'écriture : un cabinet ne peut pas fabriquer un « résultat »),
 * après avoir relu le profil avec le client de l'utilisateur (preuve
 * d'appartenance par la RLS).
 *
 * Les tables `pro_*` n'étant pas encore dans les types générés, le client est
 * manipulé sans typage et chaque ligne relue passe par zod.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  clientProfileInputSchema,
  predefinedProfileInputSchema,
  predefinedProfileRowSchema,
  type PredefinedProfileRow,
  clientProfileRowSchema,
  currentDataRowSchema,
  toPreferences,
  toReportFunds,
  toReportProfile,
  type ClientProfileRow,
} from "./app/data";
import { MAX_ISINS_PER_REPORT, isValidIsin } from "./app/isin";
import { match } from "./matching/engine";
import { matchPortfolio, type PortfolioResult } from "./matching/portfolio";
import { clientPreferencesSchema, type MatchResult, type Verdict } from "./matching/types";

const untyped = (c: unknown) => c as SupabaseClient;
const uuid = z.string().uuid();
const isinList = z
  .array(z.string().refine(isValidIsin, "ISIN invalide"))
  .min(1, "Au moins un ISIN")
  .max(MAX_ISINS_PER_REPORT);

const cabinetSchema = z.object({
  id: uuid,
  name: z.string(),
  orias_number: z.string(),
  created_at: z.string(),
});
export type Cabinet = z.infer<typeof cabinetSchema>;

function fail(message: string): never {
  throw new Error(message);
}

async function myCabinet(db: SupabaseClient): Promise<Cabinet | null> {
  const { data, error } = await db
    .from("pro_cabinets")
    .select("id, name, orias_number, created_at")
    .maybeSingle();
  if (error) fail(error.message);
  return data ? cabinetSchema.parse(data) : null;
}

async function profileById(db: SupabaseClient, id: string): Promise<ClientProfileRow> {
  const { data, error } = await db
    .from("pro_client_profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) fail(error.message);
  if (!data) fail("Profil client introuvable");
  return clientProfileRowSchema.parse(data);
}

async function currentRows(db: SupabaseClient, isins: readonly string[]) {
  const { data, error } = await db
    .from("pro_fund_current_data")
    .select("*")
    .in("isin", [...isins]);
  if (error) fail(error.message);
  return z.array(currentDataRowSchema).parse(data ?? []);
}

// ---------------------------------------------------------------------------
// Cabinet et profils
// ---------------------------------------------------------------------------

export interface ProContext {
  cabinet: Cabinet | null;
  profiles: ClientProfileRow[];
}

export const getProContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ProContext> => {
    const db = untyped(context.supabase);
    const cabinet = await myCabinet(db);
    if (!cabinet) return { cabinet: null, profiles: [] };
    const { data, error } = await db
      .from("pro_client_profiles")
      .select("*")
      .eq("cabinet_id", cabinet.id)
      .order("created_at", { ascending: false });
    if (error) fail(error.message);
    return { cabinet, profiles: z.array(clientProfileRowSchema).parse(data ?? []) };
  });

export const createCabinet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { name: string; orias_number: string }) =>
    z
      .object({
        name: z.string().trim().min(1, "Nom requis").max(200),
        orias_number: z
          .string()
          .trim()
          .regex(/^[0-9]{8}$/, "Le numéro ORIAS compte 8 chiffres"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<Cabinet> => {
    const db = untyped(context.supabase);
    const { data: row, error } = await db
      .from("pro_cabinets")
      .insert({ ...data, owner_user_id: context.userId })
      .select("id, name, orias_number, created_at")
      .single();
    if (error) fail(error.message);
    return cabinetSchema.parse(row);
  });

/** Archive un PDF et sa ligne immuable ; en cas d'échec de la ligne, retire le PDF. */
async function archivePdf(
  table: "pro_reports" | "pro_collection_records",
  pdf_path: string,
  pdf: Uint8Array,
  row: Record<string, unknown>,
): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = untyped(supabaseAdmin);
  const up = await admin.storage
    .from("pro-reports")
    .upload(pdf_path, pdf, { contentType: "application/pdf", upsert: false });
  if (up.error) fail(`Archivage du PDF impossible : ${up.error.message}`);
  const ins = await admin.from(table).insert(row);
  if (ins.error) {
    await admin.storage.from("pro-reports").remove([pdf_path]);
    fail(`Archivage impossible : ${ins.error.message}`);
  }
}

export const createClientProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => clientProfileInputSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ id: string; record_id: string }> => {
    const db = untyped(context.supabase);
    const cabinet = (await myCabinet(db)) ?? fail("Créez d'abord votre cabinet");
    const base = {
      cabinet_id: cabinet.id,
      client_ref: data.client_ref,
      collected_at: data.collected_at,
      joint_account: data.joint_account,
      preference_mode: data.preference_mode,
    };
    let row: Record<string, unknown>;
    if (data.preference_mode === "neutral") {
      row = {
        ...base,
        taxonomy_min_pct: null,
        sfdr_min_pct: null,
        pai_required: false,
        pai_categories: [],
      };
    } else if (data.preference_mode === "detailed") {
      row = {
        ...base,
        taxonomy_min_pct: data.taxonomy_min_pct,
        sfdr_min_pct: data.sfdr_min_pct,
        pai_required: data.pai_required,
        pai_categories: data.pai_categories,
      };
    } else {
      // Relu sous RLS : le profil prédéfini appartient au cabinet et n'est pas archivé.
      const { data: pre, error } = await db
        .from("pro_predefined_profiles")
        .select("*")
        .eq("id", data.predefined_profile_id)
        .is("archived_at", null)
        .maybeSingle();
      if (error) fail(error.message);
      if (!pre) fail("Profil prédéfini introuvable ou archivé");
      const p = predefinedProfileRowSchema.parse(pre);
      row = {
        ...base,
        predefined_profile_id: p.id,
        predefined_label: p.label,
        predefined_description: p.description,
        taxonomy_min_pct: p.taxonomy_min_pct,
        sfdr_min_pct: p.sfdr_min_pct,
        pai_required: p.pai_required,
        pai_categories: p.pai_categories,
      };
    }
    const { data: inserted, error } = await db
      .from("pro_client_profiles")
      .insert(row)
      .select("*")
      .single();
    if (error) fail(error.message);
    const profile = clientProfileRowSchema.parse(inserted);

    // Fiche de recueil archivée (support durable des explications et des choix).
    const [{ renderCollectionPdf }, { bundledReportFonts }, { sha256Hex }] = await Promise.all([
      import("./report/collection-pdf"),
      import("./report/fonts.server"),
      import("./report/model"),
    ]);
    const snapshot = {
      record_id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      cabinet: { name: cabinet.name, orias_number: cabinet.orias_number },
      profile: toReportProfile(profile),
    };
    const pdf = await renderCollectionPdf(snapshot, bundledReportFonts());
    const pdf_path = `${cabinet.id}/collection/${snapshot.record_id}.pdf`;
    await archivePdf("pro_collection_records", pdf_path, pdf, {
      id: snapshot.record_id,
      cabinet_id: cabinet.id,
      client_profile_id: profile.id,
      snapshot,
      pdf_path,
      pdf_sha256: await sha256Hex(pdf),
      created_at: snapshot.created_at,
    });
    return { id: profile.id, record_id: snapshot.record_id };
  });

export const listPredefinedProfiles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PredefinedProfileRow[]> => {
    const db = untyped(context.supabase);
    const { data, error } = await db
      .from("pro_predefined_profiles")
      .select("*")
      .is("archived_at", null)
      .order("created_at");
    if (error) fail(error.message);
    return z.array(predefinedProfileRowSchema).parse(data ?? []);
  });

export const createPredefinedProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => predefinedProfileInputSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const db = untyped(context.supabase);
    const cabinet = (await myCabinet(db)) ?? fail("Créez d'abord votre cabinet");
    const { data: row, error } = await db
      .from("pro_predefined_profiles")
      .insert({ ...data, cabinet_id: cabinet.id })
      .select("id")
      .single();
    if (error) fail(error.message);
    return { id: uuid.parse(row.id) };
  });

export const archivePredefinedProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { id: string }) => z.object({ id: uuid }).parse(input))
  .handler(async ({ data, context }): Promise<void> => {
    const db = untyped(context.supabase);
    const { error } = await db
      .from("pro_predefined_profiles")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) fail(error.message);
  });

export interface CollectionRecordItem {
  id: string;
  client_profile_id: string;
  created_at: string;
  pdf_sha256: string;
}

export const listCollectionRecords = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CollectionRecordItem[]> => {
    const db = untyped(context.supabase);
    const { data, error } = await db
      .from("pro_collection_records")
      .select("id, client_profile_id, created_at, pdf_sha256")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) fail(error.message);
    return z
      .array(
        z.object({
          id: uuid,
          client_profile_id: uuid,
          created_at: z.string(),
          pdf_sha256: z.string(),
        }),
      )
      .parse(data ?? []);
  });

// ---------------------------------------------------------------------------
// Fonds
// ---------------------------------------------------------------------------

export interface FundSearchRow {
  isin: string;
  name: string;
  management_company: string | null;
  sfdr_article: number | null;
  status: "auto" | "needs_review" | "validated" | null;
  doc_date: string | null;
  min_sustainable_pct: number | null;
  min_taxonomy_pct: number | null;
  considers_pai: boolean | null;
}

/** Échappe les jokers LIKE d'une saisie utilisateur. */
export function likePattern(q: string): string {
  return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

export const searchFunds = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { q: string }) => z.object({ q: z.string().trim().max(100) }).parse(input))
  .handler(async ({ data, context }): Promise<FundSearchRow[]> => {
    const db = untyped(context.supabase);
    const fundRow = z.object({
      isin: z.string(),
      name: z.string(),
      management_company: z.string().nullable(),
      sfdr_article: z.number().nullable(),
    });
    const select = "isin, name, management_company, sfdr_article";
    let funds: z.infer<typeof fundRow>[];
    if (data.q === "") {
      const r = await db
        .from("pro_funds")
        .select(select)
        .order("updated_at", { ascending: false })
        .limit(50);
      if (r.error) fail(r.error.message);
      funds = z.array(fundRow).parse(r.data ?? []);
    } else {
      const pattern = likePattern(data.q);
      const [byIsin, byName] = await Promise.all([
        db.from("pro_funds").select(select).ilike("isin", pattern.toUpperCase()).limit(50),
        db.from("pro_funds").select(select).ilike("name", pattern).limit(50),
      ]);
      if (byIsin.error) fail(byIsin.error.message);
      if (byName.error) fail(byName.error.message);
      const merged = new Map<string, z.infer<typeof fundRow>>();
      for (const f of z.array(fundRow).parse([...(byIsin.data ?? []), ...(byName.data ?? [])])) {
        merged.set(f.isin, f);
      }
      funds = [...merged.values()].slice(0, 50);
    }
    const rows = funds.length
      ? await currentRows(
          db,
          funds.map((f) => f.isin),
        )
      : [];
    const current = new Map(rows.map((r) => [r.isin, r]));
    return funds.map((f) => {
      const c = current.get(f.isin);
      return {
        ...f,
        status: c?.status ?? null,
        doc_date: c?.doc_date ?? null,
        min_sustainable_pct: c?.min_sustainable_pct ?? null,
        min_taxonomy_pct: c?.min_taxonomy_pct ?? null,
        considers_pai: c?.considers_pai ?? null,
      };
    });
  });

export interface AnnexUpload {
  name: string;
  state: "en_attente" | "traite" | "echec";
  created_at: string | null;
}

/** Dépôts de l'utilisateur dans `pro-annexes` (inbox, traités, en échec). */
export const listMyAnnexUploads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AnnexUpload[]> => {
    const db = untyped(context.supabase);
    const out: AnnexUpload[] = [];
    const folders: [string, AnnexUpload["state"]][] = [
      ["inbox", "en_attente"],
      ["processed", "traite"],
      ["failed", "echec"],
    ];
    for (const [folder, state] of folders) {
      const { data, error } = await db.storage
        .from("pro-annexes")
        .list(`${folder}/${context.userId}`, {
          limit: 100,
          sortBy: { column: "created_at", order: "desc" },
        });
      if (error) fail(error.message);
      for (const o of data ?? []) {
        if (o.name.toLowerCase().endsWith(".pdf"))
          out.push({ name: o.name, state, created_at: o.created_at ?? null });
      }
    }
    return out.sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
  });

// ---------------------------------------------------------------------------
// Rapports
// ---------------------------------------------------------------------------

const reportRequestSchema = z
  .object({
    profile_id: uuid,
    isins: isinList,
    /** Montants par ISIN (même ordre) : évaluation par portefeuille. */
    amounts: z.array(z.number().positive().finite()).optional(),
    adaptation: z
      .object({
        proposal: z.string().trim().min(1).max(4000),
        decision: z.enum(["accepted", "refused"]),
        adapted: clientPreferencesSchema.nullable(),
        reasons: z.string().trim().min(1).max(4000),
      })
      .optional(),
  })
  .refine((r) => !r.amounts || r.amounts.length === r.isins.length, {
    message: "Un montant par ISIN",
    path: ["amounts"],
  });
type ReportRequest = z.infer<typeof reportRequestSchema>;

export interface ReportPreview {
  results: MatchResult[];
  portfolio: PortfolioResult | null;
  /** ISIN demandés sans aucune donnée en base. */
  missing: string[];
  /** ACPR/AMF : une adaptation ne se propose que si rien ne correspond. */
  adaptation_allowed: boolean;
  preference_mode: "neutral" | "detailed" | "predefined";
}

async function loadRequest(db: SupabaseClient, data: ReportRequest) {
  const profile = await profileById(db, data.profile_id);
  const rows = await currentRows(db, data.isins);
  const funds = toReportFunds(data.isins, rows).map((f, i) =>
    data.amounts ? { ...f, amount: data.amounts[i] } : f,
  );
  return { profile, funds };
}

export const previewReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: ReportRequest) => reportRequestSchema.parse(input))
  .handler(async ({ data, context }): Promise<ReportPreview> => {
    const db = untyped(context.supabase);
    const { profile, funds } = await loadRequest(db, data);
    const asOf = new Date().toISOString().slice(0, 10);
    const prefs = toPreferences(profile);
    const results = funds.map((f) => match(prefs, f.data, { asOf, isin: f.isin }));
    const portfolio = data.amounts
      ? matchPortfolio(
          prefs,
          funds.map((f) => ({ isin: f.isin, amount: f.amount!, fund: f.data })),
          { asOf },
        )
      : null;
    const matches = portfolio
      ? portfolio.verdict === "ADEQUAT"
      : results.some((r) => r.verdict === "ADEQUAT");
    return {
      results,
      portfolio,
      missing: funds.filter((f) => f.data === null).map((f) => f.isin),
      adaptation_allowed: profile.preference_mode !== "neutral" && !matches,
      preference_mode: profile.preference_mode,
    };
  });

export const generateReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: ReportRequest) => reportRequestSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ id: string; pdf_sha256: string }> => {
    const db = untyped(context.supabase);
    const cabinet = (await myCabinet(db)) ?? fail("Créez d'abord votre cabinet");
    // Relu avec le client de l'utilisateur : la RLS prouve que le profil est au cabinet.
    const { profile, funds } = await loadRequest(db, data);
    if (profile.cabinet_id !== cabinet.id) fail("Profil client introuvable");

    const [
      { computeReport, sha256Hex, ReportInputError },
      { renderReportPdf },
      { bundledReportFonts },
    ] = await Promise.all([
      import("./report/model"),
      import("./report/pdf"),
      import("./report/fonts.server"),
    ]);

    let report;
    try {
      report = await computeReport({
        report_id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        cabinet: { name: cabinet.name, orias_number: cabinet.orias_number },
        profile: toReportProfile(profile),
        funds,
        adaptation: data.adaptation,
      });
    } catch (e) {
      if (e instanceof ReportInputError) fail(e.message);
      throw e;
    }
    const pdf = await renderReportPdf(report, bundledReportFonts());
    const pdf_sha256 = await sha256Hex(pdf);
    const id = report.input.report_id;
    const pdf_path = `${cabinet.id}/${id}.pdf`;
    await archivePdf("pro_reports", pdf_path, pdf, {
      id,
      cabinet_id: cabinet.id,
      client_profile_id: profile.id,
      profile_snapshot: { ...report.input.profile, adaptation: report.input.adaptation ?? null },
      results: {
        matches: report.results,
        portfolio: report.portfolio,
        evaluation: report.evaluation,
        recommendation: report.recommendation,
        initial_matches: report.initial_results,
        initial_portfolio: report.initial_portfolio,
        funds: report.input.funds,
        as_of: report.as_of,
        content_hash: report.content_hash,
        extraction_versions: report.extraction_versions,
      },
      engine_version: report.engine_version,
      data_snapshot_hash: report.data_snapshot_hash,
      pdf_path,
      pdf_sha256,
      created_at: report.input.created_at,
    });
    return { id, pdf_sha256 };
  });

export interface ReportListItem {
  id: string;
  created_at: string;
  client_ref: string;
  engine_version: string;
  pdf_sha256: string;
  data_snapshot_hash: string;
  counts: Partial<Record<Verdict, number>>;
  funds: number;
}

export const listReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ReportListItem[]> => {
    const db = untyped(context.supabase);
    const { data, error } = await db
      .from("pro_reports")
      .select(
        "id, created_at, profile_snapshot, results, engine_version, pdf_sha256, data_snapshot_hash",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) fail(error.message);
    const row = z.object({
      id: uuid,
      created_at: z.string(),
      profile_snapshot: z.object({ client_ref: z.string() }).passthrough(),
      results: z
        .object({ matches: z.array(z.object({ verdict: z.string() }).passthrough()) })
        .passthrough(),
      engine_version: z.string(),
      pdf_sha256: z.string(),
      data_snapshot_hash: z.string(),
    });
    return z
      .array(row)
      .parse(data ?? [])
      .map((r) => {
        const counts: Partial<Record<Verdict, number>> = {};
        for (const m of r.results.matches) {
          const v = m.verdict as Verdict;
          counts[v] = (counts[v] ?? 0) + 1;
        }
        return {
          id: r.id,
          created_at: r.created_at,
          client_ref: r.profile_snapshot.client_ref,
          engine_version: r.engine_version,
          pdf_sha256: r.pdf_sha256,
          data_snapshot_hash: r.data_snapshot_hash,
          counts,
          funds: r.results.matches.length,
        };
      });
  });

export const getReportDownloadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { id: string }) => z.object({ id: uuid }).parse(input))
  .handler(async ({ data, context }): Promise<{ url: string; pdf_sha256: string }> => {
    const db = untyped(context.supabase);
    const { data: row, error } = await db
      .from("pro_reports")
      .select("pdf_path, pdf_sha256")
      .eq("id", data.id)
      .maybeSingle();
    if (error) fail(error.message);
    if (!row) fail("Rapport introuvable");
    const r = z.object({ pdf_path: z.string(), pdf_sha256: z.string() }).parse(row);
    // Lien signé court, créé avec le client de l'utilisateur (RLS du bucket).
    const signed = await db.storage
      .from("pro-reports")
      .createSignedUrl(r.pdf_path, 60, { download: true });
    if (signed.error) fail(signed.error.message);
    return { url: signed.data.signedUrl, pdf_sha256: r.pdf_sha256 };
  });

export const getCollectionDownloadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { id: string }) => z.object({ id: uuid }).parse(input))
  .handler(async ({ data, context }): Promise<{ url: string; pdf_sha256: string }> => {
    const db = untyped(context.supabase);
    const { data: row, error } = await db
      .from("pro_collection_records")
      .select("pdf_path, pdf_sha256")
      .eq("id", data.id)
      .maybeSingle();
    if (error) fail(error.message);
    if (!row) fail("Fiche introuvable");
    const r = z.object({ pdf_path: z.string(), pdf_sha256: z.string() }).parse(row);
    const signed = await db.storage
      .from("pro-reports")
      .createSignedUrl(r.pdf_path, 60, { download: true });
    if (signed.error) fail(signed.error.message);
    return { url: signed.data.signedUrl, pdf_sha256: r.pdf_sha256 };
  });
