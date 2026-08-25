import { useMemo } from "react";
import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useActivePortfolio, type ActiveHolding } from "@/hooks/useActivePortfolio";
import type { ExclusionTag } from "@/lib/discover/types";
import { usePortfolioValuation } from "@/hooks/usePortfolioValuation";
import { useViewMode } from "@/hooks/useViewMode";
import { usePortfolioAnalysis } from "@/hooks/usePortfolioAnalysis";
import { WatchPoints } from "@/components/portfolio/WatchPoints";
import { useLang } from "@/hooks/useLang";
import { EASE_REVEAL } from "@/lib/motion";
import { buildThemeBreakdown } from "@/lib/impact/themeBreakdown";
import { buildPortfolioImpact } from "@/lib/impact/portfolioImpact";
import { buildImpactFeed } from "@/lib/impact/leFil";
import {
  buildConvictions,
  type Conviction,
  type ConvictionTier,
  type ConvictionsModel,
} from "@/lib/impact/narrative";
import type {
  PortfolioImpactView,
  PortfolioIntensityView,
  CarbonEstimateView,
} from "@/lib/impact/portfolioImpact";
import { ACWI_WACI_SOURCE, ACWI_WACI_ASOF } from "@/lib/esg/benchmark";
import { LeFil } from "@/components/impact/LeFil";
import { ClimateLeverCard } from "@/components/impact/ClimateLeverCard";
import type { LeverHolding } from "@/lib/impact/lever";
import { SignalLine } from "@/components/impact/shared";
import { PortfolioMetricsCard } from "@/components/portfolio/PortfolioMetricsCard";
import { ImpactCertificate } from "@/components/portfolio/ImpactCertificate";
import { ExplainerCard } from "@/components/ui/ExplainerCard";

/**
 * ImpactExperience — la refonte complète de l'onglet Impact du portefeuille.
 *
 * Ce n'est plus un tableau de bord ESG : c'est un récit qui répond à une seule
 * promesse — « ton argent n'est pas juste placé, il agit quelque part dans le
 * monde, et tu peux voir précisément comment ». L'ordre raconte l'histoire :
 *   1. Manifeste       — ce que ton argent fait, en toutes lettres.
 *   2. Convictions     — OÙ il agit, thème par thème, avec la vitalité réelle.
 *   3. Vs le monde     — la différence mesurée face à un ETF Monde sourcé.
 *   4. Rendu tangible  — l'empreinte carbone traduite (ou l'état honnête « en cours »).
 *   5. Ce qu'il finance — les entreprises réelles, ancrées géographiquement.
 *   6. Le fil          — la story datée et sourcée de ton impact.
 *   7. La preuve       — chiffres bruts, sources et méthode : repliés, jamais cachés.
 *
 * Aucun chiffre fabriqué (CLAUDE.md §1.2, §5.4). Tout vient de la composition réelle
 * du portefeuille et des modules honnêtes (portfolioImpact, themeBreakdown, narrative).
 */
