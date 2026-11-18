import { motion } from "framer-motion";
import { EASE_SIGNATURE } from "@/lib/motion";
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
          transition={{ delay: i * 0.08 + 0.2, duration: 0.4, ease: EASE_SIGNATURE }}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => onSelect(c)}
          className="min-h-[44px] rounded-full bg-paper px-4 py-2.5 text-body-sm font-semibold text-ink-2 shadow-card ring-1 ring-inset ring-paper-3 outline-none transition-[color,box-shadow] duration-200 hover:text-ink hover:shadow-soft focus-visible:ring-2 focus-visible:ring-mint"
        >
          {c.label}
        </motion.button>
      ))}
    </div>
  );
}
