import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useAssetUniverse } from "@/hooks/useAssetUniverse";
import { AssetDetailSheet } from "@/components/discover/AssetDetailSheet";
import { GreenwashingBadge } from "@/components/discover/TransparencyBadges";
import { Skeleton } from "@/components/ui/skeleton";
import type { DiscoverAsset } from "@/lib/discover/types";

const MAX_ROWS = 4;

/**
 * Watchlist sur le dashboard — la boucle de rétention : suivre → revenir voir.
 * État vide intelligent : jamais d'écran mort, toujours une action proposée.
 */
export function WatchlistCard() {
  const { t } = useTranslation();
  const { assetIds, loading: wlLoading } = useWatchlist();
  const { assets, loading: universeLoading } = useAssetUniverse();
  const [detail, setDetail] = useState<DiscoverAsset | null>(null);

  const watchedAssets = useMemo(() => {
    const byId = new Map(assets.map((a) => [a.id, a]));
    return assetIds.map((id) => byId.get(id)).filter((a): a is DiscoverAsset => !!a);
  }, [assetIds, assets]);

  const loading = wlLoading || (assetIds.length > 0 && universeLoading);

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.35 }}
      className="px-5 pt-8"
    >
      <div className="flex items-baseline justify-between mb-3">
        <p className="text-caption uppercase tracking-wider text-ink-3 font-medium">
          {t("watchlist.card_title")}
        </p>
        {watchedAssets.length > 0 && (
          <Link
            to="/discover"
            className="text-caption font-semibold text-ink-2 hover:text-ink transition-colors"
          >
            {t("watchlist.see_all")}
          </Link>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : watchedAssets.length === 0 ? (
        <div className="border border-dashed border-paper-3 rounded-xl p-5 text-center">
          <Star className="w-5 h-5 text-ink-3 mx-auto" strokeWidth={1.6} aria-hidden />
          <p className="text-body-sm text-ink-2 mt-2">{t("watchlist.empty_desc")}</p>
          <Link
            to="/discover"
            className="mt-3 inline-block px-4 py-2 text-label font-medium border border-ink rounded-full hover:bg-ink hover:text-paper transition-colors"
          >
            {t("watchlist.empty_cta")}
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {watchedAssets.slice(0, MAX_ROWS).map((asset) => (
            <button
              key={asset.id}
              type="button"
              onClick={() => setDetail(asset)}
              className="paper-card w-full text-left p-3 flex items-center gap-3 hover:shadow-flat-1 transition-shadow"
            >
              <Star className="w-4 h-4 fill-gold text-gold flex-shrink-0" aria-hidden />
              <div className="flex-1 min-w-0">
                <p className="text-body-sm font-semibold text-ink truncate leading-tight">
                  {asset.name}
                </p>
                <p className="text-tag uppercase tracking-wider text-ink-3 mt-0.5">
                  {asset.ticker} · ESG {asset.overall_esg_score.toFixed(1)}
                </p>
              </div>
              {asset.greenwashing_risk !== "low" && (
                <GreenwashingBadge
                  risk={asset.greenwashing_risk}
                  reasons={asset.greenwashing_reasons}
                  className="flex-shrink-0"
                />
              )}
            </button>
          ))}
          {watchedAssets.length > MAX_ROWS && (
            <p className="text-caption text-ink-3 text-center pt-1">
              {t("watchlist.more_count", { count: watchedAssets.length - MAX_ROWS })}
            </p>
          )}
        </div>
      )}

      <AssetDetailSheet
        open={detail !== null}
        onOpenChange={(o) => !o && setDetail(null)}
        asset={detail}
      />
    </motion.section>
  );
}
