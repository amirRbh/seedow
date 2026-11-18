import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { AnalyticsCard } from "@/components/analytics/AnalyticsCard";
import { DataStatusChip } from "@/components/analytics/DataStatusChip";
import { ExposureBars } from "@/components/analytics/ExposureBars";
import { LookThroughTable } from "@/components/analytics/LookThroughTable";
import { Skeleton } from "@/components/ui/skeleton";
import type { ActiveHolding } from "@/hooks/useActivePortfolio";
import type { ValuedHolding } from "@/hooks/usePortfolioValuation";
import { useLang } from "@/hooks/useLang";
import { analyzePositionsExposure } from "@/lib/demo/demo.functions";
import { countryLabel, sectorLabel } from "@/lib/demo/labels";
import { formatPercent } from "@/lib/format";

/**
 * « Ce que ton portefeuille détient vraiment » — le moteur look-through appliqué
 * aux positions de l'utilisateur. Les valeurs viennent de la valorisation
 * (cours réels) ; les compositions, des publications de l'émetteur. Un fonds
 * sans composition connue n'est jamais réparti au hasard : il est affiché
 * comme non ventilé, et la couverture est écrite en tête.
 */
export function PortfolioExposurePanel({
  holdings,
  valued,
}: {
  holdings: ActiveHolding[];
  valued: ValuedHolding[];
}) {
  const { t } = useTranslation();
  const { lang } = useLang();
  const run = useServerFn(analyzePositionsExposure);
  const valueById = new Map(valued.map((v) => [v.asset_id, v.currentValue]));
  const positions = holdings
    .map((h) => ({
      id: h.id,
      label: h.name,
      isin: h.isin,
      value: valueById.get(h.id) ?? 0,
      ter: null,
      assetClass: h.category,
    }))
    .filter((p) => p.value > 0);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["portfolio-exposure", positions.map((p) => `${p.id}:${p.value.toFixed(2)}`).join("|")],
    queryFn: () => run({ data: positions }),
    enabled: positions.length > 0,
    staleTime: 5 * 60_000,
  });

  if (positions.length === 0) return null;
  if (isLoading) return <Skeleton className="h-64 w-full rounded-[24px]" />;
  if (isError || !data) {
    return <p className="paper-card p-5 text-body-sm text-ink-2">{t("fin.portfolio.error")}</p>;
  }
  const e = data.exposure;
  const covered = data.matchedPositions.length;

  return (
    <AnalyticsCard
      title={t("fin.portfolio.title")}
      description={t("fin.portfolio.desc", {
        covered,
        total: positions.length,
        pct: formatPercent(e.sector.coveragePct / 100, lang, 0),
      })}
      aside={<DataStatusChip status={covered > 0 ? "VERIFIED" : "UNAVAILABLE"} />}
      methodLabel={t("fin.method.label")}
      method={<p>{t("fin.method.lookthrough")}</p>}
    >
      {covered === 0 ? (
        <p className="rounded-2xl bg-paper-2 p-4 text-body-sm text-ink-2">{t("fin.portfolio.none_covered")}</p>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <p className="mb-3 text-label font-bold text-ink">{t("fin.exposure.sector_title")}</p>
              <ExposureBars
                rows={e.sector.buckets}
                unclassifiedPct={e.sector.unclassifiedPct}
                formatLabel={(l) => sectorLabel(l, lang)}
                highlight="Energy"
                max={6}
              />
            </div>
            <div>
              <p className="mb-3 text-label font-bold text-ink">{t("fin.exposure.geography_title")}</p>
              <ExposureBars
                rows={e.geography.buckets}
                unclassifiedPct={e.geography.unclassifiedPct}
                formatLabel={(l) => countryLabel(l, lang)}
                tone="ice"
                max={6}
              />
            </div>
          </div>
          <LookThroughTable holdings={e.holdings} currency="EUR" limit={8} />
        </div>
      )}
    </AnalyticsCard>
  );
}
