import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { httpDownload } from "@/lib/data-engine/download.server";
import { supabaseHoldingWriter } from "@/lib/data-engine/holdings.supabase";
import {
  ingestHoldingsForAssets,
  type HoldingsIngestAsset,
  type ResolvedHoldingsSource,
} from "@/lib/data-engine/holdings-ingest";

/**
 * POST /hooks/ingest-holdings
 *
 * Auth: Authorization: Bearer <CRON_SECRET>
 *
 * Ingère la composition officielle (`fund_holdings`) des fonds actifs, depuis
 * les fichiers de holdings publiés par les sociétés de gestion (iShares/BlackRock,
 * Amundi, Vanguard…). Chaîne : résolution d'URL → httpDownload → parsing CSV →
 * contrôle qualité → persistance datée et sourcée (voir lib/data-engine/holdings-ingest).
 *
 * Résolution d'URL — PAS de devinette (§9 : ne jamais inventer). Les URL des
 * fichiers officiels sont fournies explicitement via le secret `HOLDINGS_SOURCES`
 * (JSON `{ "<ISIN|assetId>": "<url csv officielle>" }`), curées et vérifiées.
 * Un fonds absent de cette table → statut `no_source`, rien n'est écrit.
 *
 * NB : ces domaines (ishares.com, amundietf.fr, vanguard…) doivent être autorisés
 * par la politique d'egress de l'environnement d'exécution. Dans l'environnement
 * d'audit ils sont bloqués (403) — ce hook est donc opérationnel uniquement là où
 * l'accès sortant vers les sociétés de gestion est ouvert.
 */
export const Route = createFileRoute("/hooks/ingest-holdings")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const startedAt = Date.now();

        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.replace(/^Bearer\s+/i, "").trim();
        const expected = process.env.CRON_SECRET;
        if (!expected) return json({ error: "CRON_SECRET not configured" }, 500);
        if (!token || token !== expected) return json({ error: "Unauthorized" }, 401);

        // Table d'URL officielles curées (ISIN ou assetId → url). Aucune URL devinée.
        let sources: Record<string, string> = {};
        try {
          sources = JSON.parse(process.env.HOLDINGS_SOURCES ?? "{}") as Record<string, string>;
        } catch {
          return json({ error: "HOLDINGS_SOURCES is not valid JSON" }, 500);
        }
        if (Object.keys(sources).length === 0) {
          return json(
            {
              note: "HOLDINGS_SOURCES vide — aucune URL officielle curée fournie, rien à ingérer.",
            },
            200,
          );
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const admin = supabaseAdmin as any;
        const { data: assetRows, error: aErr } = await admin
          .from("assets")
          .select("id, ticker, name, isin, issuer")
          .eq("is_active", true);
        if (aErr) return json({ error: `assets: ${aErr.message}` }, 500);

        const assets: HoldingsIngestAsset[] = (assetRows ?? []).map(
          (a: {
            id: string;
            ticker: string;
            name: string;
            isin: string | null;
            issuer: string | null;
          }) => ({
            id: a.id,
            ticker: a.ticker,
            name: a.name,
            isin: a.isin,
            issuer: a.issuer,
          }),
        );

        const resolveUrl = (asset: HoldingsIngestAsset): ResolvedHoldingsSource | null => {
          const url = (asset.isin && sources[asset.isin]) || sources[asset.id];
          if (!url) return null;
          return { url, sourceId: null }; // source_url fait foi ; source_id liable ultérieurement
        };

        const { results, summary } = await ingestHoldingsForAssets(assets, {
          resolveUrl,
          download: async (url: string) => {
            const raw = await httpDownload("ishares_factsheet", url, {
              kind: "csv",
              maxBytes: 5_000_000,
            });
            if (!raw) throw new Error(`download failed or blocked: ${url}`);
            return raw.content;
          },
          writer: supabaseHoldingWriter(supabaseAdmin),
        });

        const durationMs = Date.now() - startedAt;
        const status =
          summary.ingested > 0 ? (summary.fetch_failed > 0 ? "partial" : "ok") : "error";

        try {
          await admin.from("cron_run_log").insert({
            job_name: "ingest-holdings",
            status,
            message: `${summary.ingested} fonds ingéré(s), ${summary.holdingsInserted} holdings, ${summary.no_source} sans source, ${summary.fetch_failed} en échec`,
            assets_ok: summary.ingested,
            assets_failed: summary.fetch_failed + summary.rejected,
            duration_ms: durationMs,
            details: {
              summary,
              rejected: results.filter((r) => r.status === "rejected").map((r) => r.assetId),
            },
          });
        } catch (logErr) {
          console.error("[ingest-holdings] cron_run_log insert failed:", logErr);
        }

        return json({ summary, duration_ms: durationMs });
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
