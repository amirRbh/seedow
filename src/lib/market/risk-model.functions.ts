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
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Anti-abus : ce recalcul recompose la matrice de covariance de tout
    // l'univers — plus coûteux que le rafraîchissement de prix.
    // 2 recalculs manuels / 15 min / user.
    const { data: allowed, error: rlErr } = await supabaseAdmin.rpc(
      "check_and_increment_rate_limit",
      { p_key: `risk_recompute:${context.userId}`, p_limit: 2, p_window_seconds: 900 },
    );
    if (!rlErr && allowed === false) {
      throw new Error("Trop de recalculs. Réessaie dans quelques minutes.");
    }

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