export function ImpactExperience() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const { isSimple } = useViewMode();
  const { portfolio } = useActivePortfolio();
  const valuation = usePortfolioValuation();
  // « Ce à quoi ton argent reste exposé » : la page ne montrait que ce qu'il
  // favorise. Une page d'impact qui n'énonce que le positif se lit comme une
  // brochure — et Seedow perd exactement ce qui le rend croyable.
  const { analysis } = usePortfolioAnalysis({
    weights: Object.fromEntries(
      (portfolio?.holdings ?? []).map((h) => [h.id, (h.allocationPct ?? 0) / 100]),
    ),
    causes: portfolio?.causes ?? [],
    exclusions: portfolio?.exclusions ?? [],
    horizonYears: portfolio?.horizon_years ?? null,
  });
  const numLocale = lang === "en" ? "en-US" : "fr-FR";

  const model = useMemo(() => {
    if (!portfolio) return null;
    const holdings = portfolio.holdings ?? [];
    const breakdown = buildThemeBreakdown(holdings);
    const convictions = buildConvictions(holdings, breakdown);
    const invested = valuation.totalInvested || portfolio.initial_amount || 0;
    const impact = portfolio.metrics
      ? buildPortfolioImpact(portfolio.metrics, invested)
      : buildPortfolioImpact(
          { carbon_intensity_gco2e_per_eur: null, carbon_intensity_coverage: 0, esg_score: 0 },
          invested,
        );
    const dispatches = buildImpactFeed({
      portfolioId: portfolio.id,
      generatedAt: portfolio.generated_at,
      now: new Date(),
      holdingsCount: holdings.length,
      breakdown,
      impact,
      benchmarkSource: ACWI_WACI_SOURCE,
      benchmarkAsOf: ACWI_WACI_ASOF,
    });
    return { holdings, convictions, impact, dispatches };
  }, [portfolio, valuation.totalInvested]);

  if (!portfolio || !model) return null;

  const { holdings, convictions, impact, dispatches } = model;
  const germinating = holdings.length === 0;
  const generatedAt = portfolio.generated_at;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE_REVEAL }}
      className="space-y-8"
      aria-label={t("impact_xp.title")}
    >
      <Manifesto
        companies={holdings.length}
        convictions={convictions}
        impact={impact}
        generatedAt={generatedAt}
        germinating={germinating}
        numLocale={numLocale}
      />

      {!germinating && (
        <>
          <ConvictionsSection model={convictions} />
          <VsWorldSection intensity={impact.intensity} />
          <ClimateLeverCard
            currentWaci={portfolio.metrics?.waci_tco2e_per_musd_sales ?? null}
            waciCoverage={portfolio.metrics?.waci_coverage ?? 0}
            currentVolatility={portfolio.metrics?.volatility ?? null}
            holdings={holdings.map(
              (h): LeverHolding => ({
                weight: h.allocationPct / 100,
                // Le WACI/volatilité par ligne ne sont pas encore exposés par
                // useActivePortfolio : le levier restera masqué tant que ces
                // données réelles ne remontent pas (aucune valeur inventée).
                waci: null,
                volatility: null,
              }),
            )}
            numLocale={numLocale}
          />
          <TangibleSection impact={impact} numLocale={numLocale} />
          <HoldingsSection holdings={holdings} numLocale={numLocale} />
          <ExclusionsSection exclusions={portfolio.exclusions} />

          <div className="space-y-3">
            <SectionHeading
              n="07"
              title={t("impact_xp.fil.title")}
              subtitle={t("impact_xp.fil.subtitle")}
            />
            <LeFil dispatches={dispatches} />
          </div>
        </>
      )}

      {/* La preuve — chiffres bruts, sources, méthode. Repliés, jamais cachés. */}
      <ProofSection metrics={portfolio.metrics} isSimple={isSimple} />
    </motion.section>
  );
}

/* ───────────────────────── 1. Manifeste ───────────────────────── */

function Manifesto({
  companies,
  convictions,
  impact,
  generatedAt,
  germinating,
  numLocale,
}: {
  companies: number;
  convictions: ConvictionsModel;
  impact: PortfolioImpactView;
  generatedAt: string;
  germinating: boolean;
  numLocale: string;
}) {
  const { t } = useTranslation();
  const { lang } = useLang();
  const locale = lang === "en" ? "en-US" : "fr-FR";
  const since = useMemo(() => {
    const d = new Date(generatedAt);
    return Number.isNaN(d.getTime())
      ? null
      : d.toLocaleDateString(locale, { month: "long", year: "numeric" });
  }, [generatedAt, locale]);

  return (
    <article className="relative overflow-hidden rounded-3xl border border-paper-3 bg-ink p-6 md:p-8">
      {/* Aura vivante — décorative, respecte prefers-reduced-motion via l'anim CSS `breathe`. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-mint/25 blur-3xl motion-safe:animate-breathe"
      />
      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-mint" />
            </span>
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-paper/60">
              {t("impact_xp.eyebrow")}
            </span>
          </span>
          <Link
            to="/methodologie"
            className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-paper/50 transition-colors hover:text-paper"
          >
            {t("impact_xp.how_it_works")}
          </Link>
        </div>

        <h2 className="mt-6 max-w-md text-balance text-3xl font-semibold leading-[1.05] tracking-[-0.02em] text-paper md:text-4xl">
          {germinating ? t("impact_xp.manifesto.germination") : t("impact_xp.manifesto.headline")}
        </h2>

        {germinating ? (
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-paper/70">
            {t("impact_xp.manifesto.germination_sub")}
          </p>
        ) : (
          <>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-paper/70">
              {t("impact_xp.manifesto.sub", {
                companies: t("impact_common.companies", { count: companies }),
                convictions: t("impact_common.convictions", { count: convictions.themesCount }),
              })}
              {since ? ` · ${t("impact_xp.manifesto.since", { date: since })}` : ""}
            </p>

            {/* Le signal le plus porteur de sens, sur fond sombre. */}
            <div className="ink-section mt-6 rounded-2xl bg-paper/5 p-4">
              <div className="[&_p]:!text-paper [&_.text-ink]:!text-paper [&_.text-ink-3]:!text-paper/50">
                <SignalLine impact={impact} numLocale={numLocale} />
              </div>
            </div>
          </>
        )}
      </div>
    </article>
  );
}

