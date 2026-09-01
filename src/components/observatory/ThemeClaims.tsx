import { useTranslation } from "react-i18next";
import type { ThemeClaim } from "@/lib/esg/v2/theme-claims";

/**
 * Les thèmes, en trois niveaux sourcés — plus aucun pourcentage.
 *
 * « Biodiversité 85 % » sur un ETF cyber était une valeur saisie à la main, non
 * calculée, dont la méthode n'était publiée nulle part. Ce qui la remplace ne
 * ressemble volontairement pas à une mesure : un thème est REVENDIQUÉ (il figure
 * dans la dénomination ou l'objectif d'investissement) ou MENTIONNÉ (il apparaît
 * dans la documentation ESG sans être un objectif). Rien d'autre n'est affiché,
 * parce que Seedow n'attribue aucun thème que le fonds ne revendique pas.
 */
export function ThemeClaims({ themes }: { themes: readonly ThemeClaim[] }) {
  const { t } = useTranslation();

  if (themes.length === 0) {
    return <p className="mt-2.5 text-body-sm text-ink-2 leading-relaxed">{t("themes.none")}</p>;
  }

  return (
    <ul className="mt-2.5 flex flex-col gap-2">
      {themes.map((th) => (
        <li
          key={th.tag}
          className="flex items-baseline justify-between gap-3 py-2 border-b border-paper-3"
        >
          <span className="text-body-sm text-ink">
            {t(`landing.rayon_x.themes_labels.${th.tag}`, { defaultValue: th.tag })}
          </span>
          <span className="shrink-0 text-right">
            <span className="text-body-sm text-ink-2">{t(`themes.level.${th.level}`)}</span>
            {th.source_document && (
              <span className="mono-meta block mt-0.5">{th.source_document}</span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
