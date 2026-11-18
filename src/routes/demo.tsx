import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, BookOpenCheck, Compass, Layers3, Scale, Sparkles, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AnalyticsCard } from "@/components/analytics/AnalyticsCard";
import { DataStatusChip } from "@/components/analytics/DataStatusChip";
import { EsgLayersPanel } from "@/components/analytics/EsgLayersPanel";
import { ExposureBars } from "@/components/analytics/ExposureBars";
import { KpiTile } from "@/components/analytics/KpiTile";
import { LookThroughTable, shortFundName } from "@/components/analytics/LookThroughTable";
import { PerformanceChart } from "@/components/analytics/PerformanceChart";
import { PerformanceTable } from "@/components/analytics/PerformanceTable";
import { PageHero, PublicPage } from "@/components/layout/PublicPage";
import { Reveal, RevealGroup } from "@/components/motion/Reveal";
import { Button } from "@/components/ui/button";
import { useLang } from "@/hooks/useLang";
import { getDemoPortfolio, getSnapshotFunds } from "@/lib/demo/demo.functions";
import { countryLabel, sectorLabel } from "@/lib/demo/labels";
import { describeEsgLayers } from "@/lib/esg/framework";
import { getObservatoryFund } from "@/lib/esg/v2/observatory.functions";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import { siteUrl, socialMeta } from "@/lib/seo/socialMeta";
import { cn } from "@/lib/utils";

/** Le fonds qui sert d'exemple à l'étape « Explorer » : thématique, Article 8 déclaré. */
const EXPLORE_ISIN = "IE00B1XNHC34";
/** Les deux fonds comparés à l'étape « Comparer » : même univers, filtre ISR ou non. */
const COMPARE_ISINS = ["IE00B4L5Y983", "IE00BDZZTM54"];

export const Route = createFileRoute("/demo")({
  loader: async () => {
    const [portfolio, funds, catalogFund] = await Promise.all([
      getDemoPortfolio(),
      getSnapshotFunds({ data: [EXPLORE_ISIN, ...COMPARE_ISINS] }),
      // La fiche catalogue est facultative : sans base joignable, la démo reste complète.
      getObservatoryFund({ data: EXPLORE_ISIN }).catch(() => null),
    ]);
    return { portfolio, funds, catalogFund: catalogFund?.fund ?? null };
  },
  head: () => ({
    meta: socialMeta({
      title: "Démonstration — Seedow",
      description:
        "Parcours de démonstration : un fonds, un portefeuille de démonstration et leurs expositions réelles, à partir des publications officielles des émetteurs.",
      path: "/demo",
    }),
    links: [{ rel: "canonical", href: siteUrl("/demo") }],
  }),
  component: DemoPage,
});

const STEPS: { id: string; icon: LucideIcon }[] = [
  { id: "discover", icon: Sparkles },
  { id: "explore", icon: Compass },
  { id: "analyze", icon: Layers3 },
  { id: "compare", icon: Scale },
  { id: "understand", icon: BookOpenCheck },
];

