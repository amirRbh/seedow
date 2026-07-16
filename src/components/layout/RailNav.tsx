import { Link, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type IconKey =
  | "portefeuille"
  | "analyse"
  | "ethi"
  | "decouvrir"
  | "profil"
  | "comparatif"
  | "methodologie"
  | "cours";

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
  const PRIMARY: NavItem[] = [
    { key: "dashboard", path: "/dashboard", label: t("rail_nav.home"), icon: "portefeuille", shortcut: "g d" },
    { key: "portfolio", path: "/portfolio", label: t("nav.portfolio"), icon: "analyse", shortcut: "g p" },
    { key: "objectifs", path: "/objectifs", label: t("nav.objectives"), icon: "comparatif", shortcut: "g o" },
    { key: "discover", path: "/discover", label: t("bottom_nav.explore"), icon: "decouvrir" },
    { key: "ethi", path: "/ethi", label: t("rail_nav.ethi_assistant"), icon: "ethi" },
  ];
  const SECONDARY: NavItem[] = [
    { key: "profil", path: "/profil", label: t("rail_nav.investor_profile"), icon: "profil" },
    { key: "cours", path: "/cours", label: "Cours", icon: "cours" },
    { key: "methodologie", path: "/methodologie", label: t("nav.methodology"), icon: "methodologie" },
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
        className="flex items-center justify-center w-10 h-10 mb-2 outline-none rounded-sm focus-visible:ring-2 focus-visible:ring-moss-1"
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
            "outline-none focus-visible:ring-2 focus-visible:ring-moss-1",
            active ? "text-ink bg-moss-5/60" : "text-ink-3 hover:text-ink hover:bg-paper-2",
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
          <kbd className="ml-2 text-tag text-ink-3 font-mono tracking-wide">{item.shortcut}</kbd>
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
    case "comparatif":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
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
  }
}
