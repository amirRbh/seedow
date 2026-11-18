import { useTranslation } from "react-i18next";
import type { EsgIndicator, PillarCoverage } from "@/lib/esg/framework";
import { DataStatusChip } from "./DataStatusChip";
import { cn } from "@/lib/utils";

/**
 * Couverture des indicateurs E / S / G : combien de cases de la grille sont
 * renseignées, avec quelle confiance — et la liste de ce qui manque. Aucune
 * note composite n'est affichée (docs/scoring-v2.md).
 */
export function EsgCoverage({
  coverage,
  indicators,
}: {
  coverage: PillarCoverage[];
  indicators: EsgIndicator[];
}) {
  const { t } = useTranslation();
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {coverage.map((c) => (
        <div key={c.pillar} className="paper-card-inset p-4 sm:p-5">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-label font-bold text-ink">{t(`fin.esg.pillar.${c.pillar}`)}</p>
            <p className="font-value text-body-sm tabular-nums text-ink">
              {c.available}/{c.total}
            </p>
          </div>
          <div
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-paper-inset"
            role="meter"
            aria-valuemin={0}
            aria-valuemax={c.total}
            aria-valuenow={c.available}
            aria-label={t("fin.esg.coverage_aria", { pillar: t(`fin.esg.pillar.${c.pillar}`) })}
          >
            <div className="h-full rounded-full bg-mint" style={{ width: `${c.coveragePct}%` }} />
          </div>
          <p className="mt-2 text-caption font-semibold text-ink-2">
            {t(`fin.esg.confidence.${c.confidence}`)}
          </p>
          <ul className="mt-3 flex flex-col gap-1.5">
            {indicators
              .filter((i) => i.pillar === c.pillar)
              .map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-2">
                  <span className={cn("text-label", i.status === "UNAVAILABLE" ? "text-ink-3" : "text-ink")}>
                    {t(`fin.esg.indicator.${i.id}`)}
                  </span>
                  {i.status === "UNAVAILABLE" ? (
                    <span className="text-caption text-ink-3">{t("fin.status.UNAVAILABLE")}</span>
                  ) : (
                    <DataStatusChip status={i.status} className="h-6 px-2" />
                  )}
                </li>
              ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
