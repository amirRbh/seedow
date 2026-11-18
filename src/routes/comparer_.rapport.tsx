import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Braces, Download, Printer } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Wordmark } from "@/components/brand/Wordmark";
import { DataStatusChip } from "@/components/analytics/DataStatusChip";
import { Button } from "@/components/ui/button";
import { useLang } from "@/hooks/useLang";
import { COVERAGE_FIELDS, effectiveSfdr, fieldPresence } from "@/lib/compare/universe";
import { getComparisonReport } from "@/lib/compare/report.functions";
import { MAX_REPORT, parseReportSelection, topExposures, topWeight } from "@/lib/compare/report";
import { countryLabel, sectorLabel, shortFundName } from "@/lib/demo/labels";
import { describeEsgLayers, euFrameworkApplies } from "@/lib/esg/framework";
import { STI_SECTORS } from "@/lib/esg/v2/sti";
import { formatDate, formatPercent } from "@/lib/format";
import { siteUrl, socialMeta } from "@/lib/seo/socialMeta";
import { cn } from "@/lib/utils";

type ReportData = Awaited<ReturnType<typeof getComparisonReport>>;
type ReportRow = ReportData["rows"][number];

export const Route = createFileRoute("/comparer_/rapport")({
  validateSearch: (search: Record<string, unknown>): { f?: string } => ({
    f: typeof search.f === "string" && search.f.length <= 200 ? search.f : undefined,
  }),
  loaderDeps: ({ search }) => ({ f: search.f }),
  loader: async ({ deps }) => {
    const isins = parseReportSelection(deps.f);
    if (isins.length === 0) return null;
    return getComparisonReport({ data: isins });
  },
  head: () => ({
    meta: [
      ...socialMeta({
        title: "Rapport de comparaison de fonds — Seedow",
        description:
          "Rapport imprimable : identité, cadre réglementaire, frais, performance passée recalculée, expositions, exclusions documentées et sources datées de chaque fonds.",
        path: "/comparer/rapport",
      }),
      // Une sélection de fonds n'a pas vocation à être indexée.
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: siteUrl("/comparer") }],
  }),
  component: ReportPage,
});

/**
 * Rapport institutionnel de comparaison — un document à imprimer ou à
 * enregistrer en PDF, pour un comité d'investissement ou une équipe de
 * sélection de fonds. Il dit la même chose que l'API (`/api/public/v1/compare`)
 * et le CSV, tableau par tableau, avec la source et la date de chaque bloc.
 */
