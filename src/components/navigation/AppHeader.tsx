import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { PortfolioSelector } from "@/components/portfolio/PortfolioSelector";
import { AlertsBell } from "@/components/alerts/AlertsBell";
import { Wordmark } from "@/components/brand/Wordmark";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
  /** Libellé de section — rendu en pastille teintée par l'accent de la page. */
  eyebrow?: string;
  /** Titre principal. */
  title: string;
  /** Sous-titre optionnel (légende sous le titre). */
  subtitle?: string;
  /** Conservé pour compatibilité d'appel — le numéro de section n'est plus affiché (DA V4). */
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
 * En-tête de page de l'app — DA V4.
 *
 * — Mobile : la marque et les accès rapides (alertes, profil, réglages).
 * — Puis le bloc titre, identique partout : une pastille de section teintée,
 *   un grand titre en Bricolage Grotesque qui monte à l'arrivée, une légende.
 * — L'accent de la pastille vient de la page (`.accent-*` sur un parent) :
 *   la couleur situe, le libellé reste écrit.
 * — Tutoiement systématique dans les libellés.
 */
export function AppHeader({
  eyebrow,
  title,
  subtitle,
  hideSettings = false,
  showPortfolioSelector = false,
}: AppHeaderProps) {
  const { t } = useTranslation();
  const iconButton = cn(
    "flex h-11 w-11 items-center justify-center rounded-full bg-paper text-ink-2 shadow-card",
    "transition-colors duration-150 hover:bg-paper-inset hover:text-ink active:scale-95",
    "outline-none focus-visible:ring-2 focus-visible:ring-mint",
  );
  return (
    <header className="px-5 pt-5 pb-5 md:pt-6">
      <div className="flex items-center justify-between pb-2 md:hidden">
        <Wordmark to="/le-fil" label={t("rail_nav.seedow_home")} />
        <div className="flex items-center gap-2">
          <AlertsBell />
          <Link
            to="/profil"
            aria-label={t("rail_nav.investor_profile")}
            className={iconButton}
          >
            <ProfileIcon />
          </Link>
          {!hideSettings && (
            <Link to="/reglages" aria-label={t("nav.open_settings")} className={iconButton}>
              <SettingsIcon />
            </Link>
          )}
        </div>
      </div>

      <div className="mt-5 min-w-0 animate-fade-in-up md:mt-2">
        {eyebrow && <span className="chip chip--accent">{eyebrow}</span>}
        <h1 className={cn("text-h1-page text-ink", eyebrow && "mt-3.5")}>{title}</h1>
        {subtitle && (
          <p className="mt-3 max-w-[56ch] text-body-lg leading-relaxed text-ink-2">{subtitle}</p>
        )}
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
      strokeWidth={2}
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
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  );
}
