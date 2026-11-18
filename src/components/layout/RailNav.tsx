import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  BookOpen,
  ChartNoAxesColumn,
  Compass,
  House,
  MessageCircle,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { SeedMark } from "@/components/brand/Wordmark";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { EASE_SIGNATURE } from "@/lib/motion";
import { cn } from "@/lib/utils";

type NavItem = {
  key: string;
  path: string;
  label: string;
  /** Libellé complet (infobulle, lecteur d'écran) quand le libellé court abrège. */
  fullLabel?: string;
  icon: LucideIcon;
  shortcut?: string;
};

/**
 * Dock de navigation desktop — DA V4.
 *
 * Un panneau de verre flottant, détaché du bord, de 88px. Chaque entrée porte
 * son icône ET son nom : le rail V3 n'affichait que des pictogrammes, qu'il
 * fallait survoler un par un pour savoir où l'on allait. L'entrée active est
 * marquée par une pastille teintée qui GLISSE d'une entrée à l'autre
 * (`layoutId`), par son libellé en encre, et par `aria-current` — jamais par la
 * couleur seule.
 *
 * Mobile : rien (le `BottomNavigation` prend le relais).
 */
export function RailNav() {
  const { t } = useTranslation();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // Primaire = l'app financière : l'Accueil (son argent) d'abord, puis le
  // Portefeuille, Explorer et Apprendre. Vote et Réveil (paris non prouvés)
  // restent accessibles par ⌘K et leurs raccourcis — routes intactes.
  const PRIMARY: NavItem[] = [
    { key: "dashboard", path: "/le-fil", label: t("rail_nav.home"), icon: House, shortcut: "g d" },
    {
      key: "portfolio",
      path: "/portfolio",
      label: t("nav.portfolio"),
      icon: ChartNoAxesColumn,
      shortcut: "g p",
    },
    { key: "discover", path: "/discover", label: t("bottom_nav.explore"), icon: Compass },
    { key: "cours", path: "/cours", label: t("rail_nav.learn"), icon: BookOpen, shortcut: "g c" },
  ];
  // Secondaire = deux portes : l'assistant, et le hub « Mon compte » qui
  // regroupe Objectifs, Comparatif, Certificat, Bilan, Méthodologie, Réglages.
  const SECONDARY: NavItem[] = [
    {
      key: "ethi",
      path: "/ethi",
      label: t("bottom_nav.ethi"),
      fullLabel: t("rail_nav.ethi_assistant"),
      icon: MessageCircle,
    },
    {
      key: "profil",
      path: "/profil",
      label: t("bottom_nav.profile"),
      fullLabel: t("rail_nav.account"),
      icon: UserRound,
    },
  ];

  const isActive = (path: string) => pathname === path || pathname.startsWith(`${path}/`);

  return (
    <aside
      aria-label={t("rail_nav.aria")}
      className="glass fixed top-3 bottom-3 left-3 z-40 hidden w-[88px] flex-col items-center rounded-[28px] py-4 md:flex"
    >
      <Link
        to="/le-fil"
        aria-label={t("rail_nav.seedow_home")}
        className="group rounded-[14px] outline-none focus-visible:ring-2 focus-visible:ring-mint focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
      >
        <SeedMark className="transition-transform duration-500 ease-brand group-hover:-rotate-6 group-hover:scale-105 motion-reduce:transition-none" />
      </Link>

      <nav className="mt-6 flex flex-1 flex-col items-center gap-1">
        {PRIMARY.map((item) => (
          <RailLink key={item.key} item={item} active={isActive(item.path)} />
        ))}
      </nav>

      <nav className="flex flex-col items-center gap-1 border-t border-paper-3 pt-3">
        {SECONDARY.map((item) => (
          <RailLink key={item.key} item={item} active={isActive(item.path)} />
        ))}
      </nav>
    </aside>
  );
}

function RailLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to={item.path}
          aria-current={active ? "page" : undefined}
          aria-label={item.fullLabel ?? item.label}
          className={cn(
            "group relative flex h-[62px] w-[72px] flex-col items-center justify-center gap-1 rounded-[20px] outline-none transition-colors duration-200",
            "focus-visible:ring-2 focus-visible:ring-mint",
            active ? "text-mint-ink" : "text-ink-3 hover:text-ink",
          )}
        >
          {active && (
            <motion.span
              layoutId="rail-active"
              aria-hidden
              className="absolute inset-0 rounded-[20px] bg-mint-tint"
              transition={{ duration: 0.38, ease: EASE_SIGNATURE }}
            />
          )}
          {!active && (
            <span
              aria-hidden
              className="absolute inset-0 rounded-[20px] bg-paper-inset opacity-0 transition-opacity duration-200 group-hover:opacity-100"
            />
          )}
          <Icon
            aria-hidden
            className="relative size-[21px] transition-transform duration-300 ease-brand group-hover:-translate-y-0.5 motion-reduce:transition-none"
            strokeWidth={active ? 2.4 : 2}
          />
          <span
            className={cn(
              "relative text-tag leading-none font-bold",
              active ? "text-mint-ink" : "text-ink-3 group-hover:text-ink",
            )}
          >
            {item.label}
          </span>
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={12} className="text-caption">
        <span>{item.fullLabel ?? item.label}</span>
        {item.shortcut && (
          <kbd className="ml-2 font-mono text-tag tracking-wide text-paper/55">{item.shortcut}</kbd>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
