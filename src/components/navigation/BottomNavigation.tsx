import { Link, useLocation } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

type IconKey = "reveil" | "vote" | "analyse" | "profil";

type NavItem = {
  key: string;
  path: string;
  labelKey: string;
  icon: IconKey;
};

// Core loop du produit : Voir (Le Réveil) → Agir (Le Vote) → son argent
// (Portefeuille) → soi (Profil). Volontairement réduit à 4 entrées : chaque
// onglet porte une seule intention, aucune surface « robo-advisor » ici.
const NAV_ITEMS: NavItem[] = [
  { key: "reveil", path: "/reveil", labelKey: "bottom_nav.reveil", icon: "reveil" },
  { key: "vote", path: "/vote", labelKey: "bottom_nav.vote", icon: "vote" },
  { key: "portfolio", path: "/portfolio", labelKey: "bottom_nav.portfolio", icon: "analyse" },
  { key: "profil", path: "/profil", labelKey: "bottom_nav.profile", icon: "profil" },
];

/**
 * Barre de navigation éditoriale — 4 entrées, alignées sur le rail desktop.
 */
export function BottomNavigation() {
  const location = useLocation();
  const { t } = useTranslation();

  return (
    <nav
      aria-label={t("bottom_nav.aria")}
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-paper/95 backdrop-blur-xl border-t border-paper-3 safe-area-bottom"
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
              <span
                className={cn(
                  "text-tag leading-none tracking-[0.14em] uppercase",
                  isActive ? "font-semibold" : "font-medium",
                )}
              >
                {t(item.labelKey)}
              </span>
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-8 bg-highlight-1"
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function NavIcon({ type }: { type: IconKey }) {
  const common = {
    viewBox: "0 0 24 24",
    className: "w-[18px] h-[18px]",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (type) {
    case "reveil":
      return (
        <svg {...common}>
          <path d="M17 18a5 5 0 0 0-10 0" />
          <path d="M12 2v7" />
          <path d="m4.9 10.9 1.4 1.4" />
          <path d="M2 18h2" />
          <path d="M20 18h2" />
          <path d="m17.7 12.3 1.4-1.4" />
          <path d="M22 22H2" />
          <path d="m8 6 4-4 4 4" />
        </svg>
      );
    case "vote":
      return (
        <svg {...common}>
          <path d="M5 21h14" />
          <path d="M6 21v-6l6-3 6 3v6" />
          <path d="m9 12 3 3 3-3" />
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
    case "profil":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
        </svg>
      );
  }
}
