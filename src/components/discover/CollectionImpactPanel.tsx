import { useTranslation } from "react-i18next";
import { useCollectionImpact } from "@/hooks/useCollectionImpact";
import type { Collection } from "@/lib/collections/model";

/**
 * « Ce que fait ton argent » à l'échelle de la COLLECTION (pivot PIU, §9/§10).
 * Agrégation look-through par titre sous-jacent : la vraie exposition, la vraie
 * diversification, et l'OVERLAP — « tes fonds sont-ils les mêmes entreprises ? ».
 * Chaque chiffre porte sa couverture ; « en attente » tant que les compositions
 * ne sont pas ingérées (jamais inventé, §1.3).
 */
function pct(x: number): string {
  return `${x.toFixed(1).replace(".", ",")} %`;
}

function Bar({ label, weightPct, max }: { label: string; weightPct: number; max: number }) {
  const width = max > 0 ? Math.max(2, (weightPct / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="w-28 flex-shrink-0 truncate text-body-sm text-ink" title={label}>
        {label}
      </span>
      <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-paper-2">
        <span
          className="absolute inset-y-0 left-0 rounded-full bg-mint"
          style={{ width: `${width}%` }}
          aria-hidden="true"
        />
      </span>
      <span className="w-14 flex-shrink-0 text-right font-mono text-tag tabular-nums text-ink-2">
        {pct(weightPct)}
      </span>
    </div>
  );
}

export function CollectionImpactPanel({ collection }: { collection: Collection }) {
  const { t } = useTranslation();
  const { impact, loading, hasData } = useCollectionImpact(collection);

  if (loading) {
    return <p className="text-body-sm text-ink-3">{t("common.loading", "Chargement…")}</p>;
  }
  if (!impact || !hasData) {
    return (
      <div className="rounded-xl border border-paper-3 bg-paper p-4">
        <p className="mb-1 font-mono text-tag uppercase tracking-[0.18em] text-ink-3">
          {t("collection_impact.title", "Ce que fait ton argent")}
        </p>
        <p className="text-body-sm text-ink-2 leading-relaxed">
          {t(
            "collection_impact.pending",
            "On agrège la composition réelle de tes fonds dès qu'elle est ingérée. En attendant, on n'affiche aucun chiffre qu'on n'a pas mesuré.",
          )}
        </p>
      </div>
    );
  }

  const coveragePct = impact.coverage * 100;
  const overlapPct = impact.overlap != null ? impact.overlap * 100 : null;

  return (
    <div className="space-y-4">
      {/* Overlap — la question qu'aucun screener ne sait poser. */}
      {overlapPct != null && (
        <div className="rounded-xl border border-paper-3 bg-paper p-4">
          <p className="mb-1.5 font-mono text-tag uppercase tracking-[0.18em] text-ink-3">
            {t("collection_impact.overlap_title", "Recouvrement de tes fonds")}
          </p>
          <p className="text-body-lg font-semibold text-ink leading-snug">
            {t(
              "collection_impact.overlap_headline",
              "Tes fonds partagent {{ov}} de leurs positions.",
              {
                ov: pct(overlapPct),
              },
            )}
          </p>
          <p className="mt-1 text-body-sm text-ink-2 leading-relaxed">
            {t(
              "collection_impact.overlap_explain",
              "Deux fonds peuvent sembler différents et financer les mêmes entreprises. Ici, ton exposition réelle repose sur ~{{eff}} sociétés{{topPart}}.",
              {
                eff: impact.effectiveHoldings != null ? Math.round(impact.effectiveHoldings) : "—",
                topPart:
                  impact.topSecurities[0] != null
                    ? t("collection_impact.top_part", ", dont {{top}} sur une seule", {
                        top: pct(impact.topSecurities[0].weightPct),
                      })
                    : "",
              },
            )}
          </p>
        </div>
      )}

      {/* Titres consolidés (dédup) — « ce que ton argent finance vraiment ». */}
      {impact.topSecurities.length > 0 && (
        <div className="rounded-xl border border-paper-3 bg-paper p-4">
          <p className="mb-2 font-mono text-tag uppercase tracking-[0.18em] text-ink-3">
            {t("collection_impact.top_companies", "Principales entreprises financées")}
          </p>
          <ul className="space-y-1">
            {impact.topSecurities.slice(0, 6).map((s) => (
              <li key={s.key} className="flex items-baseline justify-between gap-3 text-body-sm">
                <span className="truncate text-ink">{s.name}</span>
                <span className="flex-shrink-0 font-mono text-tag tabular-nums text-ink-2">
                  {pct(s.weightPct)}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-caption text-ink-3">
            {t("collection_impact.universe", "{{n}} entreprises sous-jacentes distinctes", {
              n: impact.underlyingCount,
            })}
          </p>
        </div>
      )}

      {/* Répartition sectorielle consolidée. */}
      {impact.sectorBreakdown.length > 0 && (
        <div className="rounded-xl border border-paper-3 bg-paper p-4">
          <p className="mb-2 font-mono text-tag uppercase tracking-[0.18em] text-ink-3">
            {t("collection_impact.sectors", "Secteurs financés")}
          </p>
          <div className="space-y-1.5">
            {impact.sectorBreakdown.slice(0, 5).map((s) => (
              <Bar
                key={s.key}
                label={s.key}
                weightPct={s.weightPct}
                max={impact.sectorBreakdown[0].weightPct}
              />
            ))}
          </div>
        </div>
      )}

      {/* Couverture honnête (§5.4). */}
      <p className="font-mono text-tag text-ink-3">
        {t(
          "collection_impact.coverage",
          "Calculé sur {{cov}} de ta collection · {{cf}}/{{tf}} fonds à composition connue.",
          {
            cov: pct(coveragePct),
            cf: impact.coveredFunds,
            tf: impact.totalFunds,
          },
        )}
      </p>
    </div>
  );
}
