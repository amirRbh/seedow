import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { buildRiskModel, type PricePoint } from "@/lib/market/risk-model";

const HISTORY_WINDOW_DAYS = 730; // ~2 ans de cours quotidiens

/**
 * POST /hooks/recompute-risk-model
 *
 * Auth: Authorization: Bearer <CRON_SECRET>
 *
 * Recalcule `assets.expected_return`, `assets.volatility` et la matrice
 * `asset_covariance` à partir de l'historique réel des cours (`asset_prices`,
 * alimenté par /hooks/refresh-market-data). Un actif dont l'historique est
 * trop court pour être fiable est laissé tel quel en base (voir buildRiskModel).
 */
export const Route = createFileRoute("/hooks/recompute-risk-model")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const startedAt = Date.now();

        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.replace(/^Bearer\s+/i, "").trim();
        const expected = process.env.CRON_SECRET;
        if (!expected) {
          return json({ error: "CRON_SECRET not configured" }, 500);
        }
        if (!token || token !== expected) {
          return json({ error: "Unauthorized" }, 401);
        }

        const { data: assets, error: aErr } = await supabaseAdmin
          .from("assets")
          .select("id, ticker")
          .eq("is_active", true);
        if (aErr) {
          return json({ error: `assets: ${aErr.message}` }, 500);
        }

        const targets = assets ?? [];
        const cutoff = new Date(Date.now() - HISTORY_WINDOW_DAYS * 86_400_000)
          .toISOString()
          .slice(0, 10);

        const pricesByAsset = new Map<string, PricePoint[]>();
        for (const a of targets) {
          const { data: rows, error: pErr } = await supabaseAdmin
            .from("asset_prices")
            .select("price_date, close")
            .eq("asset_id", a.id)
            .gte("price_date", cutoff)
            .order("price_date", { ascending: true });
          if (pErr) {
            console.error(`[recompute-risk-model] ${a.ticker} price fetch failed:`, pErr.message);
            continue;
          }
          pricesByAsset.set(
            a.id,
            (rows ?? []).map((r) => ({ date: r.price_date as string, close: Number(r.close) })),
          );
        }

        const { stats, covariance, skipped, diagnostics } = buildRiskModel(pricesByAsset);

        let assetsUpdated = 0;
        for (const [id, s] of stats) {
          const { error: uErr } = await supabaseAdmin
            .from("assets")
            .update({ expected_return: s.expectedReturn, volatility: s.volatility })
            .eq("id", id);
          if (uErr) {
            console.error(`[recompute-risk-model] update assets.${id} failed:`, uErr.message);
            continue;
          }
          assetsUpdated++;
        }

        const covRows = Array.from(covariance.entries()).map(([key, value]) => {
          const [asset_a, asset_b] = key.split("|");
          return { asset_a, asset_b, covariance: value };
        });

        let pairsUpdated = 0;
        const CHUNK = 500;
        for (let i = 0; i < covRows.length; i += CHUNK) {
          const slice = covRows.slice(i, i + CHUNK);
          const { error: cErr } = await supabaseAdmin
            .from("asset_covariance")
            .upsert(slice, { onConflict: "asset_a,asset_b" });
          if (cErr) {
            console.error("[recompute-risk-model] covariance upsert failed:", cErr.message);
            continue;
          }
          pairsUpdated += slice.length;
        }

        const durationMs = Date.now() - startedAt;
        const status = stats.size === 0 ? "error" : skipped.length > 0 ? "partial" : "ok";

        try {
          await supabaseAdmin.from("cron_run_log").insert({
            job_name: "recompute-risk-model",
            status,
            message:
              `${assetsUpdated} actif(s) recalculé(s), ${pairsUpdated} paire(s) de covariance` +
              (skipped.length > 0 ? `, ${skipped.length} ignoré(s) (historique insuffisant)` : ""),
            assets_ok: assetsUpdated,
            assets_failed: skipped.length,
            duration_ms: durationMs,
            details: { skipped, history_window_days: HISTORY_WINDOW_DAYS, ...diagnostics },
          });
        } catch (logErr) {
          console.error("[recompute-risk-model] cron_run_log insert failed:", logErr);
        }

        return json({
          assets_updated: assetsUpdated,
          pairs_updated: pairsUpdated,
          skipped,
          duration_ms: durationMs,
        });
      },
    },
  },
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
