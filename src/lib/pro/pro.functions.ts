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
  clientProfileRowSchema,
  currentDataRowSchema,
  toPreferences,
  toReportFunds,
  toReportProfile,
  type ClientProfileRow,
} from "./app/data";
import { MAX_ISINS_PER_REPORT, isValidIsin } from "./app/isin";
import { match } from "./matching/engine";
import type { MatchResult, Verdict } from "./matching/types";

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

export const createClientProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => clientProfileInputSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const db = untyped(context.supabase);
    const cabinet = (await myCabinet(db)) ?? fail("Créez d'abord votre cabinet");
    const { data: row, error } = await db
      .from("pro_client_profiles")
      .insert({
        ...data,
        adaptation_note: data.adapted ? data.adaptation_note : null,
        cabinet_id: cabinet.id,
      })
      .select("id")
      .single();
    if (error) fail(error.message);
    return { id: uuid.parse(row.id) };
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

const reportRequestSchema = z.object({ profile_id: uuid, isins: isinList });
type ReportRequest = z.infer<typeof reportRequestSchema>;

export interface ReportPreview {
  results: MatchResult[];
  /** ISIN demandés sans aucune donnée en base. */
  missing: string[];
}

export const previewReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: ReportRequest) => reportRequestSchema.parse(input))
  .handler(async ({ data, context }): Promise<ReportPreview> => {
    const db = untyped(context.supabase);
    const profile = await profileById(db, data.profile_id);
    const funds = toReportFunds(data.isins, await currentRows(db, data.isins));
    const asOf = new Date().toISOString().slice(0, 10);
    const results = funds.map((f) => match(toPreferences(profile), f.data, { asOf, isin: f.isin }));
    return { results, missing: funds.filter((f) => f.data === null).map((f) => f.isin) };
  });

export const generateReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: ReportRequest) => reportRequestSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ id: string; pdf_sha256: string }> => {
    const db = untyped(context.supabase);
    const cabinet = (await myCabinet(db)) ?? fail("Créez d'abord votre cabinet");
    // Relu avec le client de l'utilisateur : la RLS prouve que le profil est au cabinet.
    const profile = await profileById(db, data.profile_id);
    if (profile.cabinet_id !== cabinet.id) fail("Profil client introuvable");
    const funds = toReportFunds(data.isins, await currentRows(db, data.isins));

    const [
      { computeReport, sha256Hex },
      { renderReportPdf },
      { bundledReportFonts },
      { supabaseAdmin },
    ] = await Promise.all([
      import("./report/model"),
      import("./report/pdf"),
      import("./report/fonts.server"),
      import("@/integrations/supabase/client.server"),
    ]);

    const report = await computeReport({
      report_id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      cabinet: { name: cabinet.name, orias_number: cabinet.orias_number },
      profile: toReportProfile(profile),
      funds,
    });
    const pdf = await renderReportPdf(report, bundledReportFonts());
    const pdf_sha256 = await sha256Hex(pdf);
    const id = report.input.report_id;
    const pdf_path = `${cabinet.id}/${id}.pdf`;

    const admin = untyped(supabaseAdmin);
    const up = await admin.storage
      .from("pro-reports")
      .upload(pdf_path, pdf, { contentType: "application/pdf", upsert: false });
    if (up.error) fail(`Archivage du PDF impossible : ${up.error.message}`);

    const ins = await admin.from("pro_reports").insert({
      id,
      cabinet_id: cabinet.id,
      client_profile_id: profile.id,
      profile_snapshot: report.input.profile,
      results: {
        matches: report.results,
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
    if (ins.error) {
      // Rapport non archivé : on ne laisse pas de PDF orphelin.
      await admin.storage.from("pro-reports").remove([pdf_path]);
      fail(`Archivage du rapport impossible : ${ins.error.message}`);
    }
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
