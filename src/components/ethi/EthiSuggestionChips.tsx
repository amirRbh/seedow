import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

interface EthiSuggestionChipsProps {
  onSelect: (q: string) => void;
  hasGarden: boolean;
}

export function EthiSuggestionChips({ onSelect, hasGarden }: EthiSuggestionChipsProps) {
  const { t } = useTranslation();
  const suggestions = hasGarden
    ? [
      t("ethi_chips:analyse_portfolio"),
      t("ethi_chips:what_asset"),
      t("ethi_chips:carbon_impact"),
      t("ethi_chips:how_optimize")
    ]
    : [
      t("ethi_chips:how_start"),
      t("ethi_chips:what_esg_etf"),
      t("ethi_chips:minimum_invest")
    ];

  return (
    <div className="flex flex-wrap gap-2 justify-end">
      {suggestions.map((s, i) => (
        <motion.button
          key={s}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 + 0.2 }}
          onClick={() => onSelect(s)}
          className="bg-paper/10 border border-paper/15 hover:bg-moss-2/30 hover:border-moss-3 rounded-full px-3 py-2 text-[11px] text-paper/80 hover:text-paper transition-all"
        >
          {s}
        </motion.button>
      ))}
    </div>
  );
}
