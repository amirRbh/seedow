import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle, Braces, Check, Download, FileText, Plus, Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DataStatusChip } from "@/components/analytics/DataStatusChip";
import { shortFundName } from "@/lib/demo/labels";
import { PageHero, PublicPage } from "@/components/layout/PublicPage";
import { Reveal } from "@/components/motion/Reveal";
import { Button } from "@/components/ui/button";
import { useLang } from "@/hooks/useLang";
import {
  buildUniverse,
  comparisonCsv,
  COVERAGE_FIELDS,
  dataCoveragePct,
  effectiveSfdr,
  fieldPresence,
  screen,
  toSnapshotSide,
  type CompareFund,
  type ScreenFilters,
} from "@/lib/compare/universe";
import { getSnapshotFunds, listSnapshotFunds } from "@/lib/demo/demo.functions";
import { getObservatory } from "@/lib/esg/v2/observatory.functions";
import { STI_SECTORS } from "@/lib/esg/v2/sti";
import { euFrameworkApplies } from "@/lib/esg/framework";
import { formatDate, formatNumber, formatPercent } from "@/lib/format";
import { siteUrl, socialMeta } from "@/lib/seo/socialMeta";
import { cn } from "@/lib/utils";

const MAX_SELECTED = 4;

export const Route = createFileRoute("/comparer")({
  validateSearch: (search: Record<string, unknown>): { f?: string } => ({
    f: typeof search.f === "string" && search.f.length <= 200 ? search.f : undefined,
  }),
  loader: async () => {
    const [catalog, list] = await Promise.all([
      // Sans base joignable, le comparateur fonctionne sur l'instantané seul.
      getObservatory().catch(() => ({ funds: [], stats: null })),
      listSnapshotFunds(),
    ]);
    // L'instantané compte plus de 8 fonds : lecture par lots (limite de la fonction serveur).
    const isins = list.funds.map((f) => f.isin);
    const batches: string[][] = [];
    for (let i = 0; i < isins.length; i += 8) batches.push(isins.slice(i, i + 8));
    const analytics = (await Promise.all(batches.map((data) => getSnapshotFunds({ data })))).flat();
    const snapshots = analytics.map(toSnapshotSide);
    return { universe: buildUniverse(catalog.funds, snapshots), catalogSize: catalog.funds.length };
  },
  head: () => ({
    meta: socialMeta({
      title: "Comparateur de fonds — Seedow",
      description:
        "Filtrer et comparer des fonds sur leurs frais, leur classification SFDR, leurs politiques d'exclusion documentées, leur performance passée et la couverture de leurs données.",
      path: "/comparer",
    }),
    links: [{ rel: "canonical", href: siteUrl("/comparer") }],
  }),
  component: ComparePage,
});