/* ──────────────────────── 2. Convictions ──────────────────────── */

const TIER_STYLE: Record<ConvictionTier, { bar: string; dot: string }> = {
  solid: { bar: "bg-mint", dot: "bg-mint" },
  growing: { bar: "bg-mint/60", dot: "bg-mint/60" },
  watch: { bar: "bg-solar", dot: "bg-solar" },
  unknown: { bar: "bg-ink-3/50", dot: "bg-ink-3/50" },
};

function ConvictionsSection({ model }: { model: ConvictionsModel }) {
  const { t } = useTranslation();
  if (model.convictions.length === 0 && model.unclassifiedPct <= 0) return null;
  const maxPct = Math.max(...model.convictions.map((c) => c.pct), model.unclassifiedPct, 1);

  return (
    <div className="space-y-4">
      <SectionHeading
        n="02"
        title={t("impact_xp.convictions.title")}
        subtitle={t("impact_xp.convictions.subtitle")}
      />
      <div className="rounded-3xl border border-paper-3 bg-paper p-5 md:p-6">
        <ul className="space-y-4">
          {model.convictions.map((c, i) => (
            <ConvictionRow key={c.cause} c={c} maxPct={maxPct} index={i} />
          ))}
          {model.unclassifiedPct > 0.5 && (
            <UnclassifiedRow
              pct={model.unclassifiedPct}
              maxPct={maxPct}
              index={model.convictions.length}
            />
          )}
        </ul>
      </div>
    </div>
  );
}

function ConvictionRow({ c, maxPct, index }: { c: Conviction; maxPct: number; index: number }) {
  const { t } = useTranslation();
  const style = TIER_STYLE[c.tier];
  const width = `${Math.max(4, Math.min(100, (c.pct / maxPct) * 100))}%`;

  return (
    <li>
      <div className="flex items-baseline justify-between gap-3">
        <span className="flex items-center gap-2 truncate">
          <span className="text-[15px] font-medium tracking-[-0.01em] text-ink">
            {t(`impact_living.cause.${c.cause}`)}
          </span>
          <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
            <span className={`block h-1.5 w-1.5 rounded-full ${style.dot}`} aria-hidden />
            {t(`impact_xp.tier.${c.tier}`)}
          </span>
        </span>
        <span className="font-mono text-sm font-semibold tabular-nums text-ink">
          {Math.round(c.pct)}%
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-paper-2">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.7, delay: 0.05 * index, ease: EASE_REVEAL }}
          className={`h-full rounded-full ${style.bar}`}
        />
      </div>
    </li>
  );
}

function UnclassifiedRow({ pct, maxPct, index }: { pct: number; maxPct: number; index: number }) {
  const { t } = useTranslation();
  const width = `${Math.max(4, Math.min(100, (pct / maxPct) * 100))}%`;
  return (
    <li>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[15px] font-medium tracking-[-0.01em] text-ink-2">
          {t("impact_xp.convictions.unclassified")}
        </span>
        <span className="font-mono text-sm font-semibold tabular-nums text-ink-2">
          {Math.round(pct)}%
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-paper-2">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.7, delay: 0.05 * index, ease: EASE_REVEAL }}
          className="h-full rounded-full bg-paper-3"
        />
      </div>
      <p className="mt-1.5 text-caption leading-snug text-ink-3">
        {t("impact_xp.convictions.unclassified_note")}
      </p>
    </li>
  );
}

