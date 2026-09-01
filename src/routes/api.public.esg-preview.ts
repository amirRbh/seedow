import { createFileRoute } from "@tanstack/react-router";
import { loadObservatory } from "@/lib/esg/v2/observatory.functions";

/**
 * Aperçu public — le « quick win » pré-inscription : chercher un fonds et voir
 * ce qu'il publie, en moins de dix secondes, sans compte.
 *
 * ── Ce que cet endpoint a cessé de servir ─────────────────────────────────
 *
 * Il exposait le score de durabilité 0–100, ses piliers et les « raisons de
 * greenwashing » de la v1. C'était la même affirmation que l'Observatoire, sur
 * la surface la plus visible du produit, sans même l'écran qui explique d'où
 * elle sort. Le score est supprimé (grille STI 2.0) ; l'endpoint sert désormais
 * exactement ce que servent l'Observatoire et les fiches — même assemblage,
 * même déduplication, même règle d'abstention. Un fonds ne peut donc plus
 * afficher un chiffre sur la landing et un autre sur sa fiche.
 *
 * Peu volatil (une publication documentaire bouge au trimestre, pas à la
 * seconde) : caché agressivement en edge Cloudflare via s-maxage.
 */
export const Route = createFileRoute("/api/public/esg-preview")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { funds, stats } = await loadObservatory();
          return new Response(JSON.stringify({ funds, stats }), {
            headers: {
              "Content-Type": "application/json",
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
