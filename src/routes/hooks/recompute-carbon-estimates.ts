import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { computeAndPersistFundCarbonEstimate } from "@/lib/esg/carbon-estimate.server";

/**
 * POST /hooks/recompute-carbon-estimates
 *
 * Auth: Authorization: Bearer <CRON_SECRET>
 *
 * Recalcule `carbon_estimates` (repli holdings→émetteur) pour chaque fonds actif
 * ayant une composition connue (`fund_holdings`). Ne touche jamais
 * `assets.carbon_intensity_gco2e_per_eur` — le repli est appliqué en lecture par
 * `lib/portfolio/universe.server.ts`, jamais en écrasant la donnée publiée par
 * le fonds. Un fonds sans holdings n'est pas un échec (cf. computeFundCarbonEstimate).
 */
export const Route = createFileRoute("/hooks/recompute-carbon-estimates")({
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

        // `fund_holdings` n'est pas encore dans les types Supabase auto-générés
        // (régénérés après migration) : cast localisé, comme recompute-ingestion-plan.ts.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const admin = supabaseAdmin as any;
        const { data: fundIds, error: fErr } = await admin
          .from("fund_holdings")
          .select("asset_id")
          .limit(100_000);
        if (fErr) {
          return json({ error: `fund_holdings: ${fErr.message}` }, 500);
        }
        const targets = [
          ...new Set((fundIds ?? []).map((r: { asset_id: string }) => r.asset_id)),
        ] as string[];

        let computed = 0;
        let skipped = 0;
        let failed = 0;
        const errors: Array<{ assetId: string; error: string }> = [];

        for (const assetId of targets) {
          try {
            const result = await computeAndPersistFundCarbonEstimate(supabaseAdmin, assetId);
            if (result) computed++;
            else skipped++;
          } catch (e) {
            failed++;
            const msg = e instanceof Error ? e.message : String(e);
            console.error(`[recompute-carbon-estimates] ${assetId}`, msg);
            errors.push({ assetId, error: msg });
          }
        }

        const durationMs = Date.now() - startedAt;
        const status = failed === 0 ? "ok" : computed === 0 ? "error" : "partial";

        try {
          await supabaseAdmin.from("cron_run_log").insert({
            job_name: "recompute-carbon-estimates",
            status,
            message: `${computed} fonds recalculé(s), ${skipped} sans holdings, ${failed} en échec`,
            assets_ok: computed,
            assets_failed: failed,
            duration_ms: durationMs,
            details: { errors },
          });
        } catch (logErr) {
          console.error("[recompute-carbon-estimates] cron_run_log insert failed:", logErr);
        }

        return json({ computed, skipped, failed, duration_ms: durationMs, errors });
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
