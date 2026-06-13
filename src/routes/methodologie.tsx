import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useLang } from "@/hooks/useLang";
import { formatPercent, formatNumber } from "@/lib/format";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import { simulatePortfolio } from "@/lib/portfolio/server.functions";
import { LanguageToggle } from "@/components/LanguageToggle";
import { MetricLabel } from "@/components/ui/MetricLabel";
import type { CauseTag, ExclusionTag } from "@/lib/portfolio/types";

export const Route = createFileRoute("/methodologie")({
  head: () => ({
    meta: [
      { title: "Méthodologie — Construction de portefeuille" },
      { name: "description", content: "Pipeline de construction du portefeuille : exclusions, best-in-class, optimisation Markowitz contrainte, tilts par convictions." },
    ],
  }),
  component: MethodologyPage,
});

type SimResult = Awaited<ReturnType<typeof simulatePortfolio>>;

function MethodologyPage() {
  const { t } = useTranslation();
  const { lang } = useLang();

  const CAUSES: { id: CauseTag; label: string }[] = [
    { id: "climat", label: t("methodologie.causes.climat") },
    { id: "biodiversite", label: t("methodologie.causes.biodiversite") },
    { id: "humain", label: t("methodologie.causes.humain") },
    { id: "egalite", label: t("methodologie.causes.egalite") },
    { id: "tech", label: t("methodologie.causes.tech") },
    { id: "circulaire", label: t("methodologie.causes.circulaire") },
  ];

  const EXCLUSIONS: { id: ExclusionTag; label: string }[] = [
    { id: "fossiles", label: t("methodologie.exclusions.fossiles") },
    { id: "armes", label: t("methodologie.exclusions.armes") },
    { id: "tabac", label: t("methodologie.exclusions.tabac") },
    { id: "jeux", label: t("methodologie.exclusions.jeux") },
    { id: "animaux", label: t("methodologie.exclusions.animaux") },
    { id: "fast-fashion", label: t("methodologie.exclusions.fast-fashion") },
  ];

  const STAGES = [
    { id: 1, name: t("methodologie.stages.1_name"), desc: t("methodologie.stages.1_desc"), tip: t("methodologie.tips.stage_1") },
    { id: 2, name: t("methodologie.stages.2_name"), desc: t("methodologie.stages.2_desc"), tip: t("methodologie.tips.stage_2") },
    { id: 3, name: t("methodologie.stages.3_name"), desc: t("methodologie.stages.3_desc"), tip: t("methodologie.tips.stage_3") },
    { id: 4, name: t("methodologie.stages.4_name"), desc: t("methodologie.stages.4_desc"), tip: t("methodologie.tips.stage_4") },
    { id: 5, name: t("methodologie.stages.5_name"), desc: t("methodologie.stages.5_desc"), tip: t("methodologie.tips.stage_5") },
  ];

  const ASSET_CLASS_LABEL: Record<string, string> = {
    equity_dev: t("methodologie.asset_classes.equity_dev"),
    equity_em: t("methodologie.asset_classes.equity_em"),
    thematic: t("methodologie.asset_classes.thematic"),
    green_bond: t("methodologie.asset_classes.green_bond"),
    social_bond: t("methodologie.asset_classes.social_bond"),
    sov_bond: t("methodologie.asset_classes.sov_bond"),
    reit: t("methodologie.asset_classes.reit"),
    commodity: t("methodologie.asset_classes.commodity"),
    cash: t("methodologie.asset_classes.cash"),
  };

  const simulate = useServerFn(simulatePortfolio);

  const [causes, setCauses] = useState<CauseTag[]>(["climat", "biodiversite"]);
  const [intensity, setIntensity] = useState<Record<string, number>>({
    climat: 0.7, biodiversite: 0.5,
  });
  const [exclusions, setExclusions] = useState<ExclusionTag[]>(["fossiles", "armes"]);
  const [risk, setRisk] = useState(0.09);
  const [horizon, setHorizon] = useState(10);

  const [result, setResult] = useState<SimResult | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setLoading(true);
    debounceRef.current = setTimeout(() => {
      simulate({
        data: {
          causes,
          cause_intensity: intensity,
          exclusions,
          risk_target: risk,
          horizon_years: horizon,
          initial_amount: 1000,
        },
      })
        .then((r) => setResult(r))
        .catch((e) => console.error("simulate", e))
        .finally(() => setLoading(false));
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [causes, intensity, exclusions, risk, horizon, simulate]);

  const toggleCause = (id: CauseTag) => {
    setCauses((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((x) => x !== id);
        const newInt = { ...intensity };
        delete newInt[id];
        setIntensity(newInt);
        return next;
      }
      setIntensity({ ...intensity, [id]: 0.5 });
      return [...prev, id];
    });
  };

  const toggleExclusion = (id: ExclusionTag) => {
    setExclusions((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const sortedWeights = useMemo(() => {
    if (!result) return [];
    return Object.entries(result.weights)
      .map(([id, w]) => {
        const a = result.selected.find((x) => x.id === id);
        return { id, weight: w, asset: a };
      })
      .filter((x) => x.asset)
      .sort((a, b) => b.weight - a.weight);
  }, [result]);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="max-w-6xl mx-auto px-6 pt-10 pb-8 border-b border-paper-3">
        <div className="flex items-center justify-between">
          <Link to="/dashboard" className="text-[10px] uppercase tracking-[0.18em] text-ink-3 hover:text-ink transition-colors">
            {t("methodologie.back_dashboard")}
          </Link>
          <LanguageToggle />
        </div>
        <h1 className="font-value text-4xl mt-4">{t("methodologie.title")}</h1>
        <p className="text-[14px] text-ink-2 mt-3 max-w-2xl leading-relaxed">
          {t("methodologie.intro")}
        </p>
      </header>

      {/* Reading guide for beginners */}
      <section className="max-w-6xl mx-auto px-6 pt-10">
        <div className="border border-paper-3 bg-paper-2/40 p-6 md:p-8 grid md:grid-cols-[1fr_1.2fr] gap-6 md:gap-10">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-ink-3 font-medium">
              {t("methodologie.reading_eyebrow")}
            </p>
            <h2 className="font-value text-2xl mt-2">{t("methodologie.reading_title")}</h2>
          </div>
          <div className="space-y-3 text-[13px] text-ink-2 leading-relaxed">
            <p>{t("methodologie.reading_p1")}</p>
            <p>{t("methodologie.reading_p2")}</p>
            <div className="pt-3 border-t border-paper-3 grid sm:grid-cols-2 gap-x-6 gap-y-2 text-[12px]">
              <p><span className="font-value text-ink">·</span> {t("methodologie.glossary.markowitz")}</p>
              <p><span className="font-value text-ink">·</span> {t("methodologie.glossary.best_in_class")}</p>
              <p><span className="font-value text-ink">·</span> {t("methodologie.glossary.ter")}</p>
              <p><span className="font-value text-ink">·</span> {t("methodologie.glossary.esg_acro")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pipeline visualization */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        <p className="text-[10px] uppercase tracking-[0.18em] text-ink-3 font-medium mb-8">
          {t("methodologie.pipeline_title")}
        </p>
        <ol className="grid grid-cols-1 md:grid-cols-5 gap-px bg-paper-3 border border-paper-3">
          {STAGES.map((s) => (
            <li key={s.id} className="bg-paper p-5">
              <span className="font-value text-[11px] text-ink-3 tabular-nums">0{s.id}</span>
              <h3 className="font-value text-[16px] text-ink mt-1">
                <MetricLabel label={s.name} hint={s.tip} />
              </h3>
              <p className="text-[12px] text-ink-2 mt-2 leading-relaxed">{s.desc}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Simulator */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="border-t border-paper-3 pt-10">
          <p className="text-[10px] uppercase tracking-[0.18em] text-ink-3 font-medium">
            {t("methodologie.simulator_eyebrow")}
          </p>
          <h2 className="font-value text-3xl mt-2">{t("methodologie.simulator_title")}</h2>
          <p className="text-[13px] text-ink-2 mt-2 max-w-2xl">
            {t("methodologie.simulator_desc")}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-10 mt-10">
          {/* Controls */}
          <div className="space-y-8">
            <Block title={t("methodologie.causes_title")} tip={t("methodologie.tips.causes")}>
              <div className="space-y-3">
                {CAUSES.map((c) => {
                  const active = causes.includes(c.id);
                  return (
                    <div key={c.id} className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => toggleCause(c.id)}
                        className={`w-4 h-4 rounded-sm border flex items-center justify-center flex-shrink-0 transition-colors ${
                          active ? "bg-ink border-ink" : "bg-paper border-paper-3 hover:border-ink"
                        }`}
                      >
                        {active && <svg width="10" height="8" viewBox="0 0 10 8"><path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                      </button>
                      <label className="text-[13px] text-ink min-w-[140px]">{c.label}</label>
                      {active && (
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.05}
                          value={intensity[c.id] ?? 0.5}
                          onChange={(e) => setIntensity({ ...intensity, [c.id]: Number(e.target.value) })}
                          className="flex-1 accent-ink h-1"
                        />
                      )}
                      {active && (
                        <span className="text-[11px] text-ink-3 tabular-nums w-10 text-right">
                          {Math.round((intensity[c.id] ?? 0.5) * 100)}%
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </Block>

            <Block title={t("methodologie.exclusions_title")} tip={t("methodologie.tips.exclusions")}>
              <div className="grid grid-cols-2 gap-2">
                {EXCLUSIONS.map((e) => {
                  const active = exclusions.includes(e.id);
                  return (
                    <button
                      key={e.id}
                      onClick={() => toggleExclusion(e.id)}
                      className={`flex items-center gap-2 p-2.5 rounded border text-left text-[12px] transition-colors ${
                        active ? "bg-ink/5 border-ink text-ink" : "bg-paper border-paper-3 text-ink-2 hover:border-ink-3"
                      }`}
                    >
                      <span className={`w-3 h-3 rounded-sm border flex-shrink-0 ${active ? "bg-ink border-ink" : "border-paper-3"}`} />
                      {e.label}
                    </button>
                  );
                })}
              </div>
            </Block>

            <Block title={t("methodologie.risk_title")} tip={t("methodologie.tips.risk")}>
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-[12px] text-ink-2">{t("methodologie.volatility_label")}</span>
                <span className="text-[13px] font-medium tabular-nums">{(risk * 100).toFixed(1)}%</span>
              </div>
              <input
                type="range"
                min={0.04}
                max={0.18}
                step={0.005}
                value={risk}
                onChange={(e) => setRisk(Number(e.target.value))}
                className="w-full accent-ink"
              />
              <div className="flex justify-between text-[10px] text-ink-3 mt-1">
                <span>{t("methodologie.risk_prudent")}</span>
                <span>{t("methodologie.risk_balanced")}</span>
                <span>{t("methodologie.risk_dynamic")}</span>
              </div>
            </Block>

            <Block title={t("methodologie.horizon_title")} tip={t("methodologie.tips.horizon")}>
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-[12px] text-ink-2">{t("methodologie.horizon_label")}</span>
                <span className="text-[13px] font-medium tabular-nums">{t("methodologie.horizon_years", { count: horizon })}</span>
              </div>
              <input
                type="range"
                min={1}
                max={30}
                step={1}
                value={horizon}
                onChange={(e) => setHorizon(Number(e.target.value))}
                className="w-full accent-ink"
              />
            </Block>
          </div>

          {/* Result */}
          <div className="lg:sticky lg:top-6 lg:self-start space-y-6">
            {result?.esg_floor_relaxed && (
              <div className="border border-rust/30 bg-rust/5 px-4 py-3 text-[12px] text-ink-2 leading-relaxed">
                <p className="font-value text-[13px] text-rust mb-1">{t("methodologie.esg_floor_relaxed_title")}</p>
                {t("methodologie.esg_floor_relaxed_desc")}
              </div>
            )}
            <div className="border-t border-b border-paper-3 divide-y divide-paper-3">
              <MetricRow label={t("methodologie.metric_return")} tip={t("methodologie.tips.return")} value={result ? formatPercent(result.metrics.expected_return, lang) : "—"} sub={t("methodologie.metric_return_hint")} />
              <MetricRow label={t("methodologie.metric_volatility")} tip={t("methodologie.tips.volatility")} value={result ? formatPercent(result.metrics.volatility, lang) : "—"} sub={t("methodologie.metric_volatility_hint")} />
              <MetricRow label={t("methodologie.metric_sharpe")} tip={t("methodologie.tips.sharpe")} value={result ? formatNumber(result.metrics.sharpe, lang) : "—"} sub={t("methodologie.metric_sharpe_hint")} />
              <MetricRow label={t("methodologie.metric_esg")} tip={t("methodologie.tips.esg")} value={result ? `${formatNumber(result.metrics.esg_score, lang, { maximumFractionDigits: 0 })} / 100` : "—"} sub={t("methodologie.metric_esg_hint")} />
              <MetricRow label={t("methodologie.metric_fees")} tip={t("methodologie.tips.fees")} value={result ? formatPercent(result.metrics.ter, lang) : "—"} sub={t("methodologie.metric_fees_hint")} />
              <MetricRow label={t("methodologie.metric_co2")} tip={t("methodologie.tips.co2")} value={result ? `${formatNumber(result.metrics.co2_avoided_tons, lang)} t / 10k€` : "—"} sub={t("methodologie.metric_co2_hint")} />
              <MetricRow
                label={t("methodologie.metric_carbon_intensity")}
                tip={t("methodologie.tips.carbon_intensity")}
                value={
                  result?.metrics.carbon_intensity_gco2e_per_eur != null
                    ? `${formatNumber(result.metrics.carbon_intensity_gco2e_per_eur, lang, { maximumFractionDigits: 0 })} gCO₂e/€/an`
                    : t("methodologie.metric_carbon_unavailable")
                }
                sub={t("methodologie.metric_carbon_intensity_hint")}
              />
            </div>

            <CarbonCoverage
              coverage={result?.metrics.carbon_intensity_coverage ?? 0}
              hasRealData={result?.metrics.carbon_intensity_gco2e_per_eur != null}
              t={t}
            />

            <div>
              <div className="flex items-baseline justify-between border-b border-paper-3 pb-2">
                <p className="text-[10px] uppercase tracking-[0.12em] text-ink-3 font-medium">
                  <MetricLabel label={t("methodologie.allocation_title")} hint={t("methodologie.tips.allocation")} />
                </p>
                <p className="text-[10px] text-ink-3">
                  {loading ? t("methodologie.loading") : t("methodologie.positions_count", { count: sortedWeights.length })}
                </p>
              </div>
              <ul className="divide-y divide-paper-3">
                {sortedWeights.map((row, i) => (
                  <motion.li
                    key={row.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="py-2.5"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="flex items-baseline gap-2 min-w-0">
                        <span className="font-value text-[13px] text-ink">{row.asset!.ticker}</span>
                        <span className="text-[11px] text-ink-3 truncate">{row.asset!.name}</span>
                      </div>
                      <span className="text-[12px] tabular-nums font-medium">{(row.weight * 100).toFixed(1)}%</span>
                    </div>
                    <div className="mt-1 h-px bg-paper-3 relative">
                      <div className="absolute inset-y-0 left-0 bg-ink" style={{ width: `${row.weight * 100}%`, height: "1px" }} />
                    </div>
                  </motion.li>
                ))}
                {!loading && sortedWeights.length === 0 && (
                  <li className="py-6 text-center text-[12px] text-ink-3">
                    {t("methodologie.no_positions")}
                  </li>
                )}
              </ul>
            </div>

            {result && (
              <div>
                <p className="text-[10px] uppercase tracking-[0.12em] text-ink-3 font-medium border-b border-paper-3 pb-2 mb-3">
                  <MetricLabel label={t("methodologie.breakdown_title")} hint={t("methodologie.tips.breakdown")} />
                </p>
                <ul className="space-y-1.5">
                  {Object.entries(result.metrics.by_class)
                    .filter(([, w]) => w > 0.005)
                    .sort(([, a], [, b]) => b - a)
                    .map(([cls, w]) => (
                      <li key={cls} className="flex items-baseline justify-between text-[12px]">
                        <span className="text-ink-2">{ASSET_CLASS_LABEL[cls] ?? cls}</span>
                        <span className="tabular-nums">{(w * 100).toFixed(1)}%</span>
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function Block({ title, tip, children }: { title: string; tip?: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.15em] text-ink-3 font-medium border-b border-paper-3 pb-2 mb-3">
        <MetricLabel label={title} hint={tip} />
      </p>
      {children}
    </div>
  );
}

function MetricRow({ label, value, sub, tip }: { label: string; value: string; sub?: string; tip?: string }) {
  return (
    <div className="flex items-baseline justify-between py-2.5">
      <div>
        <p className="text-[12px] text-ink">
          <MetricLabel label={label} hint={tip} />
        </p>
        {sub && <p className="text-[10px] text-ink-3 mt-0.5">{sub}</p>}
      </div>
      <span className="font-value text-[15px] tabular-nums">{value}</span>
    </div>
  );
}

function CarbonCoverage({
  coverage,
  hasRealData,
  t,
}: {
  coverage: number;
  hasRealData: boolean;
  t: (k: string, opts?: Record<string, unknown>) => string;
}) {
  const pct = Math.round(Math.max(0, Math.min(1, coverage)) * 100);

  let tone: "low" | "partial" | "good";
  if (pct >= 70) tone = "good";
  else if (pct >= 30) tone = "partial";
  else tone = "low";

  const barColor =
    tone === "good" ? "bg-moss-2" : tone === "partial" ? "bg-ink" : "bg-rust";

  const advice =
    !hasRealData || pct === 0
      ? t("methodologie.carbon_coverage_advice_none")
      : pct < 30
      ? t("methodologie.carbon_coverage_advice_low")
      : pct < 70
      ? t("methodologie.carbon_coverage_advice_mid")
      : t("methodologie.carbon_coverage_advice_high");

  return (
    <div className="border border-paper-3 p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-[10px] uppercase tracking-[0.12em] text-ink-3 font-medium">
          <MetricLabel
            label={t("methodologie.carbon_coverage_title")}
            hint={t("methodologie.tips.carbon_coverage")}
          />
        </p>
        <span className="font-value text-[14px] tabular-nums">{pct}%</span>
      </div>
      <div className="mt-3 h-1.5 bg-paper-3 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={`h-full ${barColor}`}
        />
      </div>
      <div className="flex justify-between text-[10px] text-ink-3 mt-1.5 tabular-nums">
        <span>0%</span>
        <span>50%</span>
        <span>100%</span>
      </div>
      <p className="text-[11px] text-ink-2 mt-3 leading-relaxed">{advice}</p>
    </div>
  );
}
