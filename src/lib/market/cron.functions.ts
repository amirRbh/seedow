import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export interface CronRunEntry {
  id: string;
  job_name: string;
  status: "ok" | "error" | "partial";
  message: string | null;
  assets_ok: number;
  assets_failed: number;
  duration_ms: number | null;
  ran_at: string;
}

/**
 * Lit les dernières exécutions du cron de rafraîchissement des prix.
 * Accès limité aux utilisateurs authentifiés ; la lecture passe par le
 * client admin côté serveur car la table cron_run_log n'est pas exposée
 * via RLS aux utilisateurs (logs internes).
 */
export const getRecentCronRuns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { data, error } = await supabaseAdmin
      .from("cron_run_log")
      .select("id, job_name, status, message, assets_ok, assets_failed, duration_ms, ran_at")
      .eq("job_name", "refresh-market-data")
      .order("ran_at", { ascending: false })
      .limit(5);
    if (error) throw new Error(error.message);
    return { runs: (data ?? []) as CronRunEntry[] };
  });

/**
 * Même chose pour le job de recalcul du modèle de risque
 * (rendement attendu / volatilité / covariance).
 */
export const getRecentRiskModelRuns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { data, error } = await supabaseAdmin
      .from("cron_run_log")
      .select("id, job_name, status, message, assets_ok, assets_failed, duration_ms, ran_at")
      .eq("job_name", "recompute-risk-model")
      .order("ran_at", { ascending: false })
      .limit(5);
    if (error) throw new Error(error.message);
    return { runs: (data ?? []) as CronRunEntry[] };
  });
