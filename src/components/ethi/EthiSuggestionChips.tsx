import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

export interface SuggestionChip {
  label: string;
  kind?: "sim";
  query?: string;
}

interface EthiSuggestionChipsProps {
  onSelect: (chip: SuggestionChip) => void;
  hasPortfolio: boolean;
  chips?: SuggestionChip[];
}

export function EthiSuggestionChips({ onSelect, hasPortfolio, chips }: EthiSuggestionChipsProps) {
  const { t } = useTranslation();
  const fallback: SuggestionChip[] = hasPortfolio
    ? [
        { label: t("ethi_chips.analyse_portfolio"), query: t("ethi_chips.analyse_portfolio") },
        { label: t("ethi_chips.what_asset"), query: t("ethi_chips.what_asset") },
        { label: t("ethi_chips.carbon_impact"), query: t("ethi_chips.carbon_impact") },
        { label: t("ethi_chips.how_optimize"), query: t("ethi_chips.how_optimize") },
      ]
    : [
        { label: t("ethi_chips.how_start"), query: t("ethi_chips.how_start") },
        { label: t("ethi_chips.what_esg_etf"), query: t("ethi_chips.what_esg_etf") },
        { label: t("ethi_chips.minimum_invest"), query: t("ethi_chips.minimum_invest") },
      ];

  const list = chips && chips.length > 0 ? chips : fallback;

  return (
    <div className="flex flex-wrap gap-2 justify-end">
      {list.map((c, i) => (
        <motion.button
          key={`${c.label}-${i}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 + 0.2 }}
          onClick={() => onSelect(c)}
          className="bg-paper/10 border border-paper/15 hover:bg-highlight-2/30 hover:border-highlight-3 rounded-full px-3 py-2 text-caption text-paper/80 hover:text-paper transition-all"
        >
          {c.label}
        </motion.button>
      ))}
    </div>
  );
}
