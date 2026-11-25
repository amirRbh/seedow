/**
 * Client Supabase « service role » des scripts Pro (ingestion, revue, scan).
 * Les tables `pro_*` ne figurent pas encore dans les types auto-générés
 * (`src/integrations/supabase/types.ts`, régénéré par Lovable Cloud, jamais à
 * la main) : client non typé, chaque lecture est validée par zod à l'appel.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function serviceClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis (variables d'environnement, jamais dans le repo).",
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const ANNEX_BUCKET = "pro-annexes";
export const REPORT_BUCKET = "pro-reports";
