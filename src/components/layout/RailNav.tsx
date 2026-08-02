import { Link, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type IconKey =
  | "home"
  | "portefeuille"
  | "analyse"
  | "ethi"
  | "decouvrir"
  | "profil"
  | "objectifs"
  | "methodologie"
  | "cours"
  | "comparatif"
  | "certificat"
  | "vote"
  | "wrapped"
  | "reveil";

type NavItem = {
  key: string;
  path: string;
  label: string;
  icon: IconKey;
  shortcut?: string;
};

/**
 * Rail vertical desktop — 64px de large, icônes sobres, tooltip au hover.
 * Mobile : rien (le `BottomNavigation` existant prend le relais).
 */
export function RailNav() {
  const { t } = useTranslation();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // Primaire = l'app financière : l'Accueil (Dashboard, son argent) d'abord,
  // puis le Portefeuille, Découvrir et Le Vote (le différenciateur). Le Réveil
  // et Ethi n'ont pas besoin d'une entrée primaire : le Réveil vit comme carte
  // sur l'Accueil, Ethi reste accessible en secondaire (et en bouton flottant
  // sur mobile).
  const PRIMARY: NavItem[] = [
    {
      key: "dashboard",
      path: "/dashboard",
      label: t("rail_nav.home"),
      icon: "home",
      shortcut: "g d",
    },
    {
      key: "portfolio",
      path: "/portfolio",
      label: t("nav.portfolio"),
      icon: "analyse",
      shortcut: "g p",
    },
    { key: "discover", path: "/discover", label: t("bottom_nav.explore"), icon: "decouvrir" },
    { key: "vote", path: "/vote", label: t("rail_nav.vote"), icon: "vote", shortcut: "g v" },
  ];
  // Secondaire = 4 portes d'entrée seulement. Les surfaces annexes (Objectifs,
  // Comparatif, Certificat, Bilan, Méthodologie, Réglages) ne disparaissent pas :
  // elles sont regroupées dans le hub « Mon compte » et dans « Apprendre ».
  const SECONDARY: NavItem[] = [
    { key: "ethi", path: "/ethi", label: t("rail_nav.ethi_assistant"), icon: "ethi" },
    { key: "cours", path: "/cours", label: t("rail_nav.learn"), icon: "cours" },
    {
      key: "reveil",
      path: "/reveil",
      label: t("rail_nav.reveil"),
      icon: "reveil",
      shortcut: "g r",
    },
    { key: "profil", path: "/profil", label: t("rail_nav.account"), icon: "profil" },
  ];
  return (
    <aside
      aria-label={t("rail_nav.aria")}
      className="hidden md:flex fixed left-0 top-0 bottom-0 z-40 w-16 flex-col items-center bg-paper border-r border-paper-3 pt-3 pb-4"
    >
      {/* Marque compacte */}
      <Link
        to="/dashboard"
        aria-label={t("rail_nav.seedow_home")}
        className="flex items-center justify-center w-10 h-10 mb-2 outline-none rounded-sm focus-visible:ring-2 focus-visible:ring-highlight-1"
      >
        <span className="font-value text-body text-ink tracking-tight leading-none">s</span>
      </Link>
      <div className="h-px w-6 bg-gold/40 my-2" />

      <nav className="flex flex-col items-center gap-1 flex-1 mt-2">
        {PRIMARY.map((item) => (
          <RailLink key={item.key} item={item} active={pathname === item.path} />
        ))}
      </nav>

      <div className="h-px w-6 bg-paper-3 my-2" />
      <nav className="flex flex-col items-center gap-1">
        {SECONDARY.map((item) => (
          <RailLink key={item.key} item={item} active={pathname === item.path} />
        ))}
      </nav>
    </aside>
  );
}

function RailLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to={item.path}
          aria-current={active ? "page" : undefined}
          aria-label={item.label}
          className={cn(
            "relative flex items-center justify-center w-10 h-10 rounded-md transition-colors duration-150",
            "outline-none focus-visible:ring-2 focus-visible:ring-highlight-1",
            active ? "text-ink bg-highlight-5/60" : "text-ink-3 hover:text-ink hover:bg-paper-2",
          )}
        >
          <NavIcon type={item.icon} />
          {active && (
            <span
              aria-hidden="true"
              className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[2px] bg-gold rounded-r"
            />
          )}
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8} className="text-caption">
        <span>{item.label}</span>
        {item.shortcut && (
          <kbd className="ml-2 text-tag text-paper/55 font-mono tracking-wide">{item.shortcut}</kbd>
        )}
      </TooltipContent>
    </Tooltip>
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
    case "home":
      return (
        <svg {...common}>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 9.5V21h14V9.5" />
          <path d="M9.5 21v-6h5v6" />
        </svg>
      );
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
    case "profil":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
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
    case "methodologie":
      return (
        <svg {...common}>
          <path d="M4 4h12a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4V4Z" />
          <path d="M8 8h8" />
          <path d="M8 12h8" />
          <path d="M8 16h5" />
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
    case "comparatif":
      return (
        <svg {...common}>
          <circle cx="9" cy="12" r="7" />
          <circle cx="15" cy="12" r="7" />
        </svg>
      );
    case "certificat":
      return (
        <svg {...common}>
          <circle cx="12" cy="9" r="6" />
          <path d="m9 14-2 7 5-3 5 3-2-7" />
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
    case "wrapped":
      return (
        <svg {...common}>
          <path d="M12 3v18" />
          <path d="M5 8l7-5 7 5" />
          <path d="M5 8v8l7 5 7-5V8" />
        </svg>
      );
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
  }
}
