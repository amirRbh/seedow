import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Search, Settings } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useViewMode } from "@/hooks/useViewMode";
import { PortfolioSelector } from "@/components/portfolio/PortfolioSelector";
import { AlertsBell } from "@/components/alerts/AlertsBell";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface TopBarProps {
  onOpenCommand: () => void;
}

/**
 * Barre supérieure desktop — DA V4 : une pilule de verre flottante, alignée sur
 * le dock. À gauche le portefeuille actif, au centre la recherche (⌘K), à
 * droite le niveau de détail, la langue, les alertes et les réglages.
 * La marque a quitté la barre : elle vit en tête du dock.
 */
export function TopBar({ onOpenCommand }: TopBarProps) {
  const { t } = useTranslation();
  const [isMac, setIsMac] = useState(false);
  useEffect(() => {
    setIsMac(/Mac|iPod|iPhone|iPad/.test(navigator.platform));
  }, []);
  return (
    <header className="glass hidden h-[60px] items-center justify-between gap-3 rounded-full pr-2 pl-4 md:flex">
      <div className="flex min-w-0 items-center gap-3">
        <PortfolioSelector />
      </div>

      <button
        type="button"
        onClick={onOpenCommand}
        className={cn(
          "group hidden h-10 w-full max-w-[340px] items-center gap-2.5 rounded-full bg-paper-2 pr-2 pl-4 lg:inline-flex",
          "text-body-sm text-ink-3 ring-1 ring-inset ring-paper-3 transition-[box-shadow,color] duration-200 hover:text-ink hover:ring-ink-3",
          "outline-none focus-visible:ring-2 focus-visible:ring-mint",
        )}
        aria-label={t("nav.open_command_palette")}
      >
        <Search aria-hidden className="size-4" />
        <span className="font-medium">{t("nav.search")}</span>
        <kbd
          suppressHydrationWarning
          className="ml-auto inline-flex h-6 items-center gap-0.5 rounded-full bg-paper px-2 font-mono text-tag text-ink-3 ring-1 ring-inset ring-paper-3"
        >
          <span suppressHydrationWarning>{isMac ? "⌘" : "Ctrl"}</span>
          <span>K</span>
        </kbd>
      </button>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenCommand}
          aria-label={t("nav.open_command_palette")}
          className="flex h-11 w-11 items-center justify-center rounded-full text-ink-2 outline-none transition-colors hover:bg-paper-inset hover:text-ink focus-visible:ring-2 focus-visible:ring-mint lg:hidden"
        >
          <Search aria-hidden className="size-[18px]" />
        </button>
        <ViewModeToggle />
        <LanguageToggle />
        <AlertsBell />
        <Link
          to="/reglages"
          aria-label={t("nav.open_settings")}
          className={cn(
            "group flex h-11 w-11 items-center justify-center rounded-full text-ink-2",
            "transition-colors duration-200 hover:bg-paper-inset hover:text-ink",
            "outline-none focus-visible:ring-2 focus-visible:ring-mint",
          )}
        >
          <Settings
            aria-hidden
            className="size-[19px] transition-transform duration-500 ease-brand group-hover:rotate-45 motion-reduce:transition-none"
          />
        </Link>
      </div>
    </header>
  );
}

function ViewModeToggle() {
  const { t } = useTranslation();
  const { mode, setMode } = useViewMode();
  const options = [
    { id: "simple", label: t("view_mode.simple"), hint: t("view_mode.simple_hint") },
    { id: "expert", label: t("view_mode.expert"), hint: t("view_mode.expert_hint") },
  ] as const;
  return (
    <div role="group" aria-label={t("view_mode.label")} className="segmented h-9 items-center">
      {options.map((opt) => (
        <Tooltip key={opt.id}>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => setMode(opt.id)}
              aria-pressed={mode === opt.id}
              data-active={mode === opt.id}
              className="outline-none focus-visible:ring-2 focus-visible:ring-mint"
            >
              {opt.label}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{opt.hint}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
