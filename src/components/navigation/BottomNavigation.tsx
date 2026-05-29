import { Link, useLocation } from "@tanstack/react-router";
import { useLexicon } from "@/hooks/useLexicon";
import { cn } from "@/lib/utils";

type IconKey = "portefeuille" | "analyse" | "ethi" | "decouvrir";

const NAV_ITEMS: { key: "garden" | "roots" | "ethi" | "discover"; path: string; labelKey: "garden" | "roots" | "ethi" | "discover"; icon: IconKey }[] = [
  { key: "garden", path: "/dashboard", labelKey: "garden", icon: "portefeuille" },
  { key: "roots", path: "/portfolio", labelKey: "roots", icon: "analyse" },
  { key: "ethi", path: "/ethi", labelKey: "ethi", icon: "ethi" },
  { key: "discover", path: "/discover", labelKey: "discover", icon: "decouvrir" },
];

/**
 * Barre de navigation éditoriale.
 * — Filet 1px en haut, fond papier translucide.
 * — Item actif souligné d'un filet emerald (un seul accent par écran).
 * — Icônes neutres (trait 1.8), pas d'ombre, pas de pastille colorée, pas de loop d'animation.
 */
export function BottomNavigation() {
  const location = useLocation();
  const { L } = useLexicon();

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed bottom-0 left-0 right-0 z-50 bg-paper/95 backdrop-blur-xl border-t border-paper-3 safe-area-bottom"
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
                {L.nav[item.labelKey]}
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
  const sw = 1.8;
  const common = {
    viewBox: "0 0 24 24",
    className: "w-[18px] h-[18px]",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: sw,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (type) {
    case "portefeuille":
      // Rectangle sobre = portefeuille / wallet
      return (
        <svg {...common}>
          <rect x="3" y="6" width="18" height="13" rx="1.5" />
          <path d="M3 10h18" />
          <path d="M16 14h2" />
        </svg>
      );
    case "analyse":
      // Histogramme = analyse / lecture des chiffres
      return (
        <svg {...common}>
          <path d="M3 21h18" />
          <path d="M6 21V11" />
          <path d="M11 21V6" />
          <path d="M16 21v-7" />
          <path d="M21 21V9" />
        </svg>
      );
    case "ethi":
      // Bulle conversation neutre
      return (
        <svg {...common}>
          <path d="M21 12a8 8 0 0 1-11.5 7.2L4 21l1.8-5.5A8 8 0 1 1 21 12Z" />
        </svg>
      );
    case "decouvrir":
      // Boussole sobre
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="m15 9-2 4-4 2 2-4 4-2Z" />
        </svg>
      );
  }
}
