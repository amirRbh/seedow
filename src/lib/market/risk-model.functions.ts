import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Déclenche un recalcul manuel du modèle de risque (rendement attendu,
 * volatilité, covariance) à partir de l'historique réel des cours.
 * Même schéma que triggerMarketRefresh : appelle le hook interne avec le
 * CRON_SECRET côté serveur. Réservé aux utilisateurs authentifiés.
 */
export const triggerRiskModelRecompute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
      throw new Error("CRON_SECRET non configuré côté serveur.");
    }

    const baseUrl =
      process.env.PUBLIC_APP_URL ??
      process.env.SUPABASE_URL?.replace(/^https?:\/\/[^/]+/, "https://seedow.life") ??
      "https://seedow.life";

    const res = await fetch(`${baseUrl}/hooks/recompute-risk-model`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[triggerRiskModelRecompute] HTTP ${res.status}`, text);
      throw new Error("Recalcul du modèle de risque indisponible. Réessaie plus tard.");
    }

    const data = (await res.json()) as {
      assets_updated: number;
      pairs_updated: number;
      skipped: string[];
      duration_ms: number;
    };
    return data;
  });
