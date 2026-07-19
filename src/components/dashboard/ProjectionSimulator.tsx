import { useMemo, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTranslation, Trans } from "react-i18next";
import { KPIFigure } from "@/components/ui/KPIFigure";
import {
  PROJECTION_BOUNDS,
  computeProjection,
  computeTax,
  sanitizeProjectionInput,
  solveMonthlyForGoal,
  type Envelope,
  type StressEvent,
} from "@/hooks/useProjection";
import { cn } from "@/lib/utils";
import { useLang } from "@/hooks/useLang";
import { formatCurrency, formatPercent, formatNumber } from "@/lib/format";

interface Props {
  initialAmount: number;
  expectedReturn: number;
  volatility: number;
}

const HORIZONS = [5, 10, 20] as const;
type Horizon = (typeof HORIZONS)[number];

type Scenario = "prudent" | "central" | "optimiste";

type Mode = "contribute" | "goal";
type StressKey = "none" | "crash" | "pause" | "inflation";

export function ProjectionSimulator({ initialAmount, expectedReturn, volatility }: Props) {
  const { t } = useTranslation();
  const { lang } = useLang();
  const [mode, setMode] = useState<Mode>("contribute");
  const [monthly, setMonthly] = useState(100);
  const [horizon, setHorizon] = useState<Horizon>(10);
  const [scenario, setScenario] = useState<Scenario>("central");
  const [envelope, setEnvelope] = useState<Envelope>("pea");
  const [stressKey, setStressKey] = useState<StressKey>("none");
  const [targetCapital, setTargetCapital] = useState(50_000);
  const [inflation] = useState(0.02);

  const SCENARIOS: { key: Scenario; label: string; sigma: number }[] = [
    { key: "prudent", label: t("projection_simulator.prudent"), sigma: -0.5 },
    { key: "central", label: t("projection_simulator.central"), sigma: 0 },
    { key: "optimiste", label: t("projection_simulator.optimistic"), sigma: +0.5 },
  ];

  const ENVELOPES: { key: Envelope; label: string }[] = [
    { key: "pea", label: t("projection_simulator.pea") },
    { key: "av", label: t("projection_simulator.av") },
    { key: "cto", label: t("projection_simulator.cto") },
  ];

  const baseReturn = useMemo(
    () =>
      expectedReturn > 0 && expectedReturn < PROJECTION_BOUNDS.annualReturnMax
        ? expectedReturn
        : 0.06,
    [expectedReturn],
  );
  const vol = useMemo(() => (volatility > 0 && volatility < 0.6 ? volatility : 0.14), [volatility]);

  const sigma = SCENARIOS.find((s) => s.key === scenario)?.sigma ?? 0;
  const rawAnnualReturn = baseReturn + sigma * vol;

  const { input: safe } = useMemo(
    () =>
      sanitizeProjectionInput({
        initial: initialAmount,
        monthly,
        years: horizon,
        annualReturn: rawAnnualReturn,
        inflation,
      }),
    [initialAmount, monthly, horizon, rawAnnualReturn, inflation],
  );

  // Projection nominale (sans stress)
  const result = useMemo(
    () =>
      computeProjection({
        initial: safe.initial,
        monthly: safe.monthly,
        years: safe.years,
        annualReturn: safe.annualReturn,
        inflation: safe.inflation,
      }),
    [safe.initial, safe.monthly, safe.years, safe.annualReturn, safe.inflation],
  );

  // Projection sous stress
  const stress: StressEvent | undefined = useMemo(() => {
    if (stressKey === "none") return undefined;
    if (stressKey === "crash") {
      return { shockYear: Math.max(1, Math.floor(safe.years / 3)), shockPct: -0.3 };
    }
    if (stressKey === "pause") {
      const start = Math.max(1, Math.floor(safe.years / 3));
      return { pauseStartYear: start, pauseEndYear: Math.min(safe.years, start + 2) };
    }
    return { inflationOverride: 0.05 };
  }, [stressKey, safe.years]);

  const stressedResult = useMemo(() => {
    if (!stress) return null;
    return computeProjection({
      initial: safe.initial,
      monthly: safe.monthly,
      years: safe.years,
      annualReturn: safe.annualReturn,
      inflation: safe.inflation,
      stress,
    });
  }, [safe, stress]);

  // Fiscalité
  const tax = useMemo(
    () => computeTax(result.gain, result.finalValue, safe.years, envelope),
    [result.gain, result.finalValue, safe.years, envelope],
  );

  // Mode objectif
  const goal = useMemo(() => {
    if (mode !== "goal") return null;
    return solveMonthlyForGoal({
      targetCapital,
      initial: safe.initial,
      years: safe.years,
      annualReturn: safe.annualReturn,
      inflation: safe.inflation,
    });
  }, [mode, targetCapital, safe]);

  // Fusion des séries pour le graph (ajoute `stressed` si applicable)
  const chartData = useMemo(() => {
    if (!stressedResult) return result.series;
    return result.series.map((p, i) => ({
      ...p,
      stressed: stressedResult.series[i]?.withContrib,
    }));
  }, [result.series, stressedResult]);

  const monthlyInvalid =
    monthly < PROJECTION_BOUNDS.monthlyMin || monthly > PROJECTION_BOUNDS.monthlyMax;

  return (
    <section className="px-5 pt-10" aria-labelledby="simulator-title">
      <div className="gold-rule mb-5" />
      <p className="text-tag uppercase tracking-[0.22em] text-gold font-semibold mb-3">
        {t("projection_simulator.projection_eyebrow", { defaultValue: "Projection" })}
      </p>
      <h2 id="simulator-title" className="font-display text-2xl text-ink leading-tight">
        {mode === "contribute"
          ? t("projection_simulator.contribute_title")
          : t("projection_simulator.goal_title")}
      </h2>
      <p className="text-sm text-ink-3 mt-2">
        {mode === "contribute"
          ? t("projection_simulator.contribute_desc", {
              years: safe.years,
              initial: formatCurrency(safe.initial, lang),
            })
          : t("projection_simulator.goal_desc", { years: safe.years })}
      </p>

      {/* Mode switch */}
      <div
        role="tablist"
        aria-label={t("projection_simulator.simulator_mode_aria", {
          defaultValue: "Mode du simulateur",
        })}
        className="mt-5 inline-flex border border-paper-3 rounded-full p-1"
      >
        {(
          [
            { key: "contribute", label: t("projection_simulator.tab_contribute") },
            { key: "goal", label: t("projection_simulator.tab_goal") },
          ] as const
        ).map((m) => {
          const active = mode === m.key;
          return (
            <button
              key={m.key}
              role="tab"
              aria-selected={active}
              onClick={() => setMode(m.key)}
              className={cn(
                "px-4 py-1.5 text-label font-medium rounded-full transition-colors",
                active ? "bg-ink text-paper" : "text-ink-2 hover:text-ink",
              )}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      {/* Contrôles */}
      <div className="mt-6 space-y-5">
        {mode === "contribute" ? (
          <div>
            <div className="flex items-baseline justify-between mb-2 gap-3">
              <label
                htmlFor="proj-monthly"
                className="text-caption uppercase tracking-wider text-ink-3 font-semibold"
              >
                {t("projection_simulator.monthly_deposit")}
              </label>
              <span className="kpi-figure text-xl text-ink tabular-nums">
                {formatNumber(safe.monthly, lang, { maximumFractionDigits: 0 })}{" "}
                <span className="text-sm text-ink-3 font-sans">€</span>
              </span>
            </div>
            <input
              id="proj-monthly"
              type="range"
              min={PROJECTION_BOUNDS.monthlyMin}
              max={1000}
              step={25}
              value={Math.min(monthly, 1000)}
              onChange={(e) => setMonthly(Number(e.target.value))}
              aria-valuemin={PROJECTION_BOUNDS.monthlyMin}
              aria-valuemax={1000}
              aria-valuenow={safe.monthly}
              className="w-full accent-[var(--highlight-1)]"
            />
            <div className="flex justify-between text-tag text-ink-3 mt-1 tabular-nums">
              <span>0 €</span>
              <span>500 €</span>
              <span>1 000 €</span>
            </div>
            {monthlyInvalid && (
              <p role="alert" className="mt-2 text-caption text-rust">
                {t("projection_simulator.monthly_invalid", {
                  min: PROJECTION_BOUNDS.monthlyMin,
                  max: PROJECTION_BOUNDS.monthlyMax,
                })}
              </p>
            )}
          </div>
        ) : (
          <div>
            <label
              htmlFor="proj-target"
              className="text-caption uppercase tracking-wider text-ink-3 font-semibold block mb-2"
            >
              {t("projection_simulator.target_capital")}
            </label>
            <input
              id="proj-target"
              type="number"
              min={1000}
              max={5_000_000}
              step={1000}
              value={targetCapital}
              onChange={(e) => setTargetCapital(Math.max(0, Number(e.target.value)))}
              className="w-full px-3 py-2 bg-paper-2 border border-paper-3 rounded text-ink font-value text-lg tabular-nums focus:outline-none focus:border-gold"
            />
          </div>
        )}

        {/* Horizon */}
        <div>
          <p className="text-caption uppercase tracking-wider text-ink-3 font-semibold mb-2">
            {t("projection_simulator.investment_horizon")}
          </p>
          <div
            role="radiogroup"
            aria-label={t("projection_simulator.investment_horizon")}
            className="flex gap-2"
          >
            {HORIZONS.map((h) => {
              const active = horizon === h;
              return (
                <button
                  key={h}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setHorizon(h)}
                  className={cn(
                    "flex-1 py-2 text-label font-medium border rounded-full transition-colors",
                    active
                      ? "bg-ink text-paper border-ink"
                      : "border-paper-3 text-ink-2 hover:border-ink-3",
                  )}
                >
                  {h} {t("projection_simulator.years_label")}
                </button>
              );
            })}
          </div>
        </div>

        {/* Scénario */}
        <div>
          <p className="text-caption uppercase tracking-wider text-ink-3 font-semibold mb-2">
            {t("projection_simulator.market_scenario")}
          </p>
          <div
            role="radiogroup"
            aria-label={t("projection_simulator.market_scenario")}
            className="flex gap-2"
          >
            {SCENARIOS.map((s) => {
              const active = scenario === s.key;
              return (
                <button
                  key={s.key}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setScenario(s.key)}
                  className={cn(
                    "flex-1 py-2 text-label font-medium border rounded-full transition-colors",
                    active
                      ? "bg-highlight-1 text-paper border-highlight-1"
                      : "border-paper-3 text-ink-2 hover:border-ink-3",
                  )}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Enveloppe fiscale */}
        <div>
          <p className="text-caption uppercase tracking-wider text-ink-3 font-semibold mb-2">
            {t("projection_simulator.tax_envelope")}
          </p>
          <div
            role="radiogroup"
            aria-label={t("projection_simulator.tax_envelope")}
            className="flex gap-2"
          >
            {ENVELOPES.map((e) => {
              const active = envelope === e.key;
              return (
                <button
                  key={e.key}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setEnvelope(e.key)}
                  className={cn(
                    "flex-1 py-2 text-label font-medium border rounded-full transition-colors",
                    active
                      ? "bg-ink text-paper border-ink"
                      : "border-paper-3 text-ink-2 hover:border-ink-3",
                  )}
                >
                  {e.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Stress test */}
        {mode === "contribute" && (
          <div>
            <p className="text-caption uppercase tracking-wider text-ink-3 font-semibold mb-2">
              {t("projection_simulator.stress_test")}
            </p>
            <div
              role="radiogroup"
              aria-label={t("projection_simulator.stress_test")}
              className="flex flex-wrap gap-2"
            >
              {(
                [
                  { key: "none", label: t("projection_simulator.none") },
                  { key: "crash", label: t("projection_simulator.crash") },
                  { key: "pause", label: t("projection_simulator.pause") },
                  { key: "inflation", label: t("projection_simulator.inflation_stress") },
                ] as const
              ).map((s) => {
                const active = stressKey === s.key;
                return (
                  <button
                    key={s.key}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setStressKey(s.key)}
                    className={cn(
                      "px-3 py-1.5 text-caption font-medium border rounded-full transition-colors",
                      active
                        ? "bg-rust text-paper border-rust"
                        : "border-paper-3 text-ink-2 hover:border-ink-3",
                    )}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Résultats */}
      {mode === "contribute" ? (
        <div className="mt-8 border-t border-paper-3 pt-6">
          <KPIFigure
            size="lg"
            label={t("projection_simulator.projected_capital_brut")}
            value={formatCurrency(result.finalValue, lang)}
            hint={t("projection_simulator.purchasing_power", {
              value: formatCurrency(result.finalValueReal, lang),
              inflation: formatPercent(safe.inflation, lang),
            })}
            accent
          />

          <div className="grid grid-cols-2 gap-4 mt-6">
            <KPIFigure
              size="sm"
              label={t("projection_simulator.net_after_tax")}
              value={formatCurrency(tax.netFinalValue, lang)}
              hint={`${ENVELOPES.find((e) => e.key === envelope)!.label} · ${t("projection_simulator.tax_amount", { tax: formatCurrency(tax.tax, lang) })}`}
            />
            <KPIFigure
              size="sm"
              label={
                result.gain >= 0
                  ? t("projection_simulator.gross_gain")
                  : t("projection_simulator.estimated_loss")
              }
              value={`${result.gain >= 0 ? "+" : ""}${formatCurrency(result.gain, lang)}`}
              hint={t("projection_simulator.total_contributed", {
                total: formatCurrency(result.totalContributed, lang),
              })}
            />
          </div>

          {stressedResult && (
            <div className="mt-5 p-4 bg-paper-2 border-l-2 border-rust rounded-r">
              <p className="text-tag uppercase tracking-[0.18em] text-rust font-semibold mb-1">
                {t("projection_simulator.under_stress")}
              </p>
              <p className="text-sm text-ink">
                {t("projection_simulator.projected_capital_brut")} :{" "}
                <span className="font-value tabular-nums">
                  {formatCurrency(stressedResult.finalValue, lang)}
                </span>{" "}
                <span className="text-ink-3">
                  ({stressedResult.finalValue - result.finalValue >= 0 ? "+" : ""}
                  {formatCurrency(stressedResult.finalValue - result.finalValue, lang)}{" "}
                  {t("projection_simulator.vs_central")})
                </span>
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-8 border-t border-paper-3 pt-6">
          {goal && (
            <>
              <KPIFigure
                size="lg"
                label={t("projection_simulator.required_monthly")}
                value={formatCurrency(goal.monthlyRequired, lang)}
                hint={
                  goal.feasible
                    ? t("projection_simulator.goal_attain", {
                        target: formatCurrency(targetCapital, lang),
                        nominal: formatCurrency(goal.nominalTarget, lang),
                        years: safe.years,
                      })
                    : t("projection_simulator.unattainable", {
                        max: formatCurrency(PROJECTION_BOUNDS.monthlyMax, lang),
                      })
                }
                accent
              />
              {!goal.feasible && (
                <p role="alert" className="mt-3 text-label text-rust">
                  {t("projection_simulator.unattainable_hint")}
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* Graph */}
      <div className="mt-6 h-48 -mx-1" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="projWith" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--gold)" stopOpacity={0.45} />
                <stop offset="100%" stopColor="var(--gold)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="projWithout" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--highlight-1)" stopOpacity={0.25} />
                <stop offset="100%" stopColor="var(--highlight-1)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="year"
              tickFormatter={(y: number) => (y === 0 ? "0" : `${Math.round(y)}a`)}
              tick={{ fontSize: 10, fill: "var(--ink-3)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v: number) =>
                v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v.toFixed(0)}`
              }
              tick={{ fontSize: 10, fill: "var(--ink-3)" }}
              axisLine={false}
              tickLine={false}
              width={36}
            />
            <Tooltip
              cursor={{ stroke: "var(--paper-3)" }}
              contentStyle={{
                background: "var(--ink)",
                border: "none",
                borderRadius: 8,
                fontSize: 11,
                padding: "8px 10px",
              }}
              labelStyle={{ color: "var(--paper-2)", marginBottom: 4 }}
              itemStyle={{ color: "var(--paper)" }}
              labelFormatter={(y: number) =>
                t("projection_simulator.after_years", {
                  defaultValue: "Après {{count}} ans",
                  count: y,
                })
              }
              formatter={(v: number) => formatCurrency(v, lang)}
            />
            <Area
              type="monotone"
              dataKey="withContrib"
              stroke="var(--gold)"
              strokeWidth={2}
              fill="url(#projWith)"
              dot={false}
              activeDot={{ r: 4, fill: "var(--gold)" }}
            />
            {stressedResult && (
              <Area
                type="monotone"
                dataKey="stressed"
                stroke="var(--rust)"
                strokeWidth={2}
                fill="none"
                strokeDasharray="4 4"
                dot={false}
              />
            )}
            <Area
              type="monotone"
              dataKey="withoutContrib"
              stroke="var(--highlight-1)"
              strokeWidth={1.5}
              fill="url(#projWithout)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
