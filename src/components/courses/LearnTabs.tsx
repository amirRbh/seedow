import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

/**
 * Sous-navigation « Apprendre » — regroupe les Cours et la Méthodologie sous
 * une seule entrée de navigation, au lieu de deux items dans le rail.
 */
export function LearnTabs({ active }: { active: "courses" | "methodology" }) {
  const { t } = useTranslation();
  const base =
    "px-4 py-2 rounded-full text-tag font-semibold uppercase tracking-[0.16em] transition-colors";
  return (
    <nav
      aria-label={t("rail_nav.learn")}
      className="inline-flex items-center gap-1 rounded-full border border-paper-3 bg-paper-2 p-1"
    >
      <Link
        to="/cours"
        className={cn(
          base,
          active === "courses" ? "bg-ink text-paper" : "text-ink-3 hover:text-ink",
        )}
      >
        {t("rail_nav.courses")}
      </Link>
      <Link
        to="/methodologie"
        className={cn(
          base,
          active === "methodology" ? "bg-ink text-paper" : "text-ink-3 hover:text-ink",
        )}
      >
        {t("nav.methodology")}
      </Link>
    </nav>
  );
}
