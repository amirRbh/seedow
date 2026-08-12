import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { normalizeFundRequest } from "./fund-request";

/**
 * Server functions de la mécanique « Demander l'analyse » (§27).
 *
 * `requestFundAnalysis` : un utilisateur authentifié enregistre une demande
 * pour un fonds absent de Seedow. La ligne porte sa requête + l'ISIN si valide,
 * pour piloter la couverture par l'usage réel. `listFundRequests` (admin) sert
 * le futur dashboard data-quality.
 *
 * Les tables Data Engine (`fund_requests`) n'étant dans les types Supabase
 * qu'après régénération post-migration, l'accès passe par `as any` localisé,
 * comme `lib/esg/ingest.functions.ts`.
 */

const RequestSchema = z.object({
  query: z.string().min(1).max(200),
  /** Optionnel : l'actif que la recherche a « presque » matché, si l'UI le sait. */
  matched_asset_id: z.string().uuid().optional(),
});

export const requestFundAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RequestSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context;
    const normalized = normalizeFundRequest(data.query);
    if (!normalized) return { recorded: false as const, reason: "requête trop courte" };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = supabase as any;
    const { error } = await client.from("fund_requests").insert({
      user_id: userId,
      query: normalized.query,
      isin: normalized.isin,
      matched_asset_id: data.matched_asset_id ?? null,
      status: "requested",
    });
    if (error) {
      console.error("[requestFundAnalysis] insert failed:", error.message);
      throw new Error("Impossible d'enregistrer la demande.");
    }
    return { recorded: true as const, isin: normalized.isin };
  });

const ListSchema = z.object({
  status: z.enum(["requested", "queued", "added", "rejected"]).optional(),
  limit: z.number().int().min(1).max(200).optional(),
});

export const listFundRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ListSchema.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = admin as any;
    let q = client
      .from("fund_requests")
      .select("id, query, isin, matched_asset_id, status, created_at")
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 100);
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error("Lecture des demandes impossible.");
    return { requests: rows ?? [] };
  });
