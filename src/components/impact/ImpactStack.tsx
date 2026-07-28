import { motion } from "framer-motion";
import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useActivePortfolio } from "@/hooks/useActivePortfolio";
import { usePortfolioValuation } from "@/hooks/usePortfolioValuation";
import { AnimatedFigure } from "@/components/ui/AnimatedFigure";
import { useLang } from "@/hooks/useLang";
import { EASE_REVEAL } from "@/lib/motion";
import { buildPortfolioImpact } from "@/lib/impact/portfolioImpact";
import { buildThemeBreakdown } from "@/lib/impact/themeBreakdown";
import { ACWI_WACI_TCO2E_PER_MUSD, ACWI_WACI_SOURCE, ACWI_WACI_ASOF } from "@/lib/esg/benchmark";
import type { CauseTag } from "@/lib/portfolio/types";

/**
 * ImpactStack — refonte accueil : 3 modules éditoriaux empilés (data-terminal),
 * en tête un bandeau `IMPACT` avec le score ESG global.
 *
 * Aucune valeur inventée : chaque chiffre vient de `buildPortfolioImpact` (déjà
 * en place), du benchmark ACWI sourcé, ou des `cause_exposure` déclarés sur les
 * actifs (part explicite non-classée si absent).
 */
export function ImpactStack() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const { portfolio } = useActivePortfolio();
  const valuation = usePortfolioValuation();
  const numLocale = lang === "en" ? "en-US" : "fr-FR";

  const totalInvested = valuation.totalInvested || portfolio?.initial_amount || 0;

  const impact = useMemo(() => {
    if (!portfolio?.metrics || totalInvested <= 0) return null;
    return buildPortfolioImpact(portfolio.metrics, totalInvested);
  }, [portfolio, totalInvested]);

  const themes = useMemo(
    () => (portfolio?.holdings?.length ? buildThemeBreakdown(portfolio.holdings) : null),
    [portfolio],
  );

  if (!portfolio || !impact) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE_REVEAL }}
      className="px-5 pt-8 space-y-4"
    >
      <SectionHeader esgScore={impact.esgScore} />
      <FootprintModule impact={impact} numLocale={numLocale} t={t} />
      <BenchmarkModule impact={impact} numLocale={numLocale} t={t} />
      {themes && <ThemesModule themes={themes} t={t} />}
    </motion.section>
  );
}

/* ─────────────────────────── Header ─────────────────────────── */

function SectionHeader({ esgScore }: { esgScore: number }) {
  const { t } = useTranslation();
  return (
    <header className="flex items-end justify-between border-b border-paper-3 pb-3">
      <div className="flex items-baseline gap-3">
        <h2 className="font-display text-4xl md:text-5xl font-bold tracking-[-0.03em] text-ink leading-none">
          IMPACT
        </h2>
        <span className="hidden sm:inline text-tag font-mono uppercase tracking-[0.18em] text-ink-3">
          {t("impact_stack.subheading")}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="inline-flex items-baseline gap-1 rounded-full border border-paper-3 bg-paper-2 px-3 py-1 font-mono text-xs font-bold text-ink">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-3">
            ESG
          </span>
          {esgScore.toFixed(0)}
          <span className="text-ink-3">/100</span>
        </span>
        <Link
          to="/methodologie"
          className="text-tag font-mono uppercase tracking-[0.18em] font-semibold text-ink-3 hover:text-ink transition-colors"
        >
          {t("impact_stack.method")} →
        </Link>
      </div>
    </header>
  );
}

/* ─────────────────────────── Module 1 · Empreinte ─────────────────────────── */

