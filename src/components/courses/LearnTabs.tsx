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
    "rounded-full px-5 py-2.5 text-label font-bold outline-none transition-[background-color,color,box-shadow] duration-200 ease-brand focus-visible:ring-2 focus-visible:ring-mint";
  return (
    <nav
      aria-label={t("rail_nav.learn")}
      className="inline-flex items-center gap-1 rounded-full bg-paper-inset p-1"
    >
      <Link
        to="/cours"
        aria-current={active === "courses" ? "page" : undefined}
        className={cn(
          base,
          active === "courses" ? "bg-paper text-ink shadow-card" : "text-ink-3 hover:text-ink",
        )}
      >
        {t("rail_nav.courses")}
      </Link>
      <Link
        to="/methodologie"
        aria-current={active === "methodology" ? "page" : undefined}
        className={cn(
          base,
          active === "methodology" ? "bg-paper text-ink shadow-card" : "text-ink-3 hover:text-ink",
        )}
      >
        {t("nav.methodology")}
      </Link>
    </nav>
  );
}
