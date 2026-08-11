import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { PortfolioSelector } from "@/components/portfolio/PortfolioSelector";
import { AlertsBell } from "@/components/alerts/AlertsBell";
import { LanguageToggle } from "@/components/LanguageToggle";
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
  /**
   * Conservé pour compatibilité d'appel : le toggle Simple/Expert a quitté le
   * header (allègement mobile façon Trade Republic) et vit dans Réglages.
   */
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
  showPortfolioSelector = false,
}: AppHeaderProps) {
  const { t } = useTranslation();
  return (
    <header className="px-5 pt-6 pb-5">
      <div className="md:hidden flex items-center justify-between border-b border-paper-3 pb-3">
        <Link
          to="/dashboard"
          aria-label={t("rail_nav.seedow_home")}
          className="inline-flex items-center outline-none rounded-sm focus-visible:ring-2 focus-visible:ring-highlight-1"
        >
          <span className="font-value text-lg text-ink tracking-tight">seedow</span>
        </Link>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <AlertsBell />
          <Link
            to="/profil"
            aria-label={t("rail_nav.investor_profile")}
            className={cn(
              "flex items-center justify-center w-11 h-11 rounded-full border border-paper-3 text-ink-2",
              "transition-colors duration-150 hover:text-ink hover:border-ink-3",
              "outline-none focus-visible:ring-2 focus-visible:ring-highlight-1",
            )}
          >
            <ProfileIcon />
          </Link>
          {!hideSettings && (
            <Link
              to="/reglages"
              aria-label={t("nav.open_settings")}
              className={cn(
                "flex items-center justify-center w-11 h-11 rounded-full border border-paper-3 text-ink-2",
                "transition-colors duration-150 hover:text-ink hover:border-ink-3",
                "outline-none focus-visible:ring-2 focus-visible:ring-highlight-1",
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
            <p className="text-tag uppercase tracking-[0.2em] text-ink-3 font-semibold mb-2">
              {eyebrow}
            </p>
          )}
          <h1 className="font-value text-h1-page text-ink truncate">{title}</h1>
          {subtitle && (
            <p className="text-sm text-ink-2 mt-2 max-w-prose leading-snug">{subtitle}</p>
          )}
        </div>
      </div>

      {showPortfolioSelector && (
        <div className="mt-4 md:hidden">
          <PortfolioSelector />
        </div>
      )}
    </header>
  );
}

function ProfileIcon() {
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
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
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