/* ──────────────────────── 3. Vs le monde ──────────────────────── */

function VsWorldSection({ intensity }: { intensity: PortfolioIntensityView | null }) {
  const { t } = useTranslation();
  const { lang } = useLang();
  const locale = lang === "en" ? "en-US" : "fr-FR";
  const fmt = (v: number) => v.toLocaleString(locale, { maximumFractionDigits: 0 });

  const hasDelta = intensity != null && intensity.vsBenchmarkDeltaPct != null;

  return (
    <div className="space-y-4">
      <SectionHeading
        n="03"
        title={t("impact_xp.vs_world.title")}
        subtitle={t("impact_xp.vs_world.subtitle")}
      />
      <div className="rounded-3xl border border-paper-3 bg-paper p-5 md:p-6">
        {hasDelta ? (
          <VsWorldBars intensity={intensity} fmt={fmt} />
        ) : (
          <p className="text-body-sm leading-relaxed text-ink-2">
            {t("impact_xp.vs_world.pending")}
          </p>
        )}
      </div>
    </div>
  );
}

function VsWorldBars({
  intensity,
  fmt,
}: {
  intensity: PortfolioIntensityView;
  fmt: (v: number) => string;
}) {
  const { t } = useTranslation();
  const cleaner = intensity.cleaner;
  const pct = Math.round(Math.abs(intensity.vsBenchmarkDeltaPct ?? 0) * 100);
  const max = Math.max(intensity.waci, intensity.benchmarkWaci, 1);

  return (
    <div className="space-y-5">
      <p className="text-body-lg leading-snug text-ink">
        <span className={`font-semibold ${cleaner ? "text-mint-ink" : "text-solar-ink"}`}>
          {pct}%
        </span>{" "}
        {t(cleaner ? "impact_xp.vs_world.cleaner" : "impact_xp.vs_world.dirtier")}
      </p>
      <div className="space-y-3">
        <IntensityBar
          label={t("impact_xp.vs_world.you")}
          value={intensity.waci}
          max={max}
          tone={cleaner ? "mint" : "solar"}
          fmt={fmt}
        />
        <IntensityBar
          label={t("impact_xp.vs_world.benchmark")}
          value={intensity.benchmarkWaci}
          max={max}
          tone="ink"
          fmt={fmt}
        />
      </div>
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
        {t("impact_xp.vs_world.unit")} · {t("impact_signal.source_prefix")} {ACWI_WACI_SOURCE} ·{" "}
        {ACWI_WACI_ASOF} · {t("impact_xp.coverage", { pct: Math.round(intensity.coverage * 100) })}
      </p>
    </div>
  );
}

function IntensityBar({
  label,
  value,
  max,
  tone,
  fmt,
}: {
  label: string;
  value: number;
  max: number;
  tone: "mint" | "solar" | "ink";
  fmt: (v: number) => string;
}) {
  const width = `${Math.max(2, Math.min(100, (value / max) * 100))}%`;
  const bg = tone === "mint" ? "bg-mint" : tone === "solar" ? "bg-solar" : "bg-ink";
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-caption text-ink-2">{label}</span>
        <span className="font-mono text-caption tabular-nums text-ink">{fmt(value)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-paper-2">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.7, ease: EASE_REVEAL }}
          className={`h-full rounded-full ${bg}`}
        />
      </div>
    </div>
  );
}

/* ──────────────────────── 4. Rendu tangible ──────────────────────── */