function ReportPage() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const report = Route.useLoaderData();
  const date = (d: string | null | undefined) =>
    d ? formatDate(d, lang, { day: "numeric", month: "long", year: "numeric" }) : "—";

  if (!report || report.rows.length === 0) {
    return (
      <ReportShell>
        <div className="paper-card mx-auto mt-10 max-w-[640px] p-8 text-center">
          <h1 className="text-[clamp(22px,2.6vw,28px)]">{t("fin.report.empty_title")}</h1>
          <p className="mt-3 text-body text-ink-2">
            {t("fin.report.empty_desc", { max: MAX_REPORT })}
          </p>
          <Button asChild className="mt-6">
            <Link to="/comparer">{t("fin.report.back")}</Link>
          </Button>
        </div>
      </ReportShell>
    );
  }

  const rows = report.rows;
  const isins = rows
    .map((r) => r.fund.isin ?? r.fund.snapshot?.isin)
    .filter(Boolean)
    .join(",");
  const apiHref = `/api/public/v1/compare?isins=${isins}`;

  return (
    <ReportShell>
      <div className="mx-auto flex max-w-[1080px] flex-wrap items-center justify-between gap-3 px-5 pt-6 sm:px-7 print:hidden">
        <Button asChild variant="ghost" size="sm">
          <Link to="/comparer" search={{ f: isins }}>
            <ArrowLeft aria-hidden /> {t("fin.report.back")}
          </Link>
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <a href={`${apiHref}&format=csv`} download>
              <Download aria-hidden /> CSV
            </a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href={apiHref} target="_blank" rel="noreferrer">
              <Braces aria-hidden /> JSON
            </a>
          </Button>
          <Button size="sm" onClick={() => window.print()}>
            <Printer aria-hidden /> {t("fin.report.print")}
          </Button>
        </div>
      </div>

      <article className="report-sheet paper-card mx-auto my-6 max-w-[1080px] p-6 sm:p-10 print:my-0 print:max-w-none print:p-0">
        {/* ── En-tête ──────────────────────────────────────────────── */}
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-paper-3 pb-6">
          <div>
            <Wordmark size="sm" />
            <h1 className="mt-4 text-[clamp(24px,3vw,32px)]">{t("fin.report.title")}</h1>
            <p className="mt-1 text-body-sm text-ink-2">
              {rows.map((r) => shortFundName(r.fund.name)).join(" · ")}
            </p>
          </div>
          <dl className="grid gap-x-4 gap-y-1 text-label sm:grid-cols-[auto_auto]">
            <dt className="text-ink-3">{t("fin.report.generated")}</dt>
            <dd className="font-value tabular-nums text-ink">{date(report.generatedAt)}</dd>
            <dt className="text-ink-3">{t("fin.report.snapshot")}</dt>
            <dd className="font-value tabular-nums text-ink">{date(report.snapshotGeneratedAt)}</dd>
            <dt className="text-ink-3">{t("fin.report.funds")}</dt>
            <dd className="font-value tabular-nums text-ink">{rows.length}</dd>
          </dl>
        </header>

        <p className="report-avoid mt-6 rounded-2xl bg-paper-2 p-4 text-label leading-relaxed text-ink-2">
          {t("fin.report.scope")}
        </p>
        {report.notFound.length > 0 && (
          <p className="mt-3 text-label text-solar-ink">
            {t("fin.report.not_found", { isins: report.notFound.join(", ") })}
          </p>
        )}
        {!report.catalogAvailable && (
          <p className="mt-3 text-label text-solar-ink">{t("fin.report.catalog_down")}</p>
        )}

        <IdentityTable rows={rows} />
        <PerformanceSection rows={rows} />
        <ExposureSection rows={rows} />
        <ExclusionsSection rows={rows} />
        <EsgSection rows={rows} />
        <CoverageSection rows={rows} />
        <SourcesSection rows={rows} report={report} />

        <footer className="mt-10 border-t border-paper-3 pt-4 text-caption leading-relaxed text-ink-3">
          {t("fin.report.footer", { url: siteUrl("/comparer") })}
        </footer>
      </article>
    </ReportShell>
  );
}

function ReportShell({ children }: { children: ReactNode }) {
  return (
    <main id="main-content" className="accent-ice min-h-screen bg-paper-2 text-ink print:bg-paper">
      {children}
    </main>
  );
}

// ── Tableaux ─────────────────────────────────────────────────────────────

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="report-avoid mt-10">
      <h2 className="text-[clamp(18px,2vw,21px)]">{title}</h2>
      {note && <p className="mt-1 max-w-[80ch] text-label text-ink-2">{note}</p>}
      <div className="-mx-1 mt-4 overflow-x-auto print:overflow-visible">{children}</div>
    </section>
  );
}

