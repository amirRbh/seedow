import { createFileRoute } from "@tanstack/react-router";

/**
 * Sitemap public (Phase C — Autorité) : liste les pages statiques + une entrée
 * par fonds actif réellement en base (`/fonds/$isin`). Généré à la demande,
 * caché en edge — jamais de liste figée qui dérive du contenu réel.
 */
const STATIC_PATHS = ["/", "/comprendre", "/methodologie", "/observatoire", "/cours", "/tarifs"];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const base = "https://seedow.life";
        let isins: string[] = [];
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data } = await supabaseAdmin
            .from("assets")
            .select("isin")
            .eq("is_active", true)
            .not("isin", "is", null)
            .limit(2000);
          isins = (data ?? []).map((r) => r.isin as string).filter(Boolean);
        } catch (e) {
          console.error("[sitemap]", e);
        }

        const urls = [
          ...STATIC_PATHS.map((p) => `${base}${p}`),
          ...isins.map((isin) => `${base}/fonds/${encodeURIComponent(isin)}`),
        ];
        const body =
          `<?xml version="1.0" encoding="UTF-8"?>\n` +
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
          urls.map((u) => `  <url><loc>${u}</loc></url>`).join("\n") +
          `\n</urlset>\n`;

        return new Response(body, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
          },
        });
      },
    },
  },
});
