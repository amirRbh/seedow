import { Link, useLocation } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { BookOpen, ChartNoAxesColumn, Compass, House, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { EthiFab } from "./EthiFab";
import { EASE_SIGNATURE } from "@/lib/motion";
import { cn } from "@/lib/utils";

type NavItem = {
  key: string;
  path: string;
  labelKey: string;
  icon: LucideIcon;
};

// Quatre piliers stables (analyse UX §04 — P0) : Accueil (son argent) → Explorer
// (trouver) → Mon portefeuille (ce qu'on détient et son impact) → Apprendre.
// Ces quatre couvrent toute l'app. Vote et Réveil, concepts de niveau 3, vivent
// comme sections/teasers du portefeuille — plus dans la nav primaire.
// Ethi reste un bouton flottant transversal.
const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", path: "/le-fil", labelKey: "bottom_nav.home", icon: House },
  { key: "discover", path: "/discover", labelKey: "bottom_nav.explore", icon: Compass },
  {
    key: "portfolio",
    path: "/portfolio",
    labelKey: "bottom_nav.portfolio",
    icon: ChartNoAxesColumn,
  },
  { key: "cours", path: "/cours", labelKey: "bottom_nav.learn", icon: BookOpen },
];

/**
 * Barre de navigation mobile — DA V4 : une pilule de verre flottante, décollée
 * du bord. Quatre entrées, alignées sur le dock desktop. L'onglet actif est
 * marqué par une pastille teintée qui glisse d'un onglet à l'autre, par son
 * libellé en encre et par `aria-current`.
 */
export function BottomNavigation() {
  const location = useLocation();
  const { t } = useTranslation();

  return (
    <>
      <EthiFab />
      <nav
        aria-label={t("bottom_nav.aria")}
        className="fixed inset-x-3 bottom-3 z-50 md:hidden"
        style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="glass mx-auto flex max-w-md items-stretch justify-around rounded-[26px] p-1.5">
          {NAV_ITEMS.map((item) => {
            const isActive =
              location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.key}
                to={item.path}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative flex min-h-[54px] flex-1 flex-col items-center justify-center gap-1 rounded-[20px]",
                  "outline-none transition-colors duration-200 active:scale-95 motion-reduce:active:scale-100",
                  "focus-visible:ring-2 focus-visible:ring-mint",
                  isActive ? "text-mint-ink" : "text-ink-3",
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="bottom-nav-active"
                    aria-hidden
                    className="absolute inset-0 rounded-[20px] bg-mint-tint"
                    transition={{ duration: 0.38, ease: EASE_SIGNATURE }}
                  />
                )}
                <Icon
                  aria-hidden
                  className="relative size-[22px]"
                  strokeWidth={isActive ? 2.4 : 2}
                />
                <span className="relative text-tag leading-none font-bold">{t(item.labelKey)}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