function ComparePage() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const { universe, catalogSize } = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/comparer" });

  const [filters, setFilters] = useState<ScreenFilters>({ sfdr: "all", maxTer: null });
  const selected = useMemo(() => {
    const ids = (search.f ?? "").split(",").filter(Boolean);
    const fromUrl = ids
      .map((id) => universe.find((u) => u.id === id))
      .filter((x): x is CompareFund => !!x);
    if (fromUrl.length > 0) return fromUrl.slice(0, MAX_SELECTED);
    // Par défaut : deux fonds de même univers, avec et sans filtre ISR.
    return ["IE00B4L5Y983", "IE00BDZZTM54"]
      .map((id) => universe.find((u) => u.id === id))
      .filter((x): x is CompareFund => !!x);
  }, [search.f, universe]);

  const setSelected = (next: CompareFund[]) =>
    navigate({
      search: { f: next.map((x) => x.id).join(",") || undefined },
      replace: true,
      resetScroll: false,
    });

  const toggle = (f: CompareFund) => {
    const on = selected.some((s) => s.id === f.id);
    if (on) setSelected(selected.filter((s) => s.id !== f.id));
    else if (selected.length < MAX_SELECTED) setSelected([...selected, f]);
  };

  const results = useMemo(() => screen(universe, filters), [universe, filters]);

  const pct = (v: number | null | undefined, d = 1) =>
    v == null ? "—" : formatPercent(v, lang, d);
  const selectedIsins = selected.map((f) => f.isin).filter((x): x is string => !!x);
  const hasThirdParty = selected.some((f) => f.snapshot?.thirdParty);
  const art = (n: number | null) =>
    n === null
      ? t("fin.sfdr.unknown")
      : n === 6
        ? t("fin.sfdr.other_short")
        : t("fin.sfdr.article", { n });

  const exportCsv = () => {
    const blob = new Blob([comparisonCsv(selected)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "seedow-comparaison.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  type Row = {
    key: string;
    label: string;
    render: (f: CompareFund) => React.ReactNode;
    group?: string;
  };
  const rows: Row[] = [
    {
      key: "sfdr",
      group: t("fin.compare.group.regulatory"),
      label: t("fin.compare.row.sfdr"),
      render: (f) => (
        <span className="inline-flex flex-col items-end gap-1">
          <span>
            {euFrameworkApplies(f.isin) === false && effectiveSfdr(f) === null
              ? t("fin.report.not_applicable")
              : art(effectiveSfdr(f))}
          </span>
          {f.sfdrConflict && (
            <span className="inline-flex items-center gap-1 text-caption font-semibold text-solar-ink">
              <AlertTriangle aria-hidden className="size-3.5" />
              {t("fin.compare.sfdr_conflict", { catalog: f.sfdrCatalog, declared: f.sfdrDeclared })}
            </span>
          )}
        </span>
      ),
    },
    { key: "ter", label: t("fin.table.ter"), render: (f) => pct(f.ter, 2) },
    ...STI_SECTORS.map(
      (s, i): Row => ({
        key: `ex-${s}`,
        group: i === 0 ? t("fin.compare.group.exclusions") : undefined,
        label: t(`fin.compare.sector.${s}`),
        render: (f) => <ExclusionCell level={f.exclusions[s]} />,
      }),
    ),
    {
      key: "sti",
      label: t("fin.compare.row.transparency"),
      render: (f) =>
        f.stiBlocksEvaluated === null
          ? "—"
          : t("fin.compare.blocks", { n: f.stiBlocksEvaluated, total: f.stiBlocksTotal }),
    },
    {
      key: "ann1",
      group: t("fin.compare.group.performance"),
      label: t("fin.compare.row.ann1y"),
      render: (f) => <Signed v={f.snapshot?.annualized[1]} text={pct(f.snapshot?.annualized[1])} />,
    },
    {
      key: "ann3",
      label: t("fin.compare.row.ann3y"),
      render: (f) => <Signed v={f.snapshot?.annualized[3]} text={pct(f.snapshot?.annualized[3])} />,
    },
    {
      key: "ann5",
      label: t("fin.compare.row.ann5y"),
      render: (f) => <Signed v={f.snapshot?.annualized[5]} text={pct(f.snapshot?.annualized[5])} />,
    },
    { key: "vol", label: t("fin.compare.row.vol3y"), render: (f) => pct(f.snapshot?.volatility3y) },
    {
      key: "mdd",
      label: t("fin.compare.row.mdd5y"),
      render: (f) => pct(f.snapshot?.maxDrawdown5y),
    },
    {
      // Les ETF américains s'arrêtent en fin de mois : la date est montrée, pas sous-entendue.
      key: "perf-asof",
      label: t("fin.report.as_of"),
      render: (f) =>
        f.snapshot?.perfAsOf ? (
          <span className="mono-meta">
            {formatDate(f.snapshot.perfAsOf, lang, {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
            {f.snapshot.perfFrequency === "monthly" && ` · ${t("fin.report.freq.monthly")}`}
          </span>
        ) : (
          "—"
        ),
    },
    {
      key: "energy",
      group: t("fin.compare.group.exposure"),
      label: t("fin.kpi.energy"),
      render: (f) =>
        f.snapshot?.energySectorPct == null ? "—" : pct(f.snapshot.energySectorPct / 100),
    },
    {
      key: "holdings",
      label: t("fin.table.holdings"),
      render: (f) => f.snapshot?.holdingsCount ?? "—",
    },
    ...(hasThirdParty
      ? ([
          {
            key: "msci-rating",
            group: t("fin.compare.group.third_party"),
            label: t("fin.esg_data.rating"),
            render: (f) => f.snapshot?.thirdParty?.rating ?? "—",
          },
          {
            key: "msci-waci",
            label: `${t("fin.esg_data.waci")} (${t("fin.esg_data.waci_unit")})`,
            render: (f) =>
              f.snapshot?.thirdParty?.waci == null
                ? "—"
                : formatNumber(f.snapshot.thirdParty.waci, lang, {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  }),
          },
          {
            key: "msci-itr",
            label: t("fin.esg_data.itr"),
            render: (f) => f.snapshot?.thirdParty?.impliedTempRise ?? "—",
          },
          {
            key: "msci-weapons",
            label: t("fin.esg_data.involvement.controversial_weapons"),
            render: (f) => pct(nullablePct(f.snapshot?.thirdParty?.controversialWeapons), 2),
          },
          {
            key: "msci-coal",
            label: t("fin.esg_data.involvement.thermal_coal"),
            render: (f) => pct(nullablePct(f.snapshot?.thirdParty?.thermalCoal), 2),
          },
          {
            key: "msci-ungc",
            label: t("fin.esg_data.involvement.ungc_violators"),
            render: (f) => pct(nullablePct(f.snapshot?.thirdParty?.ungcViolators), 2),
          },
        ] satisfies Row[])
      : []),
    {
      key: "coverage",
      group: t("fin.compare.group.quality"),
      label: t("fin.compare.row.coverage"),
      render: (f) => <CoverageCell fund={f} />,
    },
  ];

  return (
    <PublicPage accent="ice" progress>
      <PageHero
        eyebrow={t("fin.compare.eyebrow")}
        title={t("fin.compare.title")}
        subtitle={t("fin.compare.subtitle")}
      >
        <p className="text-body-sm text-ink-3">
          {t("fin.compare.universe", { catalog: catalogSize, total: universe.length })}
        </p>
      </PageHero>

      <div className="mx-auto flex max-w-[1160px] flex-col gap-6 px-5 pb-10 sm:px-7">
        {/* ── Comparaison ─────────────────────────────────────────── */}
        <Reveal>
          <section className="paper-card p-5 sm:p-7" aria-labelledby="compare-title">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 id="compare-title" className="text-[clamp(20px,2.2vw,24px)]">
                  {t("fin.compare.selected_title", { count: selected.length, max: MAX_SELECTED })}
                </h2>
                <p className="mt-1 max-w-[62ch] text-body-sm text-ink-2">
                  {t("fin.compare.selected_desc")}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportCsv}
                  disabled={selected.length === 0}
                >
                  <Download aria-hidden />
                  {t("fin.compare.export")}
                </Button>
                {selectedIsins.length > 0 && (
                  <>
                    <Button asChild variant="outline" size="sm">
                      <Link to="/comparer/rapport" search={{ f: selectedIsins.join(",") }}>
                        <FileText aria-hidden />
                        {t("fin.compare.report")}
                      </Link>
                    </Button>
                    <Button asChild variant="ghost" size="sm">
                      <a
                        href={`/api/public/v1/compare?isins=${selectedIsins.join(",")}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Braces aria-hidden />
                        {t("fin.compare.api")}
                      </a>
                    </Button>
                  </>
                )}
              </div>
            </div>

            {selected.length === 0 ? (
              <p className="mt-6 rounded-2xl bg-paper-2 p-6 text-center text-body text-ink-2">
                {t("fin.compare.empty")}
              </p>
            ) : (
              <div className="-mx-1 mt-6 overflow-x-auto">
                <table className="w-full min-w-[640px] border-separate border-spacing-x-1 text-left">
                  <caption className="sr-only">{t("fin.compare.table_caption")}</caption>
                  <thead>
                    <tr>
                      <th scope="col" className="w-[30%]" />
                      {selected.map((f) => (
                        <th key={f.id} scope="col" className="pb-3 text-right align-bottom">
                          <span className="flex items-start justify-end gap-1.5">
                            <span className="text-label font-bold leading-snug text-ink">
                              {f.slug ? (
                                <Link
                                  to="/fonds/$isin"
                                  params={{ isin: f.slug }}
                                  className="hover:underline"
                                >
                                  {shortFundName(f.name)}
                                </Link>
                              ) : (
                                shortFundName(f.name)
                              )}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggle(f)}
                              aria-label={t("fin.compare.remove", { name: f.name })}
                              className="flex h-7 w-7 flex-none items-center justify-center rounded-full text-ink-3 outline-none hover:bg-paper-inset hover:text-ink focus-visible:ring-2 focus-visible:ring-mint"
                            >
                              <X aria-hidden className="size-4" />
                            </button>
                          </span>
                          <span className="mono-meta block">{f.isin ?? "—"}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <RowGroup key={r.key} row={r} funds={selected} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {hasThirdParty && (
              <p className="mt-5 text-caption leading-relaxed text-ink-3">
                {t("fin.compare.third_party_note")}
              </p>
            )}
            <p className="mt-3 text-caption leading-relaxed text-ink-3">
              {t("fin.compare.disclaimer")}{" "}
              <Link to="/developpeurs" className="underline hover:no-underline">
                {t("fin.compare.api_docs")}
              </Link>
            </p>
          </section>
        </Reveal>

        {/* ── Filtrage ────────────────────────────────────────────── */}
        <section className="paper-card p-5 sm:p-7" aria-labelledby="screen-title">
          <h2 id="screen-title" className="text-[clamp(20px,2.2vw,24px)]">
            {t("fin.compare.screen_title")}
          </h2>
          <div className="mt-4 grid gap-3 md:grid-cols-[1.4fr_1fr_1fr] [&>*]:min-w-0">
            <label className="relative block">
              <span className="sr-only">{t("fin.compare.search")}</span>
              <Search
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-ink-3"
              />
              <input
                type="search"
                className="field pl-11"
                placeholder={t("fin.compare.search")}
                value={filters.query ?? ""}
                onChange={(e) => setFilters({ ...filters, query: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="sr-only">{t("fin.compare.filter_sfdr")}</span>
              <select
                className="field"
                value={filters.sfdr}
                onChange={(e) =>
                  setFilters({ ...filters, sfdr: e.target.value as ScreenFilters["sfdr"] })
                }
              >
                <option value="all">{t("fin.compare.sfdr_all")}</option>
                <option value="9">{t("fin.sfdr.article", { n: 9 })}</option>
                <option value="8">{t("fin.sfdr.article", { n: 8 })}</option>
                <option value="6">{t("fin.sfdr.other_short")}</option>
                <option value="unknown">{t("fin.sfdr.unknown")}</option>
              </select>
            </label>
            <label className="block">
              <span className="sr-only">{t("fin.compare.filter_ter")}</span>
              <select
                className="field"
                value={filters.maxTer ?? ""}
                onChange={(e) =>
                  setFilters({ ...filters, maxTer: e.target.value ? Number(e.target.value) : null })
                }
              >
                <option value="">{t("fin.compare.ter_all")}</option>
                <option value="0.002">{t("fin.compare.ter_max", { v: "0,20 %" })}</option>
                <option value="0.004">{t("fin.compare.ter_max", { v: "0,40 %" })}</option>
                <option value="0.0075">{t("fin.compare.ter_max", { v: "0,75 %" })}</option>
              </select>
            </label>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <ToggleChip
              on={!!filters.fossilPolicyDocumented}
              onClick={() =>
                setFilters({ ...filters, fossilPolicyDocumented: !filters.fossilPolicyDocumented })
              }
              label={t("fin.compare.filter_fossil")}
            />
            <ToggleChip
              on={!!filters.withPerformance}
              onClick={() => setFilters({ ...filters, withPerformance: !filters.withPerformance })}
              label={t("fin.compare.filter_perf")}
            />
          </div>

          <p className="mt-5 text-label font-semibold text-ink-2" role="status">
            {t("fin.compare.results", { count: results.length })}
          </p>
          <ul className="mt-3 grid gap-2 md:grid-cols-2 [&>*]:min-w-0">
            {results.slice(0, 40).map((f) => {
              const on = selected.some((s) => s.id === f.id);
              const full = !on && selected.length >= MAX_SELECTED;
              return (
                <li key={f.id}>
                  <button
                    type="button"
                    onClick={() => toggle(f)}
                    disabled={full}
                    aria-pressed={on}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left outline-none ring-1 ring-inset transition-[background-color,box-shadow] duration-200 focus-visible:ring-2 focus-visible:ring-mint disabled:cursor-not-allowed disabled:opacity-50",
                      on
                        ? "bg-mint-tint ring-mint"
                        : "bg-paper-2 ring-transparent hover:ring-paper-3",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "flex h-7 w-7 flex-none items-center justify-center rounded-full",
                        on ? "bg-mint text-paper" : "bg-paper text-ink-3",
                      )}
                    >
                      {on ? (
                        <Check className="size-4" strokeWidth={3} />
                      ) : (
                        <Plus className="size-4" strokeWidth={2.5} />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-label font-semibold text-ink">
                        {f.name}
                      </span>
                      <span className="mono-meta block truncate">
                        {[
                          f.isin,
                          art(effectiveSfdr(f)),
                          f.ter === null ? null : `TER ${pct(f.ter, 2)}`,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    {f.snapshot && (
                      <DataStatusChip
                        status="VERIFIED"
                        className="hidden h-6 px-2 sm:inline-flex"
                        detail={t("fin.compare.has_history")}
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          {results.length > 40 && (
            <p className="mt-3 text-caption text-ink-3">
              {t("fin.compare.more_results", { count: results.length - 40 })}
            </p>
          )}
        </section>
      </div>
    </PublicPage>
  );
}

/** Les expositions MSCI sont publiées en % (0,24) : le formateur attend une fraction. */
function nullablePct(v: number | null | undefined): number | null {
  return v == null ? null : v / 100;
}

function RowGroup({
  row,
  funds,
}: {
  row: { key: string; label: string; group?: string; render: (f: CompareFund) => React.ReactNode };
  funds: CompareFund[];
}) {
  return (
    <>
      {row.group && (
        <tr>
          <th
            colSpan={funds.length + 1}
            scope="colgroup"
            className="pt-5 pb-1 text-left text-caption font-bold text-section-accent-ink"
          >
            {row.group}
          </th>
        </tr>
      )}
      <tr>
        <th
          scope="row"
          className="border-t border-paper-3 py-2.5 pr-2 text-label font-medium text-ink-2"
        >
          {row.label}
        </th>
        {funds.map((f) => (
          <td
            key={f.id}
            className="border-t border-paper-3 py-2.5 text-right font-value text-body-sm tabular-nums text-ink"
          >
            {row.render(f)}
          </td>
        ))}
      </tr>
    </>
  );
}

function Signed({ v, text }: { v: number | null | undefined; text: string }) {
  return (
    <span
      className={cn(v != null && v < 0 && "text-alert-ink", v != null && v > 0 && "text-mint-ink")}
    >
      {v != null && v > 0 ? `+${text}` : text}
    </span>
  );
}

function ExclusionCell({ level }: { level: string | undefined }) {
  const { t } = useTranslation();
  if (!level || level === "non_verifie")
    return (
      <span className="font-sans text-caption text-ink-3">
        {t("fin.compare.level.non_verifie")}
      </span>
    );
  return (
    <span
      className={cn(
        "font-sans text-caption font-semibold",
        level === "non_exclu_documente" ? "text-alert-ink" : "text-mint-ink",
      )}
    >
      {t(`fin.compare.level.${level}`)}
    </span>
  );
}

function CoverageCell({ fund }: { fund: CompareFund }) {
  const { t } = useTranslation();
  const p = fieldPresence(fund);
  const pct = dataCoveragePct(fund);
  const missing = COVERAGE_FIELDS.filter((k) => !p[k]);
  return (
    <span className="inline-flex w-full flex-col items-end gap-1">
      <span>
        {Math.round(pct)} %{" "}
        <span className="font-sans text-caption text-ink-3">
          ({COVERAGE_FIELDS.length - missing.length}/{COVERAGE_FIELDS.length})
        </span>
      </span>
      <span aria-hidden className="h-1.5 w-24 overflow-hidden rounded-full bg-paper-inset">
        <span className="block h-full rounded-full bg-mint" style={{ width: `${pct}%` }} />
      </span>
      {missing.length > 0 && (
        <span className="max-w-[16rem] text-right font-sans text-caption text-ink-3">
          {t("fin.compare.missing")} : {missing.map((m) => t(`fin.compare.field.${m}`)).join(", ")}
        </span>
      )}
    </span>
  );
}

function ToggleChip({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className="flow-pill">
      {on ? (
        <Check aria-hidden className="size-4" strokeWidth={2.5} />
      ) : (
        <Plus aria-hidden className="size-4" strokeWidth={2.5} />
      )}
      {label}
    </button>
  );
}
