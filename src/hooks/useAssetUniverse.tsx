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
  /** Nombre d'actifs actifs sans aucun cours (ni live, ni historique) — 0 si tout est couvert. */
  missingPriceCount: number;
  refresh: () => void;
}

/** Univers investissable réel (table `assets`) + dernier cours connu (`asset_quotes`). */
export function useAssetUniverse(): State {
  const [assets, setAssets] = useState<DiscoverAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [missingPriceCount, setMissingPriceCount] = useState(0);
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
        setMissingPriceCount(0);
        setLoading(false);
        return;
      }

      const quoteByAsset = new Map((quotesRes.data ?? []).map((q) => [q.asset_id, q]));

      // Actifs sans cours live : on retombe sur le dernier close connu dans
      // l'historique (asset_prices) plutôt que d'afficher "indisponible" —
      // le cron horaire peut être en retard ou avoir échoué ponctuellement,
      // ça ne doit pas rendre l'écran Découverte inutilisable.
      const missingIds = (assetsRes.data ?? [])
        .filter((r) => !quoteByAsset.has(r.id))
        .map((r) => r.id);

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
      if (cancelled) return;

      let stillMissing = 0;
      const mapped: DiscoverAsset[] = (assetsRes.data ?? []).map((r) => {
        const quote = quoteByAsset.get(r.id);
        const fallback = fallbackByAsset.get(r.id);
        const price = quote?.price != null ? Number(quote.price) : (fallback?.close ?? null);
        if (price == null) stillMissing += 1;
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
          current_price: price,
          quote_fetched_at: quote?.fetched_at ?? fallback?.price_date ?? null,
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
      setMissingPriceCount(stillMissing);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [tick]);

  return { assets, loading, error, missingPriceCount, refresh };
}
