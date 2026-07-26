import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { hasGuestSimulation } from "@/lib/beta/guest";

const DISMISS_KEY = "seedow_guest_banner_dismissed";

/**
 * Bandeau « mode invité » : affiché quand l'utilisateur explore sans compte,
 * détecté soit par `?guest=true` (prop `guestParam`), soit par une simulation
 * invité présente dans le navigateur. Sticky en haut, invite à créer un compte
 * pour sauvegarder le portefeuille. Le bouton « Ignorer » masque le bandeau
 * pour la session courante uniquement (aucun dark pattern : réversible au
 * prochain onglet).
 */
export function GuestBanner({ guestParam = false }: { guestParam?: boolean }) {
  // Rendu client-only : localStorage/sessionStorage n'existent pas en SSR.
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    setMounted(true);
    try {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      /* stockage indisponible : on affiche le bandeau */
    }
  }, []);

  const isGuest = guestParam || (mounted && hasGuestSimulation());
  if (!mounted || dismissed || !isGuest) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* no-op */
    }
  };

  return (
    <div
      role="region"
      aria-label={t("dashboard.guest_banner.aria")}
      className="sticky top-0 z-40 bg-paper-2 border-b border-paper-3"
    >
      <div className="max-w-lg mx-auto px-5 py-2.5 flex items-center gap-3">
        <p className="flex-1 text-body-sm text-ink-2 leading-snug">
          {t("dashboard.guest_banner.text")}
        </p>
        <Button asChild variant="accent" size="sm" className="rounded-full flex-shrink-0">
          <Link to="/onboarding" search={{ resume: "guest" }}>
            {t("dashboard.guest_banner.cta")}
          </Link>
        </Button>
        <button
          type="button"
          onClick={dismiss}
          className="flex-shrink-0 text-label text-ink-3 hover:text-ink px-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
        >
          {t("dashboard.guest_banner.dismiss")}
        </button>
      </div>
    </div>
  );
}
