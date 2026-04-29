import { motion } from "framer-motion";

interface EthiSuggestionChipsProps {
  onSelect: (q: string) => void;
  hasGarden: boolean;
}

export function EthiSuggestionChips({ onSelect, hasGarden }: EthiSuggestionChipsProps) {
  const suggestions = hasGarden
    ? ["Analyse mon portefeuille", "Quel actif ajouter ?", "Mon impact carbone ?", "Comment optimiser ?"]
    : ["Comment commencer ?", "C'est quoi un ETF ESG ?", "Combien minimum pour investir ?"];

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
