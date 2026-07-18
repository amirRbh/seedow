import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useViewMode } from "@/hooks/useViewMode";
import { PortfolioSelector } from "@/components/portfolio/PortfolioSelector";
import { AlertsBell } from "@/components/alerts/AlertsBell";
import { LanguageToggle } from "@/components/LanguageToggle";
import { cn } from "@/lib/utils";

interface TopBarProps {
  onOpenCommand: () => void;
}

/**
 * Barre supérieure desktop persistante. Reste alignée au-dessus du Rail.
 * Affiche : marque "seedow", sélecteur de portefeuille, bouton ⌘K, cloche, toggle Simple/Expert, réglages.
 */
export function TopBar({ onOpenCommand }: TopBarProps) {
  const { t } = useTranslation();
  const [isMac, setIsMac] = useState(false);
  useEffect(() => {
    setIsMac(/Mac|iPod|iPhone|iPad/.test(navigator.platform));
  }, []);
  return (
    <header className="hidden md:flex sticky top-0 z-30 h-14 items-center justify-between bg-paper/95 backdrop-blur border-b border-paper-3 pl-5 pr-4">
      <div className="flex items-center gap-4">
        <Link
          to="/dashboard"
          aria-label={t("nav.back_to_portfolio")}
          className="inline-flex items-center outline-none rounded-sm focus-visible:ring-2 focus-visible:ring-moss-1"
        >
          <span className="font-value text-[17px] text-ink tracking-tight">seedow</span>
        </Link>
        <LanguageToggle />
        <span className="h-5 w-px bg-paper-3" aria-hidden="true" />
        <PortfolioSelector />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenCommand}
          className={cn(
            "hidden md:inline-flex items-center gap-2 h-9 pl-3 pr-2 rounded-md border border-paper-3 bg-paper-2/60",
            "text-label text-ink-3 hover:text-ink hover:border-ink-3 transition-colors duration-150",
            "outline-none focus-visible:ring-2 focus-visible:ring-moss-1",
          )}
          aria-label={t("nav.open_command_palette")}
        >
          <SearchIcon />
          <span className="font-medium">{t("nav.search")}</span>
          <kbd
            suppressHydrationWarning
            className="ml-3 inline-flex items-center gap-0.5 h-5 px-1.5 rounded border border-paper-3 bg-paper text-tag text-ink-3 font-mono"
          >
            <span suppressHydrationWarning>{isMac ? "⌘" : "Ctrl"}</span>
            <span>K</span>
          </kbd>
        </button>
        <ViewModeToggle />
        <AlertsBell />
        <Link
          to="/reglages"
          aria-label={t("nav.open_settings")}
          className={cn(
            "flex items-center justify-center w-11 h-11 rounded-full border border-paper-3 text-ink-2",
            "transition-colors duration-150 hover:text-ink hover:border-ink-3",
            "outline-none focus-visible:ring-2 focus-visible:ring-moss-1",
          )}
        >
          <SettingsIcon />
        </Link>
      </div>
    </header>
  );
}

function ViewModeToggle() {
  const { t } = useTranslation();
  const { mode, setMode } = useViewMode();
  return (
    <div
      role="group"
      aria-label={t("view_mode.label")}
      className="inline-flex items-center h-7 rounded-full border border-paper-3 bg-paper overflow-hidden"
    >
      <button
        type="button"
        onClick={() => setMode("simple")}
        aria-pressed={mode === "simple"}
        className={cn(
          "px-2.5 h-7 text-tag font-semibold uppercase tracking-[0.16em] transition-colors duration-150",
          "outline-none focus-visible:ring-2 focus-visible:ring-moss-1 focus-visible:ring-inset",
          mode === "simple" ? "bg-ink text-paper" : "text-ink-3 hover:text-ink",
        )}
      >
        {t("view_mode.simple")}
      </button>
      <button
        type="button"
        onClick={() => setMode("expert")}
        aria-pressed={mode === "expert"}
        className={cn(
          "px-2.5 h-7 text-tag font-semibold uppercase tracking-[0.16em] transition-colors duration-150 border-l border-paper-3",
          "outline-none focus-visible:ring-2 focus-visible:ring-moss-1 focus-visible:ring-inset",
          mode === "expert" ? "bg-ink text-paper" : "text-ink-3 hover:text-ink",
        )}
      >
        {t("view_mode.expert")}
      </button>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-[14px] h-[14px]"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-[18px] h-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  );
}