function TangibleSection({
  impact,
  numLocale,
}: {
  impact: PortfolioImpactView;
  numLocale: string;
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <SectionHeading
        n="04"
        title={t("impact_xp.tangible.title")}
        subtitle={t("impact_xp.tangible.subtitle")}
      />
      <div className="rounded-3xl border border-paper-3 bg-paper p-5 md:p-6">
        {impact.estimate ? (
          <TangibleEstimate estimate={impact.estimate} numLocale={numLocale} />
        ) : (
          <div className="space-y-3">
            <p className="text-body-sm leading-relaxed text-ink-2">
              {t("impact_xp.tangible.pending")}
            </p>
            <p className="text-body-sm text-ink-2">
              {t("impact_xp.tangible.esg_fallback", { score: Math.round(impact.esgScore) })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Rendu de la carte carbone — mesurée OU estimée, toujours étiquetée. Ne montre
 * jamais une fausse précision (impact.estimate est déjà arrondi, cf.
 * carbon-engine.ts::roundSignificant) et affiche systématiquement la part
 * directement sourcée, pour que « mesuré » et « estimé » restent visuellement
 * distincts (CLAUDE.md §5.4 / consigne produit : jamais une estimation
 * présentée comme une mesure).
 */
function TangibleEstimate({
  estimate,
  numLocale,
}: {
  estimate: CarbonEstimateView;
  numLocale: string;
}) {
  const { t } = useTranslation();
  const inTonnes = estimate.kgCo2ePerYear >= 1000;
  const footprint = inTonnes ? estimate.kgCo2ePerYear / 1000 : estimate.kgCo2ePerYear;
  const unit = inTonnes ? "t" : "kg";
  const fmt = (v: number) =>
    v.toLocaleString(numLocale, {
      maximumFractionDigits: inTonnes ? 2 : 0,
    });
  const fullySourced = estimate.dataQuality === "measured" && estimate.sourcedPct === 100;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-caption uppercase tracking-wider text-ink-3">
          {fullySourced
            ? t("impact_xp.tangible.footprint_label_measured")
            : t("impact_xp.tangible.footprint_label_estimated")}
        </p>
        <p className="mt-1 font-value text-3xl text-ink">
          ≈ {fmt(footprint)} {unit}
          <span className="ml-1 text-body-sm font-normal text-ink-3">
            {t("impact_xp.tangible.per_year")}
          </span>
        </p>
        {estimate.carEquivalenceKm != null && (
          <p className="mt-1 text-body-sm text-ink-2">
            ≈ {Math.round(Math.abs(estimate.carEquivalenceKm)).toLocaleString(numLocale)}{" "}
            {t("impact.equiv.car_km")}
          </p>
        )}
      </div>

      {estimate.lowCoverage && (
        <p className="rounded-xl bg-solar-tint px-3 py-2 text-caption font-medium text-solar-ink">
          {t("impact_xp.tangible.low_coverage_banner")}
        </p>
      )}

      <div className="space-y-1 border-t border-paper-3 pt-3">
        <p className="text-caption text-ink-2">
          {fullySourced
            ? t("impact_xp.tangible.reliability_measured")
            : t("impact_xp.tangible.reliability_line", {
                level: t(`impact_xp.tangible.confidence_${estimate.confidence}`),
              })}
        </p>
        {!fullySourced && (
          <p className="text-caption text-ink-3">
            {t("impact_xp.tangible.sourced_pct", { pct: estimate.sourcedPct })}
          </p>
        )}
      </div>

      <Link
        to="/methodologie"
        className="inline-block text-caption text-ink-2 underline underline-offset-2 hover:text-ink"
      >
        {t("impact_xp.tangible.how_we_calculate")}
      </Link>
    </div>
  );
}

/* ──────────────────────── 5. Ce qu'il finance ──────────────────────── */

function HoldingsSection({
  holdings,
  numLocale,
}: {
  holdings: ActiveHolding[];
  numLocale: string;
}) {
  const { t } = useTranslation();
  if (holdings.length === 0) return null;

  return (
    <div className="space-y-4">
      <SectionHeading
        n="05"
        title={t("impact_xp.finance.title")}
        subtitle={t("impact_xp.finance.subtitle")}
      />
      <div className="rounded-3xl border border-paper-3 bg-paper p-5 md:p-6">
        <ul className="flex flex-col divide-y divide-paper-3">
          {holdings.slice(0, 6).map((h) => (
            <li key={h.id} className="flex items-center gap-3 py-3">
              <span className="w-14 flex-none font-value text-label text-ink">{h.ticker}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body-sm text-ink">{h.name}</span>
                <span className="block truncate font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">
                  {h.region
                    ? `${h.region} · ${t(`impact_translator.class.${h.category}`, { defaultValue: h.category })}`
                    : t(`impact_translator.class.${h.category}`, { defaultValue: h.category })}
                </span>
              </span>
              <span className="w-12 flex-none text-right font-mono text-label tabular-nums text-ink">
                {Math.round(h.allocationPct).toLocaleString(numLocale)}%
              </span>
            </li>
          ))}
        </ul>
        {holdings.length > 6 && (
          <p className="mt-3 text-caption text-ink-3">
            {t("impact_xp.finance.more", { count: holdings.length - 6 })}
          </p>
        )}
        <p className="mt-3 text-caption leading-snug text-ink-3">{t("impact_xp.finance.note")}</p>
      </div>
    </div>
  );
}

/* ──────────────────────── 6. Ce qu'il refuse ──────────────────────── */

/** Ordre canonique d'affichage des exclusions (stable, indépendant de la DB). */
const EXCLUSION_ORDER: ExclusionTag[] = [
  "fossiles",
  "armes",
  "tabac",
  "jeux",
  "animaux",
  "fast-fashion",
];

function ExclusionsSection({ exclusions }: { exclusions: ExclusionTag[] }) {
  const { t } = useTranslation();
  const list = EXCLUSION_ORDER.filter((e) => exclusions.includes(e));
  if (list.length === 0) return null;

  return (
    <div className="space-y-4">
      <SectionHeading
        n="06"
        title={t("impact_xp.exclusions.title")}
        subtitle={t("impact_xp.exclusions.subtitle")}
      />
      <div className="rounded-3xl border border-paper-3 bg-paper p-5 md:p-6">
        <ul className="flex flex-wrap gap-2">
          {list.map((e) => (
            <li
              key={e}
              className="inline-flex items-center gap-2 rounded-full border border-paper-3 bg-paper-2 px-3 py-1.5"
            >
              <svg
                viewBox="0 0 16 16"
                className="h-3.5 w-3.5 flex-none text-ink-3"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <circle cx="8" cy="8" r="6.25" />
                <line x1="3.6" y1="3.6" x2="12.4" y2="12.4" />
              </svg>
              <span className="text-body-sm text-ink line-through decoration-ink-3/60">
                {t(`impact_xp.exclusions.tag.${e}`)}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-caption leading-snug text-ink-3">
          {t("impact_xp.exclusions.note")}
        </p>
      </div>
    </div>
  );
}

/* ──────────────────────── 7. La preuve ──────────────────────── */

function ProofSection({
  metrics,
  isSimple,
}: {
  metrics: Parameters<typeof PortfolioMetricsCard>[0]["metrics"];
  isSimple: boolean;
}) {
  const { t } = useTranslation();
  return (
    <details className="group rounded-3xl border border-paper-3 bg-paper-2/50 open:bg-paper-2/30">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5 [&::-webkit-details-marker]:hidden">
        <span className="block">
          <span className="block text-sm font-semibold text-ink">{t("impact_xp.proof.title")}</span>
          <span className="mt-0.5 block text-xs text-ink-2">{t("impact_xp.proof.subtitle")}</span>
        </span>
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4 flex-none text-ink-3 transition-transform duration-300 group-open:rotate-180"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </summary>
      <div className="space-y-5 border-t border-paper-3 px-5 pb-5 pt-5">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-ink">{t("impact_xp.proof.indicators")}</h3>
          {isSimple && (
            <ExplainerCard tone="highlight" dismissKey="portfolio-metrics-simple">
              {t("portfolio.simple_explainer_pre")}{" "}
              <span className="font-semibold">{t("portfolio.simple_explainer_expert")}</span>{" "}
              {t("portfolio.simple_explainer_post")}
            </ExplainerCard>
          )}
          <PortfolioMetricsCard metrics={metrics} />
        </div>
        <ImpactCertificate />
      </div>
    </details>
  );
}

/* ──────────────────────── Primitives ──────────────────────── */

function SectionHeading({ n, title, subtitle }: { n: string; title: string; subtitle?: string }) {
  return (
    <div className="px-1">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-3">
        <span className="text-mint-ink">N° {n}</span> · {title}
      </p>
      {subtitle && <p className="mt-1 text-body-sm leading-snug text-ink-2">{subtitle}</p>}
    </div>
  );
}
