import { motion } from "framer-motion";
import { Sparkles, SlidersHorizontal, PenLine, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Props {
  /** Parcours recommandé : accepter la proposition telle quelle. */
  onGuided: () => void;
  /** Partir de la proposition et l'ajuster. */
  onCustomize: () => void;
  /** Repartir d'une page blanche et composer soi-même. */
  onBlank: () => void;
}

/**
 * Écran des 3 choix après la simulation (mission Seedow §10).
 * « Seedow vous propose. Vous décidez. » — le parcours Guidé est clairement
 * recommandé pour un débutant, sans pour autant masquer les deux autres.
 */
export function PostSimulationFork({ onGuided, onCustomize, onBlank }: Props) {
  const { t } = useTranslation();
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="w-full"
    >
      <div className="text-center">
        <p className="font-value text-2xl text-ink">{t("post_sim_fork.title")}</p>
        <p className="text-caption text-ink-2 mt-2 leading-relaxed">{t("post_sim_fork.subtitle")}</p>
      </div>

      <div className="mt-6 space-y-3">
        <ForkCard
          icon={Sparkles}
          title={t("post_sim_fork.guided_title")}
          desc={t("post_sim_fork.guided_desc")}
          badge={t("post_sim_fork.recommended")}
          recommended
          onClick={onGuided}
        />
        <ForkCard
          icon={SlidersHorizontal}
          title={t("post_sim_fork.customize_title")}
          desc={t("post_sim_fork.customize_desc")}
          onClick={onCustomize}
        />
        <ForkCard
          icon={PenLine}
          title={t("post_sim_fork.blank_title")}
          desc={t("post_sim_fork.blank_desc")}
          onClick={onBlank}
        />
      </div>

      <p className="mt-5 text-tag text-ink-3 leading-relaxed text-center">
        {t("post_sim_fork.simulation_note")}
      </p>
    </motion.div>
  );
}

function ForkCard({
  icon: Icon,
  title,
  desc,
  badge,
  recommended = false,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  desc: string;
  badge?: string;
  recommended?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-2xl border p-4 flex items-start gap-3.5 transition-all hover:scale-[1.01] ${
        recommended
          ? "border-ink bg-ink text-paper"
          : "border-paper-3 bg-paper-2 text-ink hover:bg-paper-3/40"
      }`}
    >
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
          recommended ? "bg-paper/15" : "bg-paper-3"
        }`}
      >
        <Icon className="w-5 h-5" strokeWidth={1.8} aria-hidden />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className={`text-body-sm font-semibold ${recommended ? "text-paper" : "text-ink"}`}>
            {title}
          </p>
          {badge && (
            <span
              className={`text-tag uppercase tracking-[0.12em] font-bold rounded-full px-2 py-0.5 ${
                recommended ? "bg-paper text-ink" : "bg-ink text-paper"
              }`}
            >
              {badge}
            </span>
          )}
        </div>
        <p className={`text-caption mt-1 leading-relaxed ${recommended ? "text-paper/75" : "text-ink-2"}`}>
          {desc}
        </p>
      </div>
      <svg
        viewBox="0 0 24 24"
        className={`w-4 h-4 mt-1 flex-shrink-0 ${recommended ? "text-paper/70" : "text-ink-3"}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden
      >
        <path d="M9 6l6 6-6 6" />
      </svg>
    </button>
  );
}
