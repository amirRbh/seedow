import { Link, useLocation } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { EthiFab } from "./EthiFab";
import { cn } from "@/lib/utils";

type IconKey = "home" | "analyse" | "decouvrir" | "cours";

type NavItem = {
  key: string;
  path: string;
  labelKey: string;
  icon: IconKey;
};

// Quatre piliers stables (analyse UX §04 — P0) : Accueil (son argent) → Explorer
// (trouver) → Mon portefeuille (ce qu'on détient et son impact) → Apprendre.
// Ces quatre couvrent toute l'app. Vote et Réveil, concepts de niveau 3, vivent
// désormais comme sections/teasers du portefeuille — plus dans la nav primaire.
// Ethi reste un bouton flottant transversal.
const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", path: "/le-fil", labelKey: "bottom_nav.home", icon: "home" },
  { key: "discover", path: "/discover", labelKey: "bottom_nav.explore", icon: "decouvrir" },
  { key: "portfolio", path: "/portfolio", labelKey: "bottom_nav.portfolio", icon: "analyse" },
  { key: "cours", path: "/cours", labelKey: "bottom_nav.learn", icon: "cours" },
];

/**
 * Barre de navigation — 4 entrées, alignées sur le rail desktop.
 * DA V2 : l'onglet actif est marqué par un filet d'encre de 2px au-dessus,
 * pas par une pastille arrondie.
 */
export function BottomNavigation() {
  const location = useLocation();
  const { t } = useTranslation();

  return (
    <>
      <EthiFab />
      <nav
        aria-label={t("bottom_nav.aria")}
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-paper border-t border-paper-3 safe-area-bottom"
      >
        <div className="flex items-stretch justify-around max-w-lg mx-auto px-2">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.key}
                to={item.path}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "group relative flex flex-1 flex-col items-center justify-center gap-1 py-3 min-h-[56px]",
                  "outline-none transition-colors duration-150",
                  "focus-visible:ring-2 focus-visible:ring-highlight-1 focus-visible:ring-offset-0 rounded-sm",
                  isActive ? "text-ink" : "text-ink-3 hover:text-ink",
                )}
              >
                <NavIcon type={item.icon} />
                <span className={cn("stamp leading-none", isActive ? "text-ink" : "text-ink-3")}>
                  {t(item.labelKey)}
                </span>
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-10 rounded-full bg-ink"
                  />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

function NavIcon({ type }: { type: IconKey }) {
  const common = {
    viewBox: "0 0 24 24",
    className: "w-[22px] h-[22px]",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (type) {
    case "home":
      return (
        <svg {...common}>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 9.5V21h14V9.5" />
          <path d="M9.5 21v-6h5v6" />
        </svg>
      );
    case "cours":
      return (
        <svg {...common}>
          <path d="M4 5a2 2 0 0 1 2-2h11v16H6a2 2 0 0 0-2 2V5Z" />
          <path d="M8 7h6" />
          <path d="M8 11h6" />
        </svg>
      );
    case "analyse":
      return (
        <svg {...common}>
          <path d="M3 21h18" />
          <path d="M6 21V11" />
          <path d="M11 21V6" />
          <path d="M16 21v-7" />
          <path d="M21 21V9" />
        </svg>
      );
    case "decouvrir":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="m15 9-2 4-4 2 2-4 4-2Z" />
        </svg>
      );
  }
}
