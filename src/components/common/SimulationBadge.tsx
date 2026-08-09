import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface SimulationBadgeProps {
  /** Ajoute la phrase de réassurance sous le badge (contextes clés). */
  withTagline?: boolean;
  /** Centre le bloc (écrans d'aperçu/onboarding). */
  center?: boolean;
  className?: string;
}

/**
 * Statut « simulation » unique et cohérent (analyse UX §01 — P0).
 *
 * Remplace les formulations dispersées (« capital démo », « aperçu · pas encore
 * sauvegardé », « mode démo · capital virtuel »…). Registre volontairement
 * neutre : ne pas engager d'argent réel est rassurant, pas une alerte — d'où
 * les tokens sobres (paper/ink) et un point `ice` (information), jamais `alert`.
 * Le jour où l'investissement réel arrive, ce composant bascule proprement.
 */
export function SimulationBadge({
  withTagline = false,
  center = false,
  className,
}: SimulationBadgeProps) {
  const { t } = useTranslation();
  return (
    <div className={cn(center && "flex flex-col items-center text-center", className)}>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-paper-3 bg-paper-2 px-2.5 py-1 font-mono text-tag uppercase tracking-[0.14em] text-ink-2">
        <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-highlight-1" />
        {t("common.simulation.badge")}
      </span>
      {withTagline && (
        <p className="mt-1.5 text-tag leading-snug text-ink-3">{t("common.simulation.tagline")}</p>
      )}
    </div>
  );
}
