import { createFileRoute } from "@tanstack/react-router";
import { mapPublicFundRow, PUBLIC_FUND_COLUMNS, type PublicFundRow } from "@/lib/esg/public-fund";

/**
 * Aperçu ESG public — le "quick win" pré-inscription : chercher un fonds et voir
 * son score ESG + risque greenwashing en <10 s, sans compte. Données agrégées
 * publiques uniquement (aucune donnée utilisateur, pas de cours ni volumes).
 *
 * Peu volatil (les scores ESG bougent à la semaine, pas à la seconde) donc
 * caché agressivement en edge Cloudflare via s-maxage : une seule requête DB
 * par heure et par PoP, pas une par visiteur.
 */

export type { PublicFundAsset as EsgPreviewAsset } from "@/lib/esg/public-fund";

export const Route = createFileRoute("/api/public/esg-preview")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data, error } = await supabaseAdmin
            .from("assets")
            .select(PUBLIC_FUND_COLUMNS)
            .eq("is_active", true)
            .order("esg_score", { ascending: false })
            .limit(500);
          if (error) throw new Error(error.message);

          const items = (data ?? []).map((r) => mapPublicFundRow(r as unknown as PublicFundRow));

          return new Response(JSON.stringify({ assets: items }), {
            headers: {
              "Content-Type": "application/json",
              // max-age court navigateur, s-maxage long edge : les scores ESG
              // publics ne justifient pas un hit DB par session.
              "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
            },
          });
        } catch (e) {
          console.error("[esg-preview]", e);
          return new Response(JSON.stringify({ error: "unavailable" }), {
            status: 503,
            headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
          });
        }
      },
    },
  },
});
