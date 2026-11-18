import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DataStatusChip } from "./DataStatusChip";
import { useLang } from "@/hooks/useLang";
import { formatDate } from "@/lib/format";
import type { EsgLayer } from "@/lib/esg/framework";
import { cn } from "@/lib/utils";

/**
 * Les six couches ESG d'un fonds, chacune avec son statut, ce qu'elle dit, et
 * ce qu'elle NE dit PAS. C'est la pièce qui empêche de lire « Article 9 »
 * comme une note, ou une note comme un impact.
 */
export function EsgLayersPanel({
  layers,
  compact = false,
}: {
  layers: EsgLayer[];
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const { lang } = useLang();
  return (
    <ol className={cn("grid gap-3", !compact && "md:grid-cols-2")}>
      {layers.map((layer, i) => (
        <li key={layer.id} className="paper-card-inset flex flex-col gap-2 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-label font-bold text-ink">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-paper font-value text-caption text-ink-2">
                {i + 1}
              </span>
              {t(`fin.esg.layer.${layer.id}.title`)}
            </p>
            <DataStatusChip status={layer.status} />
          </div>
          <p className="text-body-sm font-semibold text-ink">
            {t(`fin.esg.value.${layer.id}.${layer.value}`, { ...(layer.params ?? {}) })}
          </p>
          {layer.conflict && (
            <p className="flex items-start gap-2 rounded-xl bg-solar-tint px-3 py-2 text-label text-solar-ink">
              <AlertTriangle aria-hidden className="mt-0.5 size-4 flex-none" />
              <span>
                {t(`fin.esg.conflict.${layer.conflict.code}`, {
                  ...layer.conflict.params,
                  asOf: layer.conflict.params.asOf
                    ? formatDate(String(layer.conflict.params.asOf), lang, {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "",
                })}
              </span>
            </p>
          )}
          <p className="text-label leading-relaxed text-ink-2">
            <span className="font-semibold text-ink-2">{t("fin.esg.does_not_say")} </span>
            {t(`fin.esg.layer.${layer.id}.not`)}
          </p>
          {(layer.source || layer.asOf) && (
            <p className="mono-meta">
              {[
                layer.source === "catalog" ? t("fin.esg.source_catalog") : layer.source,
                layer.asOf
                  ? formatDate(layer.asOf, lang, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}
