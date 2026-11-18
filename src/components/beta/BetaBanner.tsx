import { useTranslation } from "react-i18next";

/**
 * Bandeau permanent affiché en mode démo bêta, sur toutes les routes qui
 * montrent des montants. DA V4 : une pastille centrée plutôt qu'une barre
 * pleine largeur — l'information reste écrite en toutes lettres et toujours
 * visible (CLAUDE.md §1.2), sans manger une ligne d'écran.
 */
export function BetaBanner() {
  const { t } = useTranslation();
  return (
    <div className="flex justify-center px-4 pt-3 md:pt-0">
      <p className="inline-flex max-w-full items-center gap-2 rounded-full bg-solar-tint px-3.5 py-1.5 text-caption text-solar-ink ring-1 ring-inset ring-solar-tint-border">
        <span aria-hidden className="live-dot bg-solar" />
        <span className="shrink-0 font-bold whitespace-nowrap">{t("beta.banner_mode")}</span>
        <span className="truncate">{t("beta.banner_detail")}</span>
      </p>
    </div>
  );
}
