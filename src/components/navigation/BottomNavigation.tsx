import { Link, useLocation } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

type IconKey = "portefeuille" | "analyse" | "objectifs" | "decouvrir" | "ethi";

type NavItem = {
  key: string;
  path: string;
  labelKey: string;
  icon: IconKey;
};

const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", path: "/dashboard", labelKey: "bottom_nav.home", icon: "portefeuille" },
  { key: "portfolio", path: "/portfolio", labelKey: "bottom_nav.portfolio", icon: "analyse" },
  { key: "objectifs", path: "/objectifs", labelKey: "bottom_nav.objectives", icon: "objectifs" },
  { key: "discover", path: "/discover", labelKey: "bottom_nav.explore", icon: "decouvrir" },
  { key: "ethi", path: "/ethi", labelKey: "bottom_nav.ethi", icon: "ethi" },
];

/**
 * Barre de navigation éditoriale — 5 entrées alignées sur le rail desktop.
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
                "focus-visible:ring-2 focus-visible:ring-moss-1 focus-visible:ring-offset-0 rounded-sm",
                isActive ? "text-ink" : "text-ink-3 hover:text-ink",
              )}
            >
              <NavIcon type={item.icon} />
              <span
                className={cn(
                  "text-[10px] leading-none tracking-[0.14em] uppercase",
                  isActive ? "font-semibold" : "font-medium",
                )}
              >
                {item.label}
              </span>
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-8 bg-moss-1"
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
    case "portefeuille":
      return (
        <svg {...common}>
          <rect x="3" y="6" width="18" height="13" rx="1.5" />
          <path d="M3 10h18" />
          <path d="M16 14h2" />
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
    case "objectifs":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" />
        </svg>
      );
    case "ethi":
      return (
        <svg {...common}>
          <path d="M21 12a8 8 0 0 1-11.5 7.2L4 21l1.8-5.5A8 8 0 1 1 21 12Z" />
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
