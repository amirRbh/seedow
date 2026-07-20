import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useLang } from "@/hooks/useLang";
import { formatCurrency } from "@/lib/format";
import type { DiscoverAsset } from "@/lib/discover/types";
import { dominantRegion } from "@/lib/discover/filters";

interface Props {
  asset: DiscoverAsset;
  index: number;
  onOpen: () => void;
}

export function AssetRow({ asset, index, onOpen }: Props) {
  const { t } = useTranslation();
  const { lang } = useLang();
  const region = dominantRegion(asset);

  return (
    <motion.button
      type="button"
      onClick={onOpen}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.025, 0.4) }}
      className="paper-card w-full text-left p-3.5 flex items-center gap-3 hover:shadow-flat-1 transition-shadow group"
    >
      <div className="w-11 h-11 rounded-md bg-paper-2 border border-paper-3 flex items-center justify-center flex-shrink-0">
        <span className="text-ink text-tag font-bold tracking-tight">
          {asset.ticker.slice(0, 5)}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-body-sm font-semibold text-ink truncate leading-tight">{asset.name}</p>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <span className="text-tag uppercase tracking-wider text-ink-3 font-semibold">
            {asset.category}
          </span>
          <span className="text-tag text-ink-3">·</span>
          <span className="text-tag uppercase tracking-wider text-ink-3">{region}</span>
          {asset.risk_level != null && (
            <>
              <span className="text-tag text-ink-3">·</span>
              <span className="text-tag uppercase tracking-wider text-ink-3">
                {t("discover.row.risk")} {asset.risk_level}/7 ·{" "}
                {t(`asset_detail.risk_labels.${asset.risk_level}`)}
              </span>
            </>
          )}
          {asset.ter_pct != null && (
            <>
              <span className="text-tag text-ink-3">·</span>
              <span className="text-tag uppercase tracking-wider text-ink-3">
                {t("discover.row.ter")} {asset.ter_pct.toFixed(2).replace(".", ",")}%
              </span>
            </>
          )}
        </div>
      </div>

      <div className="text-right flex-shrink-0">
        <p className="font-value text-base text-ink leading-none">
          {asset.current_price != null
            ? formatCurrency(asset.current_price, lang)
            : t("discover.row.price_unavailable")}
        </p>
        <p className="text-tag uppercase tracking-wider text-gold font-semibold mt-1">
          {asset.greenwashing_risk === "high" && (
            <span className="text-rust mr-1" title={t("transparency.gw_row_flag")} aria-hidden>
              ⚠
            </span>
          )}
          ESG {asset.overall_esg_score.toFixed(1)}
        </p>
      </div>

      <svg
        viewBox="0 0 24 24"
        className="w-4 h-4 text-ink-3 group-hover:text-ink transition-colors flex-shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 6l6 6-6 6" />
      </svg>
    </motion.button>
  );
}
