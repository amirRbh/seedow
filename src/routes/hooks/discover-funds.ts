import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { httpDownload } from "@/lib/data-engine/download.server";
import { parseISharesProductCsv } from "@/lib/data-engine/discovery";
import { ensureDiscoveredAssets } from "@/lib/data-engine/discovery.supabase";

/**
 * POST /hooks/discover-funds
 *
 * Auth : Authorization: Bearer <CRON_SECRET>
 *
 * DÉCOUVERTE de fonds (chaînon manquant de l'expansion d'univers). Télécharge
 * l'export « product screener » officiel iShares (CSV), en extrait l'identité des
 * fonds, et CRÉE en base ceux qui manquent — en `is_active=false`. Ils n'entrent
 * dans l'univers investissable qu'après enrichissement (ishares_factsheet, prix
 * Yahoo) et validation de complétude par recompute-ingestion-plan. Rien n'est
 * inventé : seuls les champs d'identité réellement présents dans l'export sont
 * écrits, et un fonds à la classe non mappable est ignoré, pas deviné.
 *
 * L'URL de l'export est paramétrée (ISHARES_PRODUCTS_CSV_URL) et non codée en dur
 * (elle est régionale). Sans elle, le hook no-op proprement.
 */
/**
 * URL par défaut : export « product screener » officiel BlackRock France (CSV).
 * Publique, non sensible. Surchargeable via ISHARES_PRODUCTS_CSV_URL (autre
 * région/gamme) sans redéploiement de code.
 */
const DEFAULT_ISHARES_PRODUCTS_CSV_URL =
  "https://www.blackrock.com/fr/particuliers/product-screener/product-screener-v3.1.jsn?type=csv&siteEntryPassthrough=true&dcrPath=/templatedata/config/product-screener-v3/data/fr/France/product-screener-excel-config&disclosureContentDcrPath=";

export const Route = createFileRoute("/hooks/discover-funds")({
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

        // URL par défaut BlackRock France, surchargeable par variable d'env.
        const url = process.env.ISHARES_PRODUCTS_CSV_URL ?? DEFAULT_ISHARES_PRODUCTS_CSV_URL;

        const raw = await httpDownload("ishares_products", url, { kind: "csv", maxBytes: 20_000_000 });
        if (!raw) {
          await logRun("error", "Téléchargement de l'export iShares indisponible", 0, 0);
          return json({ error: "download failed (source indisponible)" }, 502);
        }

        const discovered = parseISharesProductCsv(raw);
        let result = { created: 0, enriched: 0, skippedExisting: 0, createdTickers: [] as string[] };
        try {
          result = await ensureDiscoveredAssets(supabaseAdmin, discovered);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          await logRun("error", `Insertion échouée : ${msg}`, 0, 0);
          return json({ error: msg }, 500);
        }

        const durationMs = Date.now() - startedAt;
        await logRun(
          "ok",
          `${discovered.length} fonds lus, ${result.created} créés (inactifs), ${result.enriched} enrichis ESG, ${result.skippedExisting} déjà connus`,
          result.created + result.enriched,
          discovered.length - result.created,
          { createdTickers: result.createdTickers.slice(0, 50), enriched: result.enriched },
        );

        return json({
          ok: true,
          configured: true,
          parsed: discovered.length,
          created: result.created,
          enriched: result.enriched,
          skipped_existing: result.skippedExisting,
          duration_ms: durationMs,
        });
      },
    },
  },
});

async function logRun(
  status: string,
  message: string,
  ok: number,
  failed: number,
  details: Record<string, unknown> = {},
) {
  try {
    await supabaseAdmin.from("cron_run_log").insert({
      job_name: "discover-funds",
      status,
      message,
      assets_ok: ok,
      assets_failed: failed,
      details,
    });
  } catch (e) {
    console.error("[discover-funds] cron_run_log insert failed:", e);
  }
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
