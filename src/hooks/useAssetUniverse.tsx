import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AssetClass, DiscoverAsset, ExclusionTag } from "@/lib/discover/types";
import { deriveDiscoverAssetTier } from "@/lib/discover/sustainability";
import {
  assessGreenwashingRisk,
  computeDataCoverage,
  GREEN_CAUSE_TAGS,
  type TransparencyInput,
} from "@/lib/esg/transparency";

const ASSET_CLASS_LABEL: Record<AssetClass, string> = {
  equity_dev: "Actions monde développé",
  equity_em: "Actions marchés émergents",
  thematic: "Thématique",
  green_bond: "Obligation verte",
  social_bond: "Obligation sociale",
  sov_bond: "Obligation d'État",
  corporate_bond: "Obligation d'entreprise",
  reit: "Immobilier (REIT)",
  commodity: "Matière première",
  cash: "Liquidités",
};

/** SRRI (1-7) approximé depuis la volatilité annualisée — méthodologie indicative, pas le calcul réglementaire exact. */
function riskLevelFromVolatility(vol: number): DiscoverAsset["risk_level"] {
  if (vol < 0.02) return 1;
  if (vol < 0.05) return 2;
  if (vol < 0.1) return 3;
  if (vol < 0.15) return 4;
  if (vol < 0.25) return 5;
  if (vol < 0.35) return 6;
  return 7;
}

interface State {
  assets: DiscoverAsset[];
  loading: boolean;
  error: string | null;
  /** Nombre d'actifs actifs sans aucun cours (ni live, ni historique) — 0 si tout est couvert. */
  missingPriceCount: number;
  refresh: () => void;
}

const ASSET_UNIVERSE_QUERY_KEY = ["asset-universe"] as const;

interface AssetUniverseResult {
  assets: DiscoverAsset[];
  missingPriceCount: number;
}

// Forme de ligne `assets` lue ici. `waci_tco2e_per_musd_sales` existe en DB
// (migration wave1) mais pas encore dans les types Supabase auto-générés
// (types.ts, non éditable à la main §1.6) : on lit la table via un cast local
// commenté et on retype la ligne ici, comme le reste du code accédant aux
// colonnes récentes. À retirer après régénération des types.
interface AssetRow {
  id: string;
  ticker: string;
  name: string;
  asset_class: AssetClass;
  region: string | null;
  currency: string | null;
  issuer: string | null;
  ter: number;
  esg_score: number;
  env_score: number | null;
  social_score: number | null;
  governance_score: number | null;
  carbon_intensity_gco2e_per_eur: number | null;
  waci_tco2e_per_musd_sales: number | null;
  sfdr_article: number | null;
  implied_temp_rise: string | null;
  volatility: number;
  cause_exposure: Record<string, number> | null;
  excluded_sectors: ExclusionTag[] | null;
  description: string | null;
}