function Grid({
  rows,
  lines,
  caption,
}: {
  rows: ReportRow[];
  lines: { label: string; render: (r: ReportRow) => ReactNode }[];
  caption: string;
}) {
  return (
    <table className="w-full min-w-[560px] border-separate border-spacing-x-1 text-left">
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr>
          <th scope="col" className="w-[26%]" />
          {rows.map((r) => (
            <th
              key={r.fund.id}
              scope="col"
              className="pb-2 text-right align-bottom text-label font-bold leading-snug text-ink"
            >
              {shortFundName(r.fund.name)}
              <span className="mono-meta block font-normal">{r.fund.isin ?? "—"}</span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {lines.map((l) => (
          <tr key={l.label}>
            <th
              scope="row"
              className="border-t border-paper-3 py-2 pr-2 text-label font-medium text-ink-2"
            >
              {l.label}
            </th>
            {rows.map((r) => (
              <td
                key={r.fund.id}
                className="border-t border-paper-3 py-2 text-right font-value text-body-sm tabular-nums text-ink"
              >
                {l.render(r)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function usePct() {
  const { lang } = useLang();
  return (v: number | null | undefined, digits = 1, signed = false) =>
    v == null ? "—" : `${signed && v > 0 ? "+" : ""}${formatPercent(v, lang, digits)}`;
}

function IdentityTable({ rows }: { rows: ReportRow[] }) {
  const { t } = useTranslation();
  const pct = usePct();
  const art = (n: number | null) =>
    n === null
      ? t("fin.sfdr.unknown")
      : n === 6
        ? t("fin.sfdr.other_short")
        : t("fin.sfdr.article", { n });
  return (
    <Section title={t("fin.report.identity_title")}>
      <Grid
        rows={rows}
        caption={t("fin.report.identity_title")}
        lines={[
          { label: t("fin.report.issuer"), render: (r) => r.fund.issuer ?? "—" },
          { label: t("fin.report.domicile"), render: (r) => r.analytics?.domicile ?? "—" },
          { label: t("fin.report.currency"), render: (r) => r.analytics?.currency ?? "—" },
          {
            label: t("fin.report.benchmark"),
            render: (r) => (
              <span className="text-label font-sans">{r.analytics?.benchmark ?? "—"}</span>
            ),
          },
          {
            label: t("fin.report.eu_framework"),
            render: (r) => {
              const eu = euFrameworkApplies(r.fund.isin);
              return eu === null ? "—" : eu ? t("fin.report.yes") : t("fin.report.no_non_eu");
            },
          },
          {
            label: t("fin.compare.row.sfdr"),
            render: (r) =>
              euFrameworkApplies(r.fund.isin) === false && effectiveSfdr(r.fund) === null
                ? t("fin.report.not_applicable")
                : art(effectiveSfdr(r.fund)),
          },
          {
            label: t("fin.compare.row.sfdr_conflict_label"),
            render: (r) =>
              r.fund.sfdrConflict
                ? t("fin.compare.sfdr_conflict", {
                    catalog: r.fund.sfdrCatalog,
                    declared: r.fund.sfdrDeclared,
                  })
                : "—",
          },
          { label: t("fin.table.ter"), render: (r) => pct(r.fund.ter, 2) },
        ]}
      />
    </Section>
  );
}

function PerformanceSection({ rows }: { rows: ReportRow[] }) {
  const { t } = useTranslation();
  const pct = usePct();
  const w = (r: ReportRow, y: number) =>
    r.analytics?.performance.windows.find((x) => x.years === y);
  return (
    <Section title={t("fin.report.performance_title")} note={t("fin.report.performance_note")}>
      <Grid
        rows={rows}
        caption={t("fin.report.performance_title")}
        lines={[
          ...[1, 3, 5].map((y) => ({
            label: t(`fin.compare.row.ann${y}y`),
            render: (r: ReportRow) => {
              const win = w(r, y);
              return win && !win.available
                ? t("fin.perf.not_computable")
                : pct(win?.annualizedReturn, 1, true);
            },
          })),
          {
            label: t("fin.report.published_3y"),
            render: (r) => {
              const v = r.analytics?.publishedReturns.fund["3y"];
              if (v == null) return "—";
              return (
                <span className="inline-flex flex-col items-end">
                  {pct(v / 100, 1, true)}
                  <DateCell d={r.analytics?.publishedReturns.asOf} />
                </span>
              );
            },
          },
          { label: t("fin.compare.row.vol3y"), render: (r) => pct(w(r, 3)?.annualizedVolatility) },
          { label: t("fin.compare.row.mdd5y"), render: (r) => pct(w(r, 5)?.maxDrawdown) },
          {
            label: t("fin.report.excess_3y"),
            render: (r) => pct(w(r, 3)?.excessAnnualizedReturn, 1, true),
          },
          {
            label: t("fin.report.tracking_3y"),
            render: (r) => pct(w(r, 3)?.trackingError, 2),
          },
          {
            label: t("fin.report.frequency"),
            render: (r) =>
              r.analytics ? t(`fin.report.freq.${r.analytics.performance.frequency}`) : "—",
          },
          {
            label: t("fin.report.as_of"),
            render: (r) => <DateCell d={r.analytics?.performance.lastDate} />,
          },
        ]}
      />
    </Section>
  );
}

function ExposureSection({ rows }: { rows: ReportRow[] }) {
  const { t } = useTranslation();
  const { lang } = useLang();
  const pct = usePct();
  const list = (items: { label: string; weightPct: number }[], fmt: (l: string) => string) =>
    items.length === 0 ? (
      "—"
    ) : (
      <span className="flex flex-col items-end gap-0.5 text-label">
        {items.map((i) => (
          <span key={i.label}>
            {fmt(i.label)} <span className="text-ink-2">{pct(i.weightPct / 100)}</span>
          </span>
        ))}
      </span>
    );
  return (
    <Section title={t("fin.report.exposure_title")} note={t("fin.report.exposure_note")}>
      <Grid
        rows={rows}
        caption={t("fin.report.exposure_title")}
        lines={[
          {
            label: t("fin.kpi.energy"),
            render: (r) =>
              r.analytics?.energySectorPct == null ? "—" : pct(r.analytics.energySectorPct / 100),
          },
          {
            label: t("fin.report.top_sectors"),
            render: (r) =>
              list(topExposures(r.analytics?.sectorExposure ?? []), (l) => sectorLabel(l, lang)),
          },
          {
            label: t("fin.report.top_countries"),
            render: (r) =>
              list(topExposures(r.analytics?.geographyExposure ?? []), (l) =>
                countryLabel(l, lang),
              ),
          },
          { label: t("fin.table.holdings"), render: (r) => r.analytics?.holdingsCount ?? "—" },
          {
            label: t("fin.report.top10"),
            render: (r) => {
              const v = topWeight(r.analytics?.topHoldings ?? []);
              return v == null ? "—" : pct(v / 100);
            },
          },
          {
            label: t("fin.report.as_of"),
            render: (r) => <DateCell d={r.analytics?.sectorAsOf} />,
          },
        ]}
      />
    </Section>
  );
}

function ExclusionsSection({ rows }: { rows: ReportRow[] }) {
  const { t } = useTranslation();
  return (
    <Section title={t("fin.report.exclusions_title")} note={t("fin.report.exclusions_note")}>
      <Grid
        rows={rows}
        caption={t("fin.report.exclusions_title")}
        lines={[
          ...STI_SECTORS.map((s) => ({
            label: t(`fin.compare.sector.${s}`),
            render: (r: ReportRow) => {
              const lvl = r.fund.exclusions[s];
              return (
                <span className="text-label font-sans">
                  {lvl ? t(`fin.compare.level.${lvl}`) : "—"}
                </span>
              );
            },
          })),
          {
            label: t("fin.compare.row.transparency"),
            render: (r) =>
              r.fund.stiBlocksEvaluated === null
                ? "—"
                : t("fin.compare.blocks", {
                    n: r.fund.stiBlocksEvaluated,
                    total: r.fund.stiBlocksTotal,
                  }),
          },
        ]}
      />
    </Section>
  );
}

function EsgSection({ rows }: { rows: ReportRow[] }) {
  const { t } = useTranslation();
  return (
    <Section title={t("fin.report.esg_title")} note={t("fin.report.esg_note")}>
      <div className="grid gap-3 md:grid-cols-2 print:grid-cols-2 [&>*]:min-w-0">
        {rows.map((r) => {
          const layers = describeEsgLayers({
            fund: r.catalogFund,
            isin: r.fund.isin,
            thirdParty: r.analytics?.thirdPartyEsg ?? null,
            exportContext: true,
            issuer: r.analytics
              ? {
                  sfdrDeclared: r.analytics.sfdrDeclared,
                  asOf: r.analytics.navAsOf,
                  source: r.analytics.issuer,
                }
              : null,
          });
          return (
            <div key={r.fund.id} className="report-avoid rounded-2xl border border-paper-3 p-4">
              <p className="text-label font-bold text-ink">{shortFundName(r.fund.name)}</p>
              <ol className="mt-2 flex flex-col">
                {layers.map((l) => (
                  <li
                    key={l.id}
                    className="flex items-start justify-between gap-3 border-t border-paper-3 py-1.5 first:border-t-0"
                  >
                    <span className="min-w-0 text-label text-ink-2">
                      <span className="font-semibold text-ink">
                        {t(`fin.esg.layer.${l.id}.title`)}
                      </span>{" "}
                      — {t(`fin.esg.value.${l.id}.${l.value}`, { ...(l.params ?? {}) })}
                    </span>
                    <DataStatusChip status={l.status} className="h-6 flex-none px-2" />
                  </li>
                ))}
              </ol>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

function CoverageSection({ rows }: { rows: ReportRow[] }) {
  const { t } = useTranslation();
  return (
    <Section title={t("fin.report.coverage_title")} note={t("fin.report.coverage_note")}>
      <Grid
        rows={rows}
        caption={t("fin.report.coverage_title")}
        lines={COVERAGE_FIELDS.map((k) => ({
          label: t(`fin.compare.field.${k}`),
          render: (r: ReportRow) => {
            const ok = fieldPresence(r.fund)[k];
            return (
              <span className={cn("text-label font-sans", ok ? "text-ink" : "text-ink-3")}>
                {ok ? t("fin.report.present") : t("fin.status.UNAVAILABLE")}
              </span>
            );
          },
        }))}
      />
    </Section>
  );
}

function SourcesSection({ rows, report }: { rows: ReportRow[]; report: ReportData }) {
  const { t } = useTranslation();
  return (
    <section className="report-avoid mt-10">
      <h2 className="text-[clamp(18px,2vw,21px)]">{t("fin.report.sources_title")}</h2>
      <ol className="mt-3 flex flex-col gap-2">
        {rows.map((r, i) => (
          <li key={r.fund.id} className="text-label leading-relaxed text-ink-2">
            <span className="font-value tabular-nums text-ink-3">[{i + 1}]</span>{" "}
            <span className="font-semibold text-ink">{r.fund.name}</span> —{" "}
            {r.analytics ? (
              <>
                {r.analytics.sourceLabel}, {t("fin.report.retrieved")}{" "}
                <DateCell d={r.analytics.retrievedAt} />.{" "}
                <a
                  href={r.analytics.sourceUrl}
                  className="mono-meta break-all underline hover:no-underline"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {r.analytics.sourceUrl}
                </a>
                {r.analytics.thirdPartyEsg && (
                  <span className="block text-caption text-ink-3">
                    {t("fin.report.msci_not_exported", {
                      provider: r.analytics.thirdPartyEsg.provider,
                      issuer: r.analytics.thirdPartyEsg.publishedBy,
                    })}
                  </span>
                )}
              </>
            ) : (
              t("fin.report.catalog_only")
            )}
          </li>
        ))}
        <li className="text-label leading-relaxed text-ink-2">
          {t("fin.report.catalog_source", {
            state: report.catalogAvailable
              ? t("fin.report.reachable")
              : t("fin.report.unreachable"),
          })}
        </li>
      </ol>
      <h3 className="mt-6 text-body font-bold">{t("fin.report.method_title")}</h3>
      <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-label leading-relaxed text-ink-2">
        <li>{t("fin.report.method_returns")}</li>
        <li>{t("fin.report.method_vol")}</li>
        <li>{t("fin.report.method_status")}</li>
        <li>{t("fin.report.method_limits")}</li>
      </ul>
      <p className="mt-4 text-label font-semibold text-ink">{t("fin.report.disclaimer")}</p>
    </section>
  );
}

function DateCell({ d }: { d: string | null | undefined }) {
  const { lang } = useLang();
  return (
    <span className="mono-meta">
      {d ? formatDate(d, lang, { day: "numeric", month: "short", year: "numeric" }) : "—"}
    </span>
  );
}