function FootprintModule({
  impact,
  numLocale,
  t,
}: {
  impact: NonNullable<ReturnType<typeof buildPortfolioImpact>>;
  numLocale: string;
  t: (k: string, o?: Record<string, unknown>) => string;
}) {
  const kg = impact.financedEmissionsKgPerYear;
  const measured = impact.measured && kg != null;
  const inTonnes = measured && kg >= 1000;
  const value = measured ? (inTonnes ? kg / 1000 : kg) : 0;
  const unit = measured ? (inTonnes ? "t" : "kg") : "";
  const carEquiv = impact.presentation.show
    ? impact.presentation.equivalences.find((e) => e.factorId === "car_km")
    : undefined;

  return (
    <ModuleCard eyebrow={t("impact_stack.mod1_eyebrow")}>
      {measured ? (
        <>
          <div className="kpi-figure flex items-baseline gap-3 text-6xl md:text-7xl leading-none text-ink font-bold">
            <AnimatedFigure
              value={value}
              format={(v) =>
                v.toLocaleString(numLocale, {
                  minimumFractionDigits: inTonnes ? 2 : 0,
                  maximumFractionDigits: inTonnes ? 2 : 0,
                })
              }
            />
            <span className="text-lg md:text-xl font-mono font-semibold tracking-normal text-ink-3">
              {unit} CO₂e/an
            </span>
          </div>
          {carEquiv && (
            <p className="mt-3 font-mono text-xs uppercase tracking-[0.14em] text-ink-2">
              ≈ {Math.round(Math.abs(carEquiv.value)).toLocaleString(numLocale)}{" "}
              {t("impact.equiv.car_km")}
              <span className="text-ink-3">
                {" "}
                · {carEquiv.source} {carEquiv.asOf}
              </span>
            </p>
          )}
          <MetaLine
            items={[
              t("impact_stack.mod1_meta_coverage", {
                pct: Math.round(impact.coverage * 100),
              }),
              t("impact_stack.mod1_meta_method"),
            ]}
          />
        </>
      ) : impact.intensity ? (
        <>
          <div className="kpi-figure flex items-baseline gap-3 text-6xl md:text-7xl leading-none text-ink font-bold">
            <AnimatedFigure
              value={impact.intensity.waci}
              format={(v) => v.toLocaleString(numLocale, { maximumFractionDigits: 0 })}
            />
            <span className="text-lg md:text-xl font-mono font-semibold tracking-normal text-ink-3">
              {t("impact_hero.intensity_unit")}
            </span>
          </div>
          <p className="mt-3 font-mono text-xs uppercase tracking-[0.14em] text-ink-2">
            {t("impact_stack.mod1_intensity_note")}
          </p>
          <MetaLine
            items={[
              t("impact_stack.mod1_meta_coverage", {
                pct: Math.round(impact.intensity.coverage * 100),
              }),
              "WACI · MSCI",
            ]}
          />
        </>
      ) : (
        <EmptyMeasure t={t} />
      )}
    </ModuleCard>
  );
}

/* ─────────────────────────── Module 2 · Benchmark ─────────────────────────── */