function DemoPage() {
  const { t } = useTranslation();
  const { portfolio, funds, catalogFund } = Route.useLoaderData();
  const active = useActiveStep();

  return (
    <PublicPage accent="mint" progress>
      <PageHero
        eyebrow={t("fin.demo.eyebrow")}
        title={t("fin.demo.title")}
        accentTitle={t("fin.demo.title_accent")}
        subtitle={t("fin.demo.subtitle")}
      >
        <p className="mx-auto inline-flex flex-wrap items-center justify-center gap-2 text-body-sm text-ink-2">
          <DataStatusChip status="VERIFIED" />
          <span>{t("fin.demo.legend_verified")}</span>
          <DataStatusChip status="SIMULATED" />
          <span>{t("fin.demo.legend_simulated")}</span>
        </p>
      </PageHero>

      {/* Sommaire collant : l'étape en cours est marquée par la forme (pastille
          pleine) et aria-current, pas seulement par la couleur. */}
      <nav
        aria-label={t("fin.demo.steps_aria")}
        className="sticky top-[76px] z-30 mx-auto mb-6 max-w-[1160px] px-3 md:top-[84px]"
      >
        <ol className="glass scrollbar-hide mx-auto flex w-fit max-w-full gap-1 overflow-x-auto rounded-full p-1.5">
          {STEPS.map((s, i) => {
            const current = active === s.id;
            const Icon = s.icon;
            return (
              <li key={s.id} className="shrink-0">
                <a
                  href={`#${s.id}`}
                  aria-current={current ? "step" : undefined}
                  className={cn(
                    "flex items-center gap-2 rounded-full px-3 py-2 text-label font-bold whitespace-nowrap outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-mint",
                    current ? "bg-ink text-paper" : "text-ink-2 hover:bg-paper-inset hover:text-ink",
                  )}
                >
                  <Icon aria-hidden className="size-4" />
                  <span className="hidden sm:inline">
                    {i + 1}. {t(`fin.demo.step.${s.id}.short`)}
                  </span>
                  <span className="sm:hidden">{i + 1}</span>
                </a>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="mx-auto flex max-w-[1160px] flex-col gap-20 px-5 pb-10 sm:px-7 md:gap-28">
        <StepDiscover />
        <StepExplore fund={funds.find((f) => f.isin === EXPLORE_ISIN) ?? null} catalogFund={catalogFund} />
        <StepAnalyze portfolio={portfolio} />
        <StepCompare funds={COMPARE_ISINS.map((i) => funds.find((f) => f.isin === i)).filter(isDefined)} />
        <StepUnderstand sources={portfolio.sources} />
      </div>
    </PublicPage>
  );
}

function isDefined<T>(x: T | undefined): x is T {
  return x !== undefined;
}

/** Étape visible au milieu de l'écran. */
function useActiveStep(): string {
  const [active, setActive] = useState(STEPS[0].id);
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    STEPS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);
  return active;
}

function StepHeader({ id, index }: { id: string; index: number }) {
  const { t } = useTranslation();
  return (
    <Reveal className="mb-8 max-w-[62ch]">
      <span className="chip chip--accent">
        {t("fin.demo.step_label", { n: index })} · {t(`fin.demo.step.${id}.short`)}
      </span>
      <h2 className="display-lg mt-4">{t(`fin.demo.step.${id}.title`)}</h2>
      <p className="mt-4 text-body-lg leading-relaxed text-ink-2">{t(`fin.demo.step.${id}.desc`)}</p>
    </Reveal>
  );
}

// ── 1. Découvrir ─────────────────────────────────────────────────────────

function StepDiscover() {
  const { t } = useTranslation();
  const pillars = ["rigour", "transparency", "credibility"] as const;
  return (
    <section id="discover" className="scroll-mt-40">
      <StepHeader id="discover" index={1} />
      <RevealGroup className="grid gap-4 md:grid-cols-3">
        {pillars.map((p, i) => (
          <div key={p} className={cn("paper-card spot p-6", ["accent-mint", "accent-ice", "accent-volt"][i])}>
            <span className="chip chip--accent">{t(`fin.demo.pillar.${p}.eyebrow`)}</span>
            <h3 className="mt-4 text-[clamp(19px,2vw,22px)]">{t(`fin.demo.pillar.${p}.title`)}</h3>
            <p className="mt-2 text-body-sm leading-relaxed text-ink-2">{t(`fin.demo.pillar.${p}.desc`)}</p>
          </div>
        ))}
      </RevealGroup>
      <Reveal className="tile-accent accent-solar mt-4 p-5 sm:p-6">
        <p className="text-label font-bold text-ink">{t("fin.demo.is_not_title")}</p>
        <ul className="mt-2 grid gap-1.5 text-body-sm text-ink-2 md:grid-cols-3">
          {(["advice", "execution", "impact"] as const).map((k) => (
            <li key={k} className="flex gap-2">
              <span aria-hidden className="font-bold text-solar-ink">
                ✕
              </span>
              {t(`fin.demo.is_not.${k}`)}
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}

// ── 2. Explorer ──────────────────────────────────────────────────────────

type SnapshotFund = Awaited<ReturnType<typeof getSnapshotFunds>>[number];
type CatalogFund = NonNullable<Awaited<ReturnType<typeof getObservatoryFund>>>["fund"] | null;

function StepExplore({ fund, catalogFund }: { fund: SnapshotFund | null; catalogFund: CatalogFund }) {
  const { t } = useTranslation();
  const { lang } = useLang();
  if (!fund) return null;
  const layers = describeEsgLayers({
    fund: catalogFund,
    issuer: { sfdrDeclared: fund.sfdrDeclared, asOf: fund.navAsOf, source: fund.issuer },
  });
  const short = (d: string | null) =>
    d ? formatDate(d, lang, { day: "numeric", month: "short", year: "numeric" }) : "—";

  return (
    <section id="explore" className="scroll-mt-40">
      <StepHeader id="explore" index={2} />
      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Reveal>
          <AnalyticsCard
            title={fund.name}
            description={t("fin.demo.explore.fund_desc", {
              benchmark: fund.benchmark ?? "—",
              currency: fund.currency ?? "—",
            })}
            aside={<DataStatusChip status={fund.status.performance} detail={short(fund.performance.lastDate)} />}
            methodLabel={t("fin.method.label")}
            method={<PerformanceMethod published={fund.publishedReturns.fund} asOf={fund.publishedReturns.asOf} />}
          >
            <PerformanceChart
              series={fund.chart.fund}
              reference={fund.chart.benchmark}
              seriesLabel={shortFundName(fund.name)}
              referenceLabel={fund.benchmark ?? undefined}
              ariaLabel={t("fin.perf.chart_aria", { name: fund.name })}
            />
            <div className="mt-6">
              <PerformanceTable report={fund.performance} />
            </div>
            <p className="mt-4 text-caption text-ink-3">{t("fin.perf.past_disclaimer")}</p>
          </AnalyticsCard>
        </Reveal>
        <Reveal delay={100} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <KpiTile
              label={t("fin.kpi.ter")}
              value={fund.ter === null ? "—" : formatPercent(fund.ter, lang, 2)}
              hint={t("fin.kpi.ter_hint")}
              status={fund.status.regulatory}
            />
            <KpiTile
              label={t("fin.kpi.energy")}
              value={fund.energySectorPct === null ? "—" : formatPercent(fund.energySectorPct / 100, lang, 1)}
              hint={t("fin.kpi.energy_hint")}
              status={fund.status.exposure}
            />
          </div>
          <AnalyticsCard
            title={t("fin.exposure.sector_title")}
            aside={<DataStatusChip status={fund.status.exposure} detail={short(fund.sectorAsOf)} />}
          >
            <ExposureBars
              rows={fund.sectorExposure}
              formatLabel={(l) => sectorLabel(l, lang)}
              max={7}
              highlight="Energy"
            />
          </AnalyticsCard>
        </Reveal>
      </div>
      <Reveal className="mt-4">
        <AnalyticsCard title={t("fin.esg.layers_title")} description={t("fin.esg.layers_desc")}>
          <EsgLayersPanel layers={layers} />
        </AnalyticsCard>
      </Reveal>
      <div className="mt-6">
        <Button asChild variant="outline">
          <Link to="/fonds/$isin" params={{ isin: fund.isin }}>
            {t("fin.demo.explore.open_fund")} <ArrowRight aria-hidden />
          </Link>
        </Button>
      </div>
    </section>
  );
}

function PerformanceMethod({
  published,
  asOf,
}: {
  published: Partial<Record<string, number>>;
  asOf: string | null;
}) {
  const { t } = useTranslation();
  const { lang } = useLang();
  const keys = ["1y", "3y", "5y"].filter((k) => published[k] !== undefined);
  return (
    <>
      <p>{t("fin.method.performance")}</p>
      {keys.length > 0 && asOf && (
        <p className="mt-2">
          {t("fin.method.cross_check", {
            date: formatDate(asOf, lang, { day: "numeric", month: "long", year: "numeric" }),
            values: keys.map((k) => `${k} ${published[k]} %`).join(" · "),
          })}
        </p>
      )}
    </>
  );
}

// ── 3. Analyser ──────────────────────────────────────────────────────────

type DemoPortfolio = Awaited<ReturnType<typeof getDemoPortfolio>>;

function StepAnalyze({ portfolio }: { portfolio: DemoPortfolio }) {
  const { t } = useTranslation();
  const { lang } = useLang();
  const e = portfolio.exposure;
  const money = (v: number) => formatCurrency(v, lang, portfolio.currency);

  return (
    <section id="analyze" className="scroll-mt-40">
      <StepHeader id="analyze" index={3} />

      {/* Bandeau de démonstration : écrit en toutes lettres, en tête de l'étape. */}
      <Reveal className="mb-4 flex flex-wrap items-center gap-3 rounded-[20px] bg-volt/10 px-5 py-4 ring-1 ring-inset ring-volt/30">
        <DataStatusChip status="SIMULATED" />
        <p className="text-body-sm font-semibold text-ink">{t("fin.demo.analyze.banner")}</p>
      </Reveal>

      <RevealGroup className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile
          label={t("fin.kpi.total")}
          value={money(e.totalValue)}
          status="SIMULATED"
          hint={t("fin.kpi.total_hint", { count: e.positions })}
        />
        <KpiTile
          label={t("fin.kpi.weighted_ter")}
          value={e.fees.weightedTer === null ? "—" : formatPercent(e.fees.weightedTer, lang, 2)}
          status="VERIFIED"
          hint={t("fin.kpi.weighted_ter_hint", {
            cost: e.fees.annualCost === null ? "—" : money(e.fees.annualCost),
            coverage: Math.round(e.fees.coveragePct),
          })}
        />
        <KpiTile
          label={t("fin.kpi.lookthrough")}
          value={formatPercent(e.lookThroughCoveragePct / 100, lang, 0)}
          status="VERIFIED"
          hint={t("fin.kpi.lookthrough_hint")}
        />
        <KpiTile
          label={t("fin.kpi.energy_portfolio")}
          value={formatPercent(e.energy.weightPct / 100, lang, 2)}
          status="VERIFIED"
          hint={t("fin.kpi.energy_portfolio_hint", { coverage: Math.round(e.energy.coveragePct) })}
        />
      </RevealGroup>

      <Reveal className="mt-4">
        <AnalyticsCard title={t("fin.demo.analyze.positions_title")} description={t("fin.demo.analyze.positions_desc")}>
          <div className="-mx-1 overflow-x-auto">
            <table className="w-full min-w-[640px] border-separate border-spacing-x-1 text-left">
              <thead>
                <tr className="text-caption font-semibold text-ink-3">
                  <th scope="col" className="pb-2">{t("fin.table.fund")}</th>
                  <th scope="col" className="pb-2">{t("fin.table.sfdr_declared")}</th>
                  <th scope="col" className="pb-2 text-right">{t("fin.table.amount")}</th>
                  <th scope="col" className="pb-2 text-right">{t("fin.table.weight")}</th>
                  <th scope="col" className="pb-2 text-right">{t("fin.table.ter")}</th>
                  <th scope="col" className="pb-2 text-right">{t("fin.table.ann3y")}</th>
                  <th scope="col" className="pb-2 text-right">{t("fin.table.vol3y")}</th>
                </tr>
              </thead>
              <tbody>
                {portfolio.positions.map((p) => (
                  <tr key={p.isin}>
                    <th scope="row" className="border-t border-paper-3 py-2.5 pr-2 font-normal">
                      <Link
                        to="/fonds/$isin"
                        params={{ isin: p.isin }}
                        className="block text-label font-semibold text-ink hover:underline"
                      >
                        {shortFundName(p.name)}
                      </Link>
                      <span className="mono-meta">{p.isin}</span>
                    </th>
                    <td className="border-t border-paper-3 py-2.5 text-label text-ink-2">
                      {sfdrLabel(p.sfdrDeclared, t)}
                    </td>
                    <Num>{money(p.amount)}</Num>
                    <Num>{formatPercent(p.weightPct / 100, lang, 0)}</Num>
                    <Num>{p.ter === null ? "—" : formatPercent(p.ter, lang, 2)}</Num>
                    <Num tone={p.annualized3y}>
                      {p.annualized3y === null ? "—" : signed(formatPercent(p.annualized3y, lang, 1), p.annualized3y)}
                    </Num>
                    <Num>{p.volatility3y === null ? "—" : formatPercent(p.volatility3y, lang, 1)}</Num>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AnalyticsCard>
      </Reveal>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Reveal>
          <AnalyticsCard
            title={t("fin.exposure.sector_title")}
            description={t("fin.exposure.coverage", { pct: Math.round(e.sector.coveragePct) })}
          >
            <ExposureBars
              rows={e.sector.buckets}
              unclassifiedPct={e.sector.unclassifiedPct}
              formatLabel={(l) => sectorLabel(l, lang)}
              highlight="Energy"
            />
          </AnalyticsCard>
        </Reveal>
        <Reveal delay={80}>
          <AnalyticsCard
            title={t("fin.exposure.geography_title")}
            description={t("fin.exposure.coverage", { pct: Math.round(e.geography.coveragePct) })}
          >
            <ExposureBars
              rows={e.geography.buckets}
              unclassifiedPct={e.geography.unclassifiedPct}
              formatLabel={(l) => countryLabel(l, lang)}
              tone="ice"
            />
          </AnalyticsCard>
        </Reveal>
        <Reveal delay={160}>
          <AnalyticsCard
            title={t("fin.exposure.currency_title")}
            description={t("fin.exposure.currency_desc")}
          >
            <ExposureBars rows={e.currency.buckets} unclassifiedPct={e.currency.unclassifiedPct} tone="volt" />
          </AnalyticsCard>
        </Reveal>
      </div>

      <Reveal className="mt-4">
        <AnalyticsCard
          title={t("fin.lookthrough.title")}
          description={t("fin.lookthrough.desc", {
            total: e.holdingsTotal,
            coverage: Math.round(e.lookThroughCoveragePct),
          })}
          methodLabel={t("fin.method.label")}
          method={<p>{t("fin.method.lookthrough")}</p>}
        >
          <LookThroughTable holdings={e.holdings} currency={portfolio.currency} />
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <MiniStat label={t("fin.kpi.largest_position")} value={formatPercent(e.concentration.largestPositionPct / 100, lang, 0)} />
            <MiniStat label={t("fin.kpi.effective_positions")} value={e.concentration.effectivePositions.toFixed(1)} />
            <MiniStat label={t("fin.kpi.top10")} value={formatPercent(e.concentration.top10UnderlyingPct / 100, lang, 1)} />
          </div>
        </AnalyticsCard>
      </Reveal>

      <Reveal className="mt-4">
        <AnalyticsCard
          title={t("fin.demo.analyze.simulated_title")}
          description={t("fin.demo.analyze.simulated_desc", { currency: portfolio.simulated.seriesCurrency ?? "—" })}
          aside={<DataStatusChip status="SIMULATED" />}
          methodLabel={t("fin.method.label")}
          method={<p>{t("fin.method.blend")}</p>}
        >
          <PerformanceChart
            series={portfolio.simulated.chart}
            seriesLabel={t("fin.demo.analyze.simulated_series")}
            ariaLabel={t("fin.demo.analyze.simulated_title")}
          />
          <div className="mt-6">
            <PerformanceTable report={portfolio.simulated.report} showBenchmark={false} />
          </div>
          <p className="mt-4 text-caption text-ink-3">{t("fin.perf.simulated_disclaimer")}</p>
        </AnalyticsCard>
      </Reveal>
    </section>
  );
}

function Num({ children, tone }: { children: React.ReactNode; tone?: number | null }) {
  return (
    <td
      className={cn(
        "border-t border-paper-3 py-2.5 text-right font-value text-body-sm tabular-nums text-ink",
        tone != null && tone < 0 && "text-alert-ink",
        tone != null && tone > 0 && "text-mint-ink",
      )}
    >
      {children}
    </td>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-paper-2 px-4 py-3">
      <p className="text-caption font-semibold text-ink-3">{label}</p>
      <p className="mt-1 font-value text-body-lg tabular-nums text-ink">{value}</p>
    </div>
  );
}

function signed(text: string, v: number): string {
  return v > 0 ? `+${text}` : text;
}

export function sfdrLabel(declared: string | null, t: (k: string, o?: Record<string, unknown>) => string): string {
  if (!declared) return t("fin.sfdr.unknown");
  const m = /article\s*(8|9|6)/i.exec(declared);
  if (m) return t("fin.sfdr.article", { n: m[1] });
  if (/other/i.test(declared)) return t("fin.sfdr.other");
  return declared;
}

// ── 4. Comparer ──────────────────────────────────────────────────────────

function StepCompare({ funds }: { funds: SnapshotFund[] }) {
  const { t } = useTranslation();
  const { lang } = useLang();
  const pct = (v: number | null, d = 1) => (v === null ? "—" : formatPercent(v, lang, d));
  const w3 = (f: SnapshotFund) => f.performance.windows.find((w) => w.years === 3);
  const rows: { label: string; render: (f: SnapshotFund) => string }[] = [
    { label: t("fin.table.sfdr_declared"), render: (f) => sfdrLabel(f.sfdrDeclared, t) },
    { label: t("fin.table.ter"), render: (f) => pct(f.ter, 2) },
    { label: t("fin.table.holdings"), render: (f) => (f.holdingsCount === null ? "—" : String(f.holdingsCount)) },
    { label: t("fin.kpi.energy"), render: (f) => (f.energySectorPct === null ? "—" : pct(f.energySectorPct / 100)) },
    { label: t("fin.table.ann3y"), render: (f) => pct(w3(f)?.annualizedReturn ?? null) },
    { label: t("fin.table.vol3y"), render: (f) => pct(w3(f)?.annualizedVolatility ?? null) },
    { label: t("fin.perf.max_drawdown"), render: (f) => pct(w3(f)?.maxDrawdown ?? null) },
  ];
  return (
    <section id="compare" className="scroll-mt-40">
      <StepHeader id="compare" index={4} />
      <Reveal>
        <AnalyticsCard title={t("fin.demo.compare.title")} description={t("fin.demo.compare.desc")}>
          <div className="-mx-1 overflow-x-auto">
            <table className="w-full min-w-[520px] border-separate border-spacing-x-1 text-left">
              <thead>
                <tr>
                  <th scope="col" className="pb-3" />
                  {funds.map((f) => (
                    <th key={f.isin} scope="col" className="pb-3 text-right text-label font-bold text-ink">
                      {shortFundName(f.name)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.label}>
                    <th scope="row" className="border-t border-paper-3 py-2.5 pr-2 text-label font-medium text-ink-2">
                      {r.label}
                    </th>
                    {funds.map((f) => (
                      <td key={f.isin} className="border-t border-paper-3 py-2.5 text-right font-value text-body-sm tabular-nums text-ink">
                        {r.render(f)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-caption text-ink-3">{t("fin.demo.compare.note")}</p>
        </AnalyticsCard>
      </Reveal>
      <div className="mt-6">
        <Button asChild>
          <Link to="/comparer">
            {t("fin.demo.compare.open")} <ArrowRight aria-hidden />
          </Link>
        </Button>
      </div>
    </section>
  );
}

// ── 5. Comprendre ────────────────────────────────────────────────────────

function StepUnderstand({ sources }: { sources: DemoPortfolio["sources"] }) {
  const { t } = useTranslation();
  const { lang } = useLang();
  const statuses = ["VERIFIED", "ESTIMATED", "SIMULATED", "STALE", "UNAVAILABLE"] as const;
  return (
    <section id="understand" className="scroll-mt-40">
      <StepHeader id="understand" index={5} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Reveal>
          <AnalyticsCard title={t("fin.demo.understand.statuses_title")}>
            <ul className="flex flex-col gap-3">
              {statuses.map((s) => (
                <li key={s} className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-3">
                  <DataStatusChip status={s} className="w-fit shrink-0" />
                  <span className="text-label leading-relaxed text-ink-2">{t(`fin.status_desc.${s}`)}</span>
                </li>
              ))}
            </ul>
          </AnalyticsCard>
        </Reveal>
        <Reveal delay={100}>
          <AnalyticsCard title={t("fin.demo.understand.limits_title")}>
            <ul className="flex list-disc flex-col gap-2 pl-5 text-label leading-relaxed text-ink-2">
              {(["past", "lookthrough", "esg", "impact", "snapshot"] as const).map((k) => (
                <li key={k}>{t(`fin.demo.understand.limit.${k}`)}</li>
              ))}
            </ul>
          </AnalyticsCard>
        </Reveal>
      </div>
      <Reveal className="mt-4">
        <AnalyticsCard title={t("fin.demo.understand.sources_title")}>
          <ul className="flex flex-col gap-2">
            {sources.map((s) => (
              <li key={s.isin} className="flex flex-col gap-0.5 border-t border-paper-3 pt-2 first:border-t-0 first:pt-0 sm:flex-row sm:items-baseline sm:justify-between">
                <span className="text-label font-semibold text-ink">{s.name}</span>
                <span className="mono-meta">
                  {t("fin.demo.understand.source_line", {
                    asOf: s.navAsOf ? formatDate(s.navAsOf, lang, { day: "numeric", month: "short", year: "numeric" }) : "—",
                    retrieved: formatDate(s.retrievedAt, lang, { day: "numeric", month: "short", year: "numeric" }),
                  })}{" "}
                  ·{" "}
                  <a href={s.sourceUrl} target="_blank" rel="noreferrer noopener" className="underline hover:no-underline">
                    {t("fin.demo.understand.source_link")}
                  </a>
                </span>
              </li>
            ))}
          </ul>
        </AnalyticsCard>
      </Reveal>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/donnees">
            {t("fin.demo.understand.open_data")} <ArrowRight aria-hidden />
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/methodologie">{t("fin.demo.understand.open_method")}</Link>
        </Button>
      </div>
    </section>
  );
}
