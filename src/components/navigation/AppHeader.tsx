import { Link } from "@tanstack/react-router";
import { useViewMode } from "@/hooks/useViewMode";
import { PortfolioSelector } from "@/components/garden/PortfolioSelector";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
  /** Eyebrow en capitales, tracking large — code de revue éditoriale. */
  eyebrow?: string;
  /** Titre principal (Syne, très grand, letter-spacing serré). */
  title: string;
  /** Sous-titre optionnel (légende sous le titre). */
  subtitle?: string;
  /** Numéro de section facultatif (ex. "01") affiché en filet à gauche du titre. */
  sectionNumber?: string;
  /** Masque le bouton réglages (sur la page réglages elle-même). */
  hideSettings?: boolean;
  /** Masque le toggle Simple/Expert. */
  hideViewToggle?: boolean;
  /** Affiche le sélecteur de portefeuille. */
  showPortfolioSelector?: boolean;
}

/**
 * Header partagé — registre éditorial (revue financière).
 * — Marque "seedow" en texte, identique partout.
 * — Hiérarchie par la typo : eyebrow capitales + grand titre Syne.
 * — Filet 1px sous l'en-tête de marque pour séparer sans carte.
 * — Tutoiement systématique dans les libellés.
 */
export function AppHeader({
  eyebrow,
  title,
  subtitle,
  sectionNumber,
  hideSettings = false,
  hideViewToggle = false,
  showPortfolioSelector = false,
}: AppHeaderProps) {
  return (
    <header className="px-5 pt-6 pb-5">
      <div className="flex items-center justify-between border-b border-paper-3 pb-3">
        <Link
          to="/dashboard"
          aria-label="Seedow — retour à ton portefeuille"
          className="inline-flex items-center outline-none rounded-sm focus-visible:ring-2 focus-visible:ring-moss-1"
        >
          <span className="font-value text-lg text-ink tracking-tight">seedow</span>
        </Link>
        <div className="flex items-center gap-2">
          {!hideViewToggle && <ViewModeToggle />}
          {!hideSettings && (
            <Link
              to="/reglages"
              aria-label="Ouvrir tes réglages"
              className={cn(
                "flex items-center justify-center w-9 h-9 rounded-full border border-paper-3 text-ink-2",
                "transition-colors duration-150 hover:text-ink hover:border-ink-3",
                "outline-none focus-visible:ring-2 focus-visible:ring-moss-1",
              )}
            >
              <SettingsIcon />
            </Link>
          )}
        </div>
      </div>

      <div className="mt-5 flex items-start gap-4">
        {sectionNumber && (
          <span
            aria-hidden="true"
            className="font-value text-xs text-ink-3 tabular-nums tracking-widest pt-2 select-none"
          >
            {sectionNumber.padStart(2, "0")}
          </span>
        )}
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <p className="text-[10px] uppercase tracking-[0.2em] text-ink-3 font-semibold mb-2">
              {eyebrow}
            </p>
          )}
          <h1 className="font-value text-[34px] leading-[1.04] tracking-[-0.02em] text-ink truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-ink-2 mt-2 max-w-prose leading-snug">{subtitle}</p>
          )}
        </div>
      </div>

      {showPortfolioSelector && (
        <div className="mt-4">
          <PortfolioSelector />
        </div>
      )}
    </header>
  );
}

function ViewModeToggle() {
  const { mode, setMode } = useViewMode();
  return (
    <div
      role="group"
      aria-label="Niveau de détail"
      className="inline-flex items-center h-7 rounded-full border border-paper-3 bg-paper overflow-hidden"
    >
      <button
        type="button"
        onClick={() => setMode("simple")}
        aria-pressed={mode === "simple"}
        className={cn(
          "px-2.5 h-7 text-[10px] font-semibold uppercase tracking-[0.16em] transition-colors duration-150",
          "outline-none focus-visible:ring-2 focus-visible:ring-moss-1 focus-visible:ring-inset",
          mode === "simple" ? "bg-ink text-paper" : "text-ink-3 hover:text-ink",
        )}
      >
        Simple
      </button>
      <button
        type="button"
        onClick={() => setMode("expert")}
        aria-pressed={mode === "expert"}
        className={cn(
          "px-2.5 h-7 text-[10px] font-semibold uppercase tracking-[0.16em] transition-colors duration-150 border-l border-paper-3",
          "outline-none focus-visible:ring-2 focus-visible:ring-moss-1 focus-visible:ring-inset",
          mode === "expert" ? "bg-ink text-paper" : "text-ink-3 hover:text-ink",
        )}
      >
        Expert
      </button>
    </div>
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