async function fetchAssetUniverse(): Promise<AssetUniverseResult> {
  const [assetsRes, quotesRes] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from("assets") as any)
      .select(
        "id, ticker, name, asset_class, region, currency, issuer, ter, esg_score, env_score, social_score, governance_score, carbon_intensity_gco2e_per_eur, waci_tco2e_per_musd_sales, sfdr_article, implied_temp_rise, volatility, cause_exposure, excluded_sectors, description",
      )
      .eq("is_active", true),
    supabase.from("asset_quotes").select("asset_id, price, fetched_at"),
  ]);

  if (assetsRes.error || quotesRes.error) {
    throw new Error((assetsRes.error ?? quotesRes.error)?.message ?? "Erreur inconnue");
  }

  const assetRows = (assetsRes.data ?? []) as AssetRow[];
  const quoteByAsset = new Map((quotesRes.data ?? []).map((q) => [q.asset_id, q]));

  // Actifs sans cours live : on retombe sur le dernier close connu dans
  // l'historique (asset_prices) plutôt que d'afficher "indisponible" —
  // le cron horaire peut être en retard ou avoir échoué ponctuellement,
  // ça ne doit pas rendre l'écran Découverte inutilisable.
  const missingIds = assetRows.filter((r) => !quoteByAsset.has(r.id)).map((r) => r.id);

  const fallbackByAsset = new Map<string, { close: number; price_date: string }>();
  if (missingIds.length > 0) {
    const { data: fallbackRows, error: fallbackErr } = await supabase.rpc(
      "get_latest_asset_prices",
      { p_asset_ids: missingIds },
    );
    if (fallbackErr) {
      console.warn("[useAssetUniverse] fallback prices", fallbackErr.message);
    } else {
      for (const row of fallbackRows ?? []) {
        fallbackByAsset.set(row.asset_id, {
          close: Number(row.close),
          price_date: row.price_date,
        });
      }
    }
  }

  let stillMissing = 0;
  const mapped: DiscoverAsset[] = assetRows.map((r) => {
    const quote = quoteByAsset.get(r.id);
    const fallback = fallbackByAsset.get(r.id);
    const price = quote?.price != null ? Number(quote.price) : (fallback?.close ?? null);
    if (price == null) stillMissing += 1;
    const causeExposure = (r.cause_exposure ?? {}) as Record<string, number>;
    const esg = Number(r.esg_score);
    const carbon = r.carbon_intensity_gco2e_per_eur;
    const themes = Object.entries(causeExposure)
      .filter(([, v]) => Number(v) > 0.15)
      .map(([k]) => k);
    // Calculé ici (et pas en aval) : c'est le seul endroit où l'on sait encore
    // si les scores E/S/G viennent du fournisseur ou sont dérivés du score global.
    const transparencyInput: TransparencyInput = {
      hasPrice: price != null,
      hasPillarScores: r.env_score != null && r.social_score != null && r.governance_score != null,
      hasCarbonData: carbon != null,
      sfdrArticle: r.sfdr_article,
      overallEsgScore: esg / 10,
      climateScore: Number(r.env_score ?? esg) / 10,
      exclusionsCount: (r.excluded_sectors ?? []).length,
      claimsGreenTheme: themes.some((th) => GREEN_CAUSE_TAGS.has(th)),
    };
    const greenwashing = assessGreenwashingRisk(transparencyInput);
    const dataCoverage = computeDataCoverage(transparencyInput);
    // Durabilité dérivée des signaux bruts (indépendante de SFDR) — même vérité
    // pour tous les consommateurs Découvrir. On passe les scores en échelle 0..100.
    const sustainability = deriveDiscoverAssetTier({
      esgScore0to100: esg,
      climateScore0to100: r.env_score,
      waci: r.waci_tco2e_per_musd_sales != null ? Number(r.waci_tco2e_per_musd_sales) : null,
      impliedTempRise: r.implied_temp_rise,
      exclusionsCount: (r.excluded_sectors ?? []).length,
      dataCoverage,
      sfdrArticle: r.sfdr_article,
    });
    return {
      id: r.id,
      ticker: r.ticker,
      name: r.name,
      asset_class: r.asset_class,
      category: ASSET_CLASS_LABEL[r.asset_class] ?? r.asset_class,
      region: r.region,
      description: r.description ?? "",
      issuer: r.issuer,
      currency: r.currency,
      current_price: price,
      quote_fetched_at: quote?.fetched_at ?? fallback?.price_date ?? null,
      overall_esg_score: esg / 10,
      climate_score: Number(r.env_score ?? esg) / 10,
      social_score: Number(r.social_score ?? esg) / 10,
      governance_score: Number(r.governance_score ?? esg) / 10,
      ter_pct: Number(r.ter) * 100,
      risk_level: riskLevelFromVolatility(Number(r.volatility)),
      co2_factor_per_1k_eur: carbon != null ? Number(carbon) : null,
      waci_tco2e_per_musd_sales:
        r.waci_tco2e_per_musd_sales != null ? Number(r.waci_tco2e_per_musd_sales) : null,
      sfdr_article: r.sfdr_article,
      exclusions: r.excluded_sectors ?? [],
      tags: r.sfdr_article ? [`SFDR Art. ${r.sfdr_article}`] : [],
      themes,
      data_coverage: dataCoverage,
      greenwashing_risk: greenwashing.risk,
      greenwashing_reasons: greenwashing.reasons,
      sustainability_tier: sustainability.tier,
    };
  });

  return { assets: mapped, missingPriceCount: stillMissing };
}

/**
 * Univers investissable réel (table `assets`) + dernier cours connu (`asset_quotes`).
 * Passe par TanStack Query : mise en cache/dédup entre montages (Discover peut
 * être visité plusieurs fois par session sans re-fetch systématique).
 */
export function useAssetUniverse(): State {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ASSET_UNIVERSE_QUERY_KEY,
    queryFn: fetchAssetUniverse,
    staleTime: 60_000,
  });

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ASSET_UNIVERSE_QUERY_KEY });
  }, [queryClient]);

  return {
    assets: data?.assets ?? [],
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    missingPriceCount: data?.missingPriceCount ?? 0,
    refresh,
  };
}
