import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
 */
export const getRecentCronRuns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("cron_run_log")
      .select("id, job_name, status, message, assets_ok, assets_failed, duration_ms, ran_at")
      .eq("job_name", "refresh-market-data")
      .order("ran_at", { ascending: false })
      .limit(5);
    if (error) throw new Error(error.message);
    return { runs: (data ?? []) as CronRunEntry[] };
  });
