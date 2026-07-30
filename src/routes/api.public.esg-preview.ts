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
  isin: string | null;
  asset_class: string;
  esg: number; // 0..10
  climate: number;
  social: number;
  governance: number;
  ter: number; // fraction (0.002 = 0,20 %)
  carbon_intensity: number | null; // gCO2e/€
  implied_temp_rise: string | null;
  sfdr_article: number | null;
  coverage: "complete" | "partial" | "estimated";
  greenwashing_risk: "low" | "medium" | "high";
  greenwashing_reasons: string[];
  /** Secteurs formellement exclus par le fonds (tags stables). */
  excluded_sectors: string[];
  /** Thèmes d'impact réellement financés (exposition déclarée), triés desc. */
  themes: { tag: string; pct: number }[];
  /** Fournisseur du score ESG + date de la donnée — pour l'attribution à l'écran. */
  source: string | null;
  data_asof: string | null;
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
              "ticker, name, issuer, isin, asset_class, esg_score, env_score, social_score, governance_score, ter, carbon_intensity_gco2e_per_eur, implied_temp_rise, sfdr_article, excluded_sectors, cause_exposure, esg_score_source, esg_data_asof",
            )
            .eq("is_active", true)
            .order("esg_score", { ascending: false })
            .limit(500);
          if (error) throw new Error(error.message);

          const items: EsgPreviewAsset[] = (data ?? []).map((r) => {
            const esg = Number(r.esg_score);
            const causeExposure = (r.cause_exposure ?? {}) as Record<string, number>;
            const claimThemes = Object.entries(causeExposure)
              .filter(([, v]) => Number(v) > 0.15)
              .map(([k]) => k);
            // Thèmes réellement financés, exposés à l'UI : pondération déclarée
            // (jamais inventée), seuil 8 % pour ne montrer que le significatif.
            const themesOut = Object.entries(causeExposure)
              .map(([tag, v]) => ({ tag, pct: Math.round(Number(v) * 100) }))
              .filter((th) => th.pct >= 8)
              .sort((a, b) => b.pct - a.pct)
              .slice(0, 4);
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
              claimsGreenTheme: claimThemes.some((th) => GREEN_CAUSE_TAGS.has(th)),
            };
            const gw = assessGreenwashingRisk(input);
            return {
              ticker: r.ticker,
              name: r.name,
              issuer: r.issuer,
              isin: r.isin,
              asset_class: r.asset_class,
              esg: Math.round(esg) / 10,
              climate: Math.round(Number(r.env_score ?? esg)) / 10,
              social: Math.round(Number(r.social_score ?? esg)) / 10,
              governance: Math.round(Number(r.governance_score ?? esg)) / 10,
              ter: Number(r.ter),
              carbon_intensity: r.carbon_intensity_gco2e_per_eur,
              implied_temp_rise: r.implied_temp_rise,
              sfdr_article: r.sfdr_article,
              coverage: computeDataCoverage(input),
              greenwashing_risk: gw.risk,
              greenwashing_reasons: gw.reasons,
              excluded_sectors: r.excluded_sectors ?? [],
              themes: themesOut,
              source: r.esg_score_source,
              data_asof: r.esg_data_asof,
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
