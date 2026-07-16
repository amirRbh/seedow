import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AssetClass, DiscoverAsset } from "@/lib/discover/types";

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
  refresh: () => void;
}

/** Univers investissable réel (table `assets`) + dernier cours connu (`asset_quotes`). */
export function useAssetUniverse(): State {
  const [assets, setAssets] = useState<DiscoverAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      const [assetsRes, quotesRes] = await Promise.all([
        supabase
          .from("assets")
          .select(
            "id, ticker, name, asset_class, region, currency, issuer, ter, esg_score, env_score, social_score, governance_score, carbon_intensity_gco2e_per_eur, sfdr_article, volatility, cause_exposure, excluded_sectors, description",
          )
          .eq("is_active", true),
        supabase.from("asset_quotes").select("asset_id, price, fetched_at"),
      ]);
      if (cancelled) return;

      if (assetsRes.error || quotesRes.error) {
        setError((assetsRes.error ?? quotesRes.error)?.message ?? "Erreur inconnue");
        setAssets([]);
        setLoading(false);
        return;
      }

      const quoteByAsset = new Map((quotesRes.data ?? []).map((q) => [q.asset_id, q]));

      const mapped: DiscoverAsset[] = (assetsRes.data ?? []).map((r) => {
        const quote = quoteByAsset.get(r.id);
        const causeExposure = (r.cause_exposure ?? {}) as Record<string, number>;
        const esg = Number(r.esg_score);
        const carbon = r.carbon_intensity_gco2e_per_eur;
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
          current_price: quote?.price != null ? Number(quote.price) : null,
          quote_fetched_at: quote?.fetched_at ?? null,
          overall_esg_score: esg / 10,
          climate_score: Number(r.env_score ?? esg) / 10,
          social_score: Number(r.social_score ?? esg) / 10,
          governance_score: Number(r.governance_score ?? esg) / 10,
          ter_pct: Number(r.ter) * 100,
          risk_level: riskLevelFromVolatility(Number(r.volatility)),
          co2_factor_per_1k_eur: carbon != null ? Number(carbon) : null,
          sfdr_article: r.sfdr_article,
          exclusions: r.excluded_sectors ?? [],
          tags: r.sfdr_article ? [`SFDR Art. ${r.sfdr_article}`] : [],
          themes: Object.entries(causeExposure)
            .filter(([, v]) => Number(v) > 0.15)
            .map(([k]) => k),
        };
      });

      setAssets(mapped);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [tick]);

  return { assets, loading, error, refresh };
}
