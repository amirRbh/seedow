import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { fetchYahooChart } from "@/lib/market/yahoo.server";

/**
 * POST /hooks/refresh-market-data
 *
 * Auth: Authorization: Bearer <CRON_SECRET>
 *
 * Body (optional):
 *   {
 *     "range":      "2y" | "5d" | "1d" | ...   // history depth, default "5d"
 *     "interval":   "1d" | "1wk" | "1mo"        // default "1d"
 *     "seed":       boolean                     // shorthand for range="2y"
 *     "symbols":    string[]                    // optional subset of yahoo symbols
 *   }
 */
export const Route = createFileRoute("/hooks/refresh-market-data")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // ── Auth ──────────────────────────────────────────────
        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.replace(/^Bearer\s+/i, "").trim();
        const expected = process.env.CRON_SECRET;
        if (!expected) {
          return json({ error: "CRON_SECRET not configured" }, 500);
        }
        if (!token || token !== expected) {
          return json({ error: "Unauthorized" }, 401);
        }

        // ── Body ──────────────────────────────────────────────
        let body: {
          range?: string;
          interval?: string;
          seed?: boolean;
          symbols?: string[];
        } = {};
        try {
          const text = await request.text();
          if (text) body = JSON.parse(text);
        } catch {
          // ignore — empty/invalid body is fine
        }
        const range = body.seed ? "2y" : body.range ?? "5d";
        const interval = body.interval ?? "1d";
        const symbolFilter = body.symbols?.length
          ? new Set(body.symbols)
          : null;

        // ── Load assets with a yahoo_symbol ──────────────────
        const { data: assets, error: aErr } = await supabaseAdmin
          .from("assets")
          .select("id, ticker, yahoo_symbol")
          .eq("is_active", true)
          .not("yahoo_symbol", "is", null);

        if (aErr) {
          return json({ error: `assets: ${aErr.message}` }, 500);
        }

        const targets = (assets ?? []).filter(
          (a): a is { id: string; ticker: string; yahoo_symbol: string } =>
            !!a.yahoo_symbol &&
            (!symbolFilter || symbolFilter.has(a.yahoo_symbol)),
        );

        // ── Fetch + upsert ───────────────────────────────────
        const results: Array<{
          ticker: string;
          symbol: string;
          ok: boolean;
          bars?: number;
          price?: number;
          error?: string;
        }> = [];

        for (const a of targets) {
          try {
            const { quote, bars } = await fetchYahooChart(
              a.yahoo_symbol,
              range,
              interval,
            );

            // Upsert quote
            const { error: qErr } = await supabaseAdmin
              .from("asset_quotes")
              .upsert({
                asset_id: a.id,
                price: quote.price,
                previous_close: quote.previousClose,
                change_pct: quote.changePct,
                currency: quote.currency,
                market_state: quote.marketState,
                source: "yahoo",
                fetched_at: new Date().toISOString(),
              });
            if (qErr) throw new Error(`quote upsert: ${qErr.message}`);

            // Upsert price history (chunked to stay under payload limits)
            if (bars.length > 0) {
              const rows = bars.map((b) => ({
                asset_id: a.id,
                price_date: b.date,
                close: b.close,
                currency: quote.currency,
                source: "yahoo",
              }));
              const CHUNK = 200;
              for (let i = 0; i < rows.length; i += CHUNK) {
                const slice = rows.slice(i, i + CHUNK);
                const { error: pErr } = await supabaseAdmin
                  .from("asset_prices")
                  .upsert(slice, { onConflict: "asset_id,price_date" });
                if (pErr) throw new Error(`prices upsert: ${pErr.message}`);
              }
            }

            results.push({
              ticker: a.ticker,
              symbol: a.yahoo_symbol,
              ok: true,
              bars: bars.length,
              price: quote.price,
            });
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            console.error(
              `[refresh-market-data] ${a.ticker} (${a.yahoo_symbol})`,
              msg,
            );
            results.push({
              ticker: a.ticker,
              symbol: a.yahoo_symbol,
              ok: false,
              error: msg,
            });
          }

          // small pause to be polite with Yahoo
          await new Promise((r) => setTimeout(r, 150));
        }

        const ok = results.filter((r) => r.ok).length;
        const failed = results.length - ok;
        const durationMs = Date.now() - startedAt;
        const status = failed === 0 ? "ok" : ok === 0 ? "error" : "partial";

        // Journalise l'exécution (best-effort, n'échoue jamais la requête)
        try {
          await supabaseAdmin.from("cron_run_log").insert({
            job_name: "refresh-market-data",
            status,
            message:
              status === "ok"
                ? `${ok} actif(s) rafraîchi(s)`
                : `${ok} ok, ${failed} en échec`,
            assets_ok: ok,
            assets_failed: failed,
            duration_ms: durationMs,
            details: { range, interval },
          });
        } catch (logErr) {
          console.error("[refresh-market-data] cron_run_log insert failed:", logErr);
        }

        return json({
          ok,
          failed,
          range,
          interval,
          duration_ms: durationMs,
          results,
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