function BenchmarkModule({
  impact,
  numLocale,
  t,
}: {
  impact: NonNullable<ReturnType<typeof buildPortfolioImpact>>;
  numLocale: string;
  t: (k: string, o?: Record<string, unknown>) => string;
}) {
  const intensity = impact.intensity;
  if (!intensity) {
    return (
      <ModuleCard eyebrow={t("impact_stack.mod2_eyebrow")}>
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink-3">
          {t("impact_stack.mod2_pending")}
        </p>
      </ModuleCard>
    );
  }

  const yours = intensity.waci;
  const bench = intensity.benchmarkWaci;
  const max = Math.max(yours, bench);
  const yoursPct = max > 0 ? (yours / max) * 100 : 0;
  const benchPct = max > 0 ? (bench / max) * 100 : 0;
  const deltaPct = intensity.vsBenchmarkDeltaPct;
  const cleaner = intensity.cleaner;

  return (
    <ModuleCard eyebrow={t("impact_stack.mod2_eyebrow")}>
      <div className="grid grid-cols-2 gap-4">
        <QuoteCell
          label={t("impact_stack.mod2_yours")}
          value={yours.toLocaleString(numLocale, { maximumFractionDigits: 0 })}
          unit={t("impact_hero.intensity_unit")}
          strong
        />
        <QuoteCell
          label={t("impact_stack.mod2_bench")}
          value={bench.toLocaleString(numLocale, { maximumFractionDigits: 0 })}
          unit={t("impact_hero.intensity_unit")}
        />
      </div>

      <div className="mt-5 space-y-2">
        <BenchBar label={t("impact_stack.mod2_yours")} pct={yoursPct} strong />
        <BenchBar label={t("impact_stack.mod2_bench")} pct={benchPct} />
      </div>

      {deltaPct != null && (
        <div className="mt-5 flex items-center justify-between gap-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.12em] ${
              cleaner ? "bg-mint text-paper" : "bg-alert text-paper"
            }`}
          >
            {cleaner ? "−" : "+"}
            {Math.round(Math.abs(deltaPct) * 100)}%{" "}
            {t(cleaner ? "impact_stack.mod2_verdict_cleaner" : "impact_stack.mod2_verdict_dirtier")}
          </span>
        </div>
      )}
      <MetaLine
        items={[
          `${ACWI_WACI_SOURCE} · ${ACWI_WACI_ASOF}`,
          `REF ${ACWI_WACI_TCO2E_PER_MUSD} tCO₂e/M$`,
        ]}
      />
    </ModuleCard>
  );
}

function QuoteCell({
  label,
  value,
  unit,
  strong = false,
}: {
  label: string;
  value: string;
  unit: string;
  strong?: boolean;
}) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] font-semibold text-ink-3 mb-1">
        {label}
      </p>
      <p
        className={`font-mono font-bold leading-none ${strong ? "text-ink text-4xl md:text-5xl" : "text-ink-2 text-3xl md:text-4xl"}`}
      >
        {value}
      </p>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">{unit}</p>
    </div>
  );
}

function BenchBar({ label, pct, strong = false }: { label: string; pct: number; strong?: boolean }) {
  return (
    <div>
      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mb-1">
        <span>{label}</span>
        <span>{Math.round(pct)}%</span>
      </div>
      <div className="h-1.5 w-full bg-paper-3 rounded-full overflow-hidden">
        <div
          className={`h-full ${strong ? "bg-ink" : "bg-ink-2"}`}
          style={{ width: `${Math.max(2, Math.min(100, pct))}%` }}
        />
      </div>
    </div>
  );
}

/* ─────────────────────────── Module 3 · Thèmes ─────────────────────────── */

function ThemesModule({
  themes,
  t,
}: {
  themes: ReturnType<typeof buildThemeBreakdown>;
  t: (k: string, o?: Record<string, unknown>) => string;
}) {
  const rows = themes.slices.slice(0, 5);
  const rest = themes.slices.slice(5).reduce((s, x) => s + x.pct, 0);
  const max = rows.length > 0 ? rows[0].pct : 1;

  return (
    <ModuleCard eyebrow={t("impact_stack.mod3_eyebrow")}>
      {rows.length === 0 ? (
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink-3">
          {t("impact_stack.mod3_empty")}
        </p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((s) => (
            <ThemeRow
              key={s.cause}
              label={t(`methodo.causes.${s.cause}`)}
              pct={s.pct}
              max={max}
            />
          ))}
          {rest > 0 && (
            <ThemeRow label={t("impact_stack.mod3_others")} pct={rest} max={max} muted />
          )}
          {themes.unclassifiedPct > 0.05 && (
            <ThemeRow
              label={t("impact_stack.mod3_unclassified")}
              pct={themes.unclassifiedPct}
              max={max}
              muted
            />
          )}
        </ul>
      )}
      <MetaLine
        items={[
          t("impact_stack.mod3_meta", { n: themes.holdingsCount }),
          t("impact_stack.mod3_source"),
        ]}
      />
    </ModuleCard>
  );
}

function ThemeRow({
  label,
  pct,
  max,
  muted = false,
}: {
  label: string;
  pct: number;
  max: number;
  muted?: boolean;
}) {
  const w = max > 0 ? (pct / max) * 100 : 0;
  return (
    <li className="grid grid-cols-[110px_1fr_48px] items-center gap-3">
      <span
        className={`font-mono text-[10px] uppercase tracking-[0.14em] font-semibold ${
          muted ? "text-ink-3" : "text-ink-2"
        } truncate`}
      >
        {label}
      </span>
      <div className="h-2 w-full bg-paper-3 rounded-full overflow-hidden">
        <div
          className={`h-full ${muted ? "bg-ink-3" : "bg-ink"}`}
          style={{ width: `${Math.max(1, Math.min(100, w))}%` }}
        />
      </div>
      <span
        className={`text-right font-mono text-xs font-bold ${muted ? "text-ink-3" : "text-ink"} tabular-nums`}
      >
        {pct.toFixed(pct < 10 ? 1 : 0)}%
      </span>
    </li>
  );
}

/* ─────────────────────────── Primitives ─────────────────────────── */

function ModuleCard({
  eyebrow,
  children,
}: {
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <article className="rounded-[14px] border border-paper-3 bg-paper-2 p-5 md:p-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] font-bold text-ink-3 mb-4">
        {eyebrow}
      </p>
      {children}
    </article>
  );
}

function MetaLine({ items }: { items: string[] }) {
  return (
    <p className="mt-4 pt-3 border-t border-paper-3 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 flex flex-wrap gap-x-2">
      {items.map((it, i) => (
        <span key={i}>
          {i > 0 && <span className="mr-2">·</span>}
          {it}
        </span>
      ))}
    </p>
  );
}

function EmptyMeasure({ t }: { t: (k: string) => string }) {
  return (
    <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink-3">
      {t("impact_stack.mod1_pending")}
    </p>
  );
}

// silence les warnings TS d'imports non consommés dans certains chemins
export type __ImpactStackDeps = CauseTag;
