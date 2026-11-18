import { useTranslation } from "react-i18next";
import { AnalyticsCard } from "./AnalyticsCard";
import { DataStatusChip } from "./DataStatusChip";
import { EsgCoverage } from "./EsgCoverage";
import { EsgLayersPanel } from "./EsgLayersPanel";
import { ExposureBars } from "./ExposureBars";
import { PerformanceChart } from "./PerformanceChart";
import { PerformanceTable } from "./PerformanceTable";
import { ThirdPartyEsgCard } from "./ThirdPartyEsgCard";
import { shortFundName } from "@/lib/demo/labels";
import { useLang } from "@/hooks/useLang";
import type { SnapshotFundAnalytics } from "@/lib/demo/demo.functions";
import { countryLabel, sectorLabel } from "@/lib/demo/labels";
import { buildEsgIndicators, describeEsgLayers, pillarCoverage } from "@/lib/esg/framework";
import type { ObservatoryFund } from "@/lib/esg/v2/observatory";
import { formatDate, formatPercent } from "@/lib/format";

/**
 * Le bloc d'analyse d'une fiche fonds : performance recalculée et contrôlée,
 * expositions publiées, principales positions, six couches ESG et couverture
 * des indicateurs. Toutes les valeurs viennent de l'émetteur (instantané daté)
 * ou du catalogue — rien n'est calculé dans ce composant.
 */
export function FundAnalyticsSection({
  snapshot,
  fund,
}: {
  snapshot: SnapshotFundAnalytics | null;
  fund: ObservatoryFund | null;
}) {
  const { t } = useTranslation();
  const { lang } = useLang();
  const short = (d: string | null) =>
    d ? formatDate(d, lang, { day: "numeric", month: "short", year: "numeric" }) : "—";

  const thirdParty = snapshot?.thirdPartyEsg ?? null;
  const layers = describeEsgLayers({
    fund,
    isin: snapshot?.isin ?? fund?.isins[0] ?? null,
    thirdParty,
    issuer: snapshot
      ? { sfdrDeclared: snapshot.sfdrDeclared, asOf: snapshot.navAsOf, source: snapshot.issuer }
      : null,
  });
  const indicators = buildEsgIndicators({
    fund,
    thirdParty,
    energySectorPct: snapshot?.energySectorPct ?? null,
    energyAsOf: snapshot?.sectorAsOf ?? null,
    energySource: snapshot?.issuer ?? null,
  });

  return (
    <div className="mt-8 flex flex-col gap-4">
      {snapshot && (
        <>
          <AnalyticsCard
            title={t("fin.fund.performance_title")}
            description={t("fin.demo.explore.fund_desc", {
              benchmark: snapshot.benchmark ?? "—",
              currency: snapshot.currency ?? "—",
            })}
            aside={
              <DataStatusChip
                status={snapshot.status.performance}
                detail={short(snapshot.performance.lastDate)}
              />
            }
            methodLabel={t("fin.method.label")}
            method={<p>{t("fin.method.performance")}</p>}
          >
            <PerformanceChart
              series={snapshot.chart.fund}
              reference={snapshot.chart.benchmark}
              seriesLabel={shortFundName(snapshot.name)}
              referenceLabel={snapshot.benchmark ?? undefined}
              ariaLabel={t("fin.perf.chart_aria", { name: snapshot.name })}
            />
            <div className="mt-6">
              <PerformanceTable report={snapshot.performance} />
            </div>
            <p className="mt-4 text-caption text-ink-3">{t("fin.perf.past_disclaimer")}</p>
          </AnalyticsCard>

          <div className="grid gap-4 md:grid-cols-2 [&>*]:min-w-0">
            <AnalyticsCard
              title={t("fin.exposure.sector_title")}
              aside={
                <DataStatusChip
                  status={snapshot.status.exposure}
                  detail={short(snapshot.sectorAsOf)}
                />
              }
            >
              <ExposureBars
                rows={snapshot.sectorExposure}
                formatLabel={(l) => sectorLabel(l, lang)}
                highlight="Energy"
              />
            </AnalyticsCard>
            <AnalyticsCard
              title={t("fin.exposure.geography_title")}
              aside={
                snapshot.geographyExposure.length > 0 ? (
                  <DataStatusChip
                    status={snapshot.status.exposure}
                    detail={short(snapshot.geographyAsOf)}
                  />
                ) : (
                  <DataStatusChip status="UNAVAILABLE" />
                )
              }
            >
              {snapshot.geographyExposure.length > 0 ? (
                <ExposureBars
                  rows={snapshot.geographyExposure}
                  formatLabel={(l) => countryLabel(l, lang)}
                  tone="ice"
                />
              ) : (
                <p className="text-body-sm text-ink-2">{t("fin.fund.geography_unpublished")}</p>
              )}
            </AnalyticsCard>
          </div>

          <AnalyticsCard
            title={t("fin.fund.holdings_title")}
            description={t("fin.fund.holdings_desc", {
              lines: snapshot.holdingsLines,
              pct: formatPercent(
                snapshot.topHoldings.reduce((s, h) => s + h.weightPct, 0) / 100,
                lang,
                1,
              ),
            })}
            aside={
              <DataStatusChip
                status={snapshot.status.holdings}
                detail={short(snapshot.holdingsAsOf)}
              />
            }
          >
            <ol className="flex flex-col">
              {snapshot.topHoldings.map((h, i) => (
                <li
                  key={`${h.name}-${i}`}
                  className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-baseline gap-3 border-t border-paper-3 py-2.5 first:border-t-0"
                >
                  <span className="font-value text-caption tabular-nums text-ink-3">{i + 1}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-label font-semibold text-ink">
                      {h.name}
                    </span>
                    <span className="mono-meta">
                      {[h.ticker, h.sector ? sectorLabel(h.sector, lang) : null, h.currency]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  <span className="font-value text-body-sm tabular-nums text-ink">
                    {formatPercent(h.weightPct / 100, lang, 2)}
                  </span>
                </li>
              ))}
            </ol>
            <p className="mono-meta mt-4">
              {snapshot.sourceLabel} ·{" "}
              <a
                href={snapshot.sourceUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="underline hover:no-underline"
              >
                {t("fin.demo.understand.source_link")}
              </a>
            </p>
          </AnalyticsCard>
        </>
      )}

      {thirdParty && <ThirdPartyEsgCard data={thirdParty} />}

      <AnalyticsCard title={t("fin.esg.layers_title")} description={t("fin.esg.layers_desc")}>
        <EsgLayersPanel layers={layers} />
      </AnalyticsCard>

      <AnalyticsCard title={t("fin.fund.coverage_title")} description={t("fin.fund.coverage_desc")}>
        <EsgCoverage coverage={pillarCoverage(indicators)} indicators={indicators} />
      </AnalyticsCard>
    </div>
  );
}
