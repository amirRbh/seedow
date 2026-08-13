import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useLang } from "@/hooks/useLang";
import { formatCurrency } from "@/lib/format";
import type { DiscoverAsset } from "@/lib/discover/types";
import { ImpactBadge } from "./ImpactBadge";

interface Props {
  asset: DiscoverAsset;
  index: number;
  onOpen: () => void;
}

/**
 * Ligne d'actif — épurée façon Trade Republic : nom lisible, une seule
 * sous-ligne (catégorie), et à droite le prix + le repère d'impact. Le détail
 * (région, risque, frais, sources) vit dans la fiche au tap — on ne charge pas
 * la liste de méta que le débutant ne sait pas encore lire (progressive
 * disclosure, priorité mobile).
 */
export function AssetRow({ asset, index, onOpen }: Props) {
  const { t } = useTranslation();
  const { lang } = useLang();

  return (
    <motion.button
      type="button"
      onClick={onOpen}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.025, 0.4) }}
      className="paper-card w-full text-left p-4 flex items-center gap-3 hover:shadow-flat-1 transition-shadow active:scale-[0.99]"
    >
      <div className="w-11 h-11 rounded-md bg-paper-2 border border-paper-3 flex items-center justify-center flex-shrink-0">
        <span className="text-ink text-tag font-bold tracking-tight">
          {asset.ticker.slice(0, 5)}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-body-sm font-semibold text-ink truncate leading-tight">{asset.name}</p>
        <div className="flex items-center gap-1.5 mt-1 min-w-0">
          <span className="text-tag uppercase tracking-wider text-ink-3 font-mono truncate">
            {asset.category}
          </span>
          {asset.greenwashing_risk === "high" && (
            <span className="text-rust flex-shrink-0" title={t("transparency.gw_row_flag")}>
              ⚠
            </span>
          )}
        </div>
      </div>

      <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
        <p className="font-value text-base text-ink leading-none">
          {asset.current_price != null
            ? formatCurrency(asset.current_price, lang)
            : t("discover.row.price_unavailable")}
        </p>
        <ImpactBadge score={asset.overall_esg_score} />
      </div>
    </motion.button>
  );
}
