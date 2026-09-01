import { useTranslation } from "react-i18next";
import type { SectorDisclosure as Disclosure } from "@/lib/esg/v2/observatory";

/**
 * Ce que la documentation du fonds dit des six secteurs évalués.
 *
 * Quatre états, jamais deux. La v1 affichait « ce qu'il ne s'interdit pas » à
 * partir d'une liste d'exclusions stockée par Seedow : un secteur absent de la
 * liste se lisait « non exclu », alors qu'il pouvait signifier « Seedow n'a pas
 * regardé ». Ici, `non vérifié` est écrit comme tel — Seedow assume son trou de
 * collecte plutôt que de le faire porter au fonds.
 *
 * Ce bloc note la PRÉCISION de la déclaration, pas sa sévérité : un fonds qui
 * déclare explicitement ne pas exclure les fossiles est plus transparent qu'un
 * fonds silencieux. C'est contre-intuitif au premier regard, donc c'est écrit.
 */
export function SectorDisclosureList({ sectors }: { sectors: readonly Disclosure[] }) {
  const { t } = useTranslation();
  return (
    <ul className="mt-2.5 flex flex-col">
      {sectors.map((s) => (
        <li
          key={s.sector}
          className="flex items-baseline justify-between gap-3 py-2 border-b border-paper-3"
        >
          <span className="text-body-sm text-ink">
            {t(`sti.sector.${s.sector}`, { defaultValue: s.sector })}
          </span>
          <span className="shrink-0 text-right">
            {/* Jamais la couleur seule : le niveau est toujours écrit (§4). */}
            <span className="text-body-sm text-ink-2">{t(`sti.disclosure.${s.level}`)}</span>
            {s.source_document && (
              <span className="mono-meta block mt-0.5">
                {[s.source_document, s.date].filter(Boolean).join(", ")}
              </span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
