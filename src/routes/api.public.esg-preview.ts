import { createFileRoute } from "@tanstack/react-router";
import {
  assessGreenwashingRisk,
  computeDataCoverage,
  GREEN_CAUSE_TAGS,
  type TransparencyInput,
} from "@/lib/esg/transparency";

/**
 * Aperçu ESG public — le "quick win" pré-inscription : chercher un fonds et voir
 * son score ESG + risque greenwashing en <10 s, sans compte. Données agrégées
 * publiques uniquement (aucune donnée utilisateur, pas de cours ni volumes).
 *
 * Peu volatil (les scores ESG bougent à la semaine, pas à la seconde) donc
 * caché agressivement en edge Cloudflare via s-maxage : une seule requête DB
 * par heure et par PoP, pas une par visiteur.
 */

export interface EsgPreviewAsset {
  ticker: string;
  name: string;
  issuer: string | null;
  esg: number; // 0..10
  climate: number;
  social: number;
  governance: number;
  sfdr_article: number | null;
  coverage: "complete" | "partial" | "estimated";
  greenwashing_risk: "low" | "medium" | "high";
  greenwashing_reasons: string[];
}

export const Route = createFileRoute("/api/public/esg-preview")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data, error } = await supabaseAdmin
            .from("assets")
            .select(
              "ticker, name, issuer, esg_score, env_score, social_score, governance_score, carbon_intensity_gco2e_per_eur, sfdr_article, excluded_sectors, cause_exposure",
            )
            .eq("is_active", true)
            .order("esg_score", { ascending: false })
            .limit(200);
          if (error) throw new Error(error.message);

          const items: EsgPreviewAsset[] = (data ?? []).map((r) => {
            const esg = Number(r.esg_score);
            const causeExposure = (r.cause_exposure ?? {}) as Record<string, number>;
            const themes = Object.entries(causeExposure)
              .filter(([, v]) => Number(v) > 0.15)
              .map(([k]) => k);
            const input: TransparencyInput = {
              // Le cours n'est pas exposé publiquement : neutre pour la couverture.
              hasPrice: true,
              hasPillarScores:
                r.env_score != null && r.social_score != null && r.governance_score != null,
              hasCarbonData: r.carbon_intensity_gco2e_per_eur != null,
              sfdrArticle: r.sfdr_article,
              overallEsgScore: esg / 10,
              climateScore: Number(r.env_score ?? esg) / 10,
              exclusionsCount: (r.excluded_sectors ?? []).length,
              claimsGreenTheme: themes.some((th) => GREEN_CAUSE_TAGS.has(th)),
            };
            const gw = assessGreenwashingRisk(input);
            return {
              ticker: r.ticker,
              name: r.name,
              issuer: r.issuer,
              esg: Math.round(esg) / 10,
              climate: Math.round(Number(r.env_score ?? esg)) / 10,
              social: Math.round(Number(r.social_score ?? esg)) / 10,
              governance: Math.round(Number(r.governance_score ?? esg)) / 10,
              sfdr_article: r.sfdr_article,
              coverage: computeDataCoverage(input),
              greenwashing_risk: gw.risk,
              greenwashing_reasons: gw.reasons,
            };
          });

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
