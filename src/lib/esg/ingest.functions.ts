import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Ingestion gouvernée de données ESG/carbone issues des divulgations émetteurs
 * (fiches produit iShares/BlackRock — données MSCI ESG, Sustainalytics, etc.).
 *
 * Remplace les migrations one-off : un admin entre des valeurs VÉRIFIÉES avec
 * leur PROVENANCE OBLIGATOIRE (source + date « as of »). Le contrat de
 * transparence Seedow est imposé par le schéma — impossible d'écrire un score
 * sans dire d'où il vient ni de quand il date (cf. audit ESG §1.2/§1.4).
 *
 * Réservé aux admins (has_role). N'écrit que les champs fournis (partial update),
 * par ticker.
 */

const IngestRowSchema = z.object({
  ticker: z.string().min(1).max(12),
  /** Score ESG global 0-100 (ex. MSCI ESG Quality Score ×10). */
  esg_score: z.number().min(0).max(100).optional(),
  /** Score de qualité ESG MSCI pour fonds, 0-10. */
  msci_esg_quality_score: z.number().min(0).max(10).optional(),
  /** WACI tCO₂e/M$ de CA (indicateur PAI SFDR). */
  waci_tco2e_per_musd_sales: z.number().min(0).optional(),
  /** Bande d'Implied Temperature Rise (ex. ">2.5-3.0°C"). */
  implied_temp_rise: z.string().max(40).optional(),
  /** Article SFDR (6/8/9) si applicable. */
  sfdr_article: z.number().int().min(6).max(9).optional(),
  /** Provenance OBLIGATOIRE (ex. "MSCI ESG Fund Ratings (iShares fact sheet)"). */
  esg_score_source: z.string().min(3).max(120),
  /** Date « as of » OBLIGATOIRE (ISO YYYY-MM-DD). */
  esg_data_asof: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date attendue au format YYYY-MM-DD"),
});

const IngestSchema = z.object({ rows: z.array(IngestRowSchema).min(1).max(100) });

export type IngestRow = z.infer<typeof IngestRowSchema>;

/** Construit l'objet d'update partiel pour une ligne (champs fournis uniquement). */
export function buildAssetUpdate(row: IngestRow): Record<string, unknown> {
  const update: Record<string, unknown> = {
    esg_score_source: row.esg_score_source,
    esg_data_asof: row.esg_data_asof,
  };
  if (row.esg_score != null) update.esg_score = row.esg_score;
  if (row.msci_esg_quality_score != null)
    update.msci_esg_quality_score = row.msci_esg_quality_score;
  if (row.implied_temp_rise != null) update.implied_temp_rise = row.implied_temp_rise;
  if (row.sfdr_article != null) update.sfdr_article = row.sfdr_article;
  if (row.waci_tco2e_per_musd_sales != null) {
    update.waci_tco2e_per_musd_sales = row.waci_tco2e_per_musd_sales;
    // Le carbone hérite de la même provenance/date que l'ingestion.
    update.carbon_intensity_source = row.esg_score_source;
    update.carbon_intensity_updated_at = `${row.esg_data_asof}T00:00:00Z`;
  }
  return update;
}

export const ingestIssuerEsgData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => IngestSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    const client = admin as typeof supabaseAdmin;

    let updated = 0;
    const notFound: string[] = [];
    for (const row of data.rows) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: rows, error } = await (client.from("assets") as any)
        .update(buildAssetUpdate(row))
        .eq("ticker", row.ticker)
        .select("id");
      if (error) {
        console.error(`[ingestIssuerEsgData] ${row.ticker} failed:`, error.message);
        continue;
      }
      if (!rows || rows.length === 0) notFound.push(row.ticker);
      else updated += rows.length;
    }

    return { updated, not_found: notFound, received: data.rows.length };
  });
