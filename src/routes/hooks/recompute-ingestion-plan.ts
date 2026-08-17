import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { computeFundCompleteness } from "@/lib/data-engine/completeness";
import { toCanonicalIsin } from "@/lib/data-engine/isin";
import {
  planIngestion,
  summarizePlan,
  type IngestionCandidate,
} from "@/lib/data-engine/ingestion-plan";

/**
 * POST /hooks/recompute-ingestion-plan
 *
 * Auth : Authorization: Bearer <CRON_SECRET>
 *
 * Branchement cron de la Phase B (Blueprint moat) : recalcule périodiquement la
 * FILE d'ingestion priorisée (demande réelle `fund_requests` + fraîcheur §12 +
 * complétude) et journalise le backlog daté dans `cron_run_log`. On PLANIFIE le
 * travail — on ne fabrique aucune donnée et on ne télécharge aucun document ici
 * (l'ingestion réelle des factsheets exige des downloaders réseau dédiés, cf.
 * connecteurs Phase A avec `fetch` injecté).
 *
 * La même file est visible en temps réel côté admin (`/admin/data`) ; ce hook en
 * garde une trace historique pour piloter l'effort dans le temps.
 *
 * Active aussi automatiquement (`is_active = true`) les fonds auto-créés par
 * l'ingestion GECO (`ensureAsset`, is_active=false par défaut — non revus
 * éditorialement) dès que leur complétude (`completeness.ts`) atteint
 * AUTO_ACTIVATION_THRESHOLD : assez de champs réels pour être présentable, sans
 * exiger une revue humaine par fonds (§1.3 — jamais avant que la donnée existe).
 */
const AUTO_ACTIVATION_THRESHOLD = 50; // moitié du score 0-100 (identité + au moins un autre pilier réel)
export const Route = createFileRoute("/hooks/recompute-ingestion-plan")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const startedAt = Date.now();
        const token = (request.headers.get("authorization") ?? "")
          .replace(/^Bearer\s+/i, "")
          .trim();
        const expected = process.env.CRON_SECRET;
        if (!expected) return json({ error: "CRON_SECRET not configured" }, 500);
        if (!token || token !== expected) return json({ error: "Unauthorized" }, 401);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const admin = supabaseAdmin as any;
        const [assetsRes, holdingsRes, requestsRes] = await Promise.all([
          admin
            .from("assets")
            .select(
              "id, ticker, isin, name, issuer, region, currency, ter, esg_score, esg_score_source, esg_data_asof, sfdr_article, waci_tco2e_per_musd_sales, carbon_intensity_gco2e_per_eur, is_active",
            )
            .limit(2000),
          admin.from("fund_holdings").select("asset_id, as_of").limit(100000),
          admin.from("fund_requests").select("isin").limit(100000),
        ]);

        if (assetsRes.error) return json({ error: `assets: ${assetsRes.error.message}` }, 500);

        interface Row {
          id: string;
          isin: string | null;
          name: string | null;
          issuer: string | null;
          region: string | null;
          currency: string | null;
          ter: number | null;
          esg_score: number | null;
          esg_score_source: string | null;
          esg_data_asof: string | null;
          sfdr_article: number | null;
          waci_tco2e_per_musd_sales: number | null;
          carbon_intensity_gco2e_per_eur: number | null;
          is_active: boolean;
        }
        const assets = (assetsRes.data ?? []) as Row[];

        const holdingsByAsset = new Map<string, { count: number; latest: string | null }>();
        for (const h of (holdingsRes.data ?? []) as { asset_id: string; as_of: string | null }[]) {
          const cur = holdingsByAsset.get(h.asset_id) ?? { count: 0, latest: null };
          cur.count += 1;
          if (h.as_of && (!cur.latest || h.as_of > cur.latest)) cur.latest = h.as_of;
          holdingsByAsset.set(h.asset_id, cur);
        }

        const demandByIsin = new Map<string, number>();
        for (const r of (requestsRes.data ?? []) as { isin: string | null }[]) {
          const isin = toCanonicalIsin(r.isin);
          if (isin) demandByIsin.set(isin, (demandByIsin.get(isin) ?? 0) + 1);
        }

        const candidates: IngestionCandidate[] = [];
        const toActivate: string[] = [];

        for (const a of assets) {
          const h = holdingsByAsset.get(a.id) ?? { count: 0, latest: null };
          const hasRealEsg = a.esg_score_source != null && (a.esg_score ?? 0) > 0;
          const completeness = computeFundCompleteness({
            hasIsin: !!a.isin,
            hasName: !!a.name,
            hasIssuer: !!a.issuer,
            hasDomicile: !!a.region,
            hasCurrency: !!a.currency,
            hasTer: a.ter != null,
            holdingsCount: h.count,
            holdingsAsOf: h.latest,
            hasSfdrArticle: a.sfdr_article != null,
            hasKidOrProspectus: false,
            hasEsgScore: hasRealEsg,
            hasCarbon:
              a.waci_tco2e_per_musd_sales != null || a.carbon_intensity_gco2e_per_eur != null,
            hasControversyData: false,
          }).score;

          candidates.push({
            assetId: a.id,
            isin: a.isin,
            demandCount: a.isin ? (demandByIsin.get(toCanonicalIsin(a.isin) ?? "") ?? 0) : 0,
            completeness,
            lastUpdated: a.esg_data_asof,
            hasSource: a.esg_score_source != null,
          });

          if (!a.is_active && completeness >= AUTO_ACTIVATION_THRESHOLD) toActivate.push(a.id);
        }

        if (toActivate.length) {
          const { error: actErr } = await admin
            .from("assets")
            .update({ is_active: true })
            .in("id", toActivate);
          if (actErr)
            console.error("[recompute-ingestion-plan] activation failed:", actErr.message);
        }

        const plan = planIngestion(candidates).filter((it) => it.priority > 0);
        const summary = summarizePlan(plan);
        const durationMs = Date.now() - startedAt;

        try {
          await admin.from("cron_run_log").insert({
            job_name: "recompute-ingestion-plan",
            status: "ok",
            message: `${summary.total} fonds à ingérer en priorité, ${toActivate.length} activés`,
            assets_ok: summary.total,
            assets_failed: 0,
            duration_ms: durationMs,
            details: {
              byReason: summary.byReason,
              activated: toActivate.length,
              top: plan.slice(0, 20).map((it) => ({
                assetId: it.assetId,
                isin: it.isin,
                priority: Math.round(it.priority),
                reasons: it.reasons,
              })),
            },
          });
        } catch (logErr) {
          console.error("[recompute-ingestion-plan] cron_run_log insert failed:", logErr);
        }

        return json({
          ok: true,
          planned: summary.total,
          activated: toActivate.length,
          byReason: summary.byReason,
          durationMs,
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
