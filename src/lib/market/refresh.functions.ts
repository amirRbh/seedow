import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Déclenche un rafraîchissement manuel des prix de marché.
 * Appelle le hook interne /hooks/refresh-market-data avec le CRON_SECRET côté serveur.
 * Réservé aux utilisateurs authentifiés.
 */
export const triggerMarketRefresh = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
      throw new Error("CRON_SECRET non configuré côté serveur.");
    }

    // Construit l'URL absolue du hook depuis l'env du Worker
    const baseUrl =
      process.env.PUBLIC_APP_URL ??
      process.env.SUPABASE_URL?.replace(/^https?:\/\/[^/]+/, "https://seedow.life") ??
      "https://seedow.life";

    const res = await fetch(`${baseUrl}/hooks/refresh-market-data`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ range: "5d", interval: "1d" }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[triggerMarketRefresh] HTTP ${res.status}`, text);
      throw new Error("Rafraîchissement des prix indisponible. Réessaie plus tard.");
    }

    const data = (await res.json()) as {
      ok: number;
      failed: number;
      results: Array<{ ticker: string; ok: boolean; price?: number; error?: string }>;
    };
    return data;
  });
