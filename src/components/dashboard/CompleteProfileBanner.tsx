import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

/**
 * Bandeau de « profiling progressif » : invite à compléter le profil quand il
 * manque des informations, sans jamais les demander pendant l'onboarding.
 *
 * Signal d'incomplétude utilisé : aucun nom d'affichage renseigné (inscription
 * par email sans nom). Non bloquant, non sticky — disparaît de lui-même dès que
 * le profil est complété.
 */
export function CompleteProfileBanner() {
  const { t } = useTranslation();
  const { user } = useAuth();
  if (!user) return null;

  const meta = user.user_metadata as { display_name?: string; full_name?: string } | undefined;
  const hasName = Boolean(meta?.display_name?.trim() || meta?.full_name?.trim());
  if (hasName) return null;

  return (
    <div className="px-5 pt-4">
      <div className="rounded-[14px] bg-paper-2 border border-paper-3 p-4 flex items-center gap-3">
        <p className="flex-1 text-body-sm text-ink-2 leading-snug">
          {t("dashboard.complete_profile.text")}
        </p>
        <Button asChild variant="outline-ink" size="sm" className="rounded-full flex-shrink-0">
          <Link to="/profil">{t("dashboard.complete_profile.cta")}</Link>
        </Button>
      </div>
    </div>
  );
}
