import { useMemo, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
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

interface Props {
  initialAmount: number;
  expectedReturn: number;
  volatility: number;
}

const HORIZONS = [5, 10, 20] as const;
type Horizon = (typeof HORIZONS)[number];

type Scenario = "prudent" | "central" | "optimiste";
const SCENARIOS: { key: Scenario; label: string; sigma: number }[] = [
  { key: "prudent", label: "Prudent", sigma: -0.5 },
  { key: "central", label: "Central", sigma: 0 },
  { key: "optimiste", label: "Optimiste", sigma: +0.5 },
];

type Mode = "contribute" | "goal";
type StressKey = "none" | "crash" | "pause" | "inflation";
const ENVELOPES: { key: Envelope; label: string }[] = [
  { key: "pea", label: "PEA" },
  { key: "av", label: "Assurance-Vie" },
  { key: "cto", label: "CTO" },
];

const fmtEur0 = (n: number) =>
  n.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

const fmtEur2 = (n: number) =>
  n.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const fmtPct = (n: number, digits = 1) =>
  `${(n * 100).toLocaleString("fr-FR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })} %`;

export function ProjectionSimulator({ initialAmount, expectedReturn, volatility }: Props) {
  const [mode, setMode] = useState<Mode>("contribute");
  const [monthly, setMonthly] = useState(100);
  const [horizon, setHorizon] = useState<Horizon>(10);
  const [scenario, setScenario] = useState<Scenario>("central");
  const [envelope, setEnvelope] = useState<Envelope>("pea");
  const [stressKey, setStressKey] = useState<StressKey>("none");
  const [targetCapital, setTargetCapital] = useState(50_000);
  const [inflation] = useState(0.02);

  const baseReturn = useMemo(
    () =>
      expectedReturn > 0 && expectedReturn < PROJECTION_BOUNDS.annualReturnMax
        ? expectedReturn
        : 0.06,
    [expectedReturn],
  );
  const vol = useMemo(
    () => (volatility > 0 && volatility < 0.6 ? volatility : 0.14),
    [volatility],
  );

  const sigma = SCENARIOS.find((s) => s.key === scenario)!.sigma;
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
      return { shockYear: Math.max(1, Math.floor(safe.years / 3)), shockPct: -0.30 };
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
      <p className="text-[10px] uppercase tracking-[0.22em] text-gold font-semibold mb-3">
        Projection
      </p>
      <h2 id="simulator-title" className="font-value text-2xl text-ink leading-tight">
        {mode === "contribute" ? "Et si tu versais chaque mois ?" : "Quel versement pour ton objectif ?"}
      </h2>
      <p className="text-sm text-ink-3 mt-2">
        {mode === "contribute"
          ? `Capital projeté sur ${safe.years} ans à partir de ${fmtEur2(safe.initial)}.`
          : `Versement requis pour atteindre ta cible en ${safe.years} ans.`}
      </p>

      {/* Mode switch */}
      <div role="tablist" aria-label="Mode du simulateur" className="mt-5 inline-flex border border-paper-3 rounded-full p-1">
        {([
          { key: "contribute", label: "Je verse" },
          { key: "goal", label: "J'ai un objectif" },
        ] as const).map((m) => {
          const active = mode === m.key;
          return (
            <button
              key={m.key}
              role="tab"
              aria-selected={active}
              onClick={() => setMode(m.key)}
              className={cn(
                "px-4 py-1.5 text-[12px] font-medium rounded-full transition-colors",
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
                className="text-[11px] uppercase tracking-wider text-ink-3 font-semibold"
              >
                Versement mensuel
              </label>
              <span className="kpi-figure text-xl text-ink tabular-nums">
                {safe.monthly} <span className="text-sm text-ink-3 font-sans">€</span>
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
              className="w-full accent-[var(--moss-1)]"
            />
            <div className="flex justify-between text-[10px] text-ink-3 mt-1 tabular-nums">
              <span>0 €</span>
              <span>500 €</span>
              <span>1 000 €</span>
            </div>
            {monthlyInvalid && (
              <p role="alert" className="mt-2 text-[11px] text-rust">
                Versement borné entre {PROJECTION_BOUNDS.monthlyMin} € et{" "}
                {PROJECTION_BOUNDS.monthlyMax} €.
              </p>
            )}
          </div>
        ) : (
          <div>
            <label
              htmlFor="proj-target"
              className="text-[11px] uppercase tracking-wider text-ink-3 font-semibold block mb-2"
            >
              Capital cible (€ d'aujourd'hui hors inflation)
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
          <p className="text-[11px] uppercase tracking-wider text-ink-3 font-semibold mb-2">
            Horizon d'investissement
          </p>
          <div role="radiogroup" aria-label="Horizon" className="flex gap-2">
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
                    "flex-1 py-2 text-[12px] font-medium border rounded-full transition-colors",
                    active
                      ? "bg-ink text-paper border-ink"
                      : "border-paper-3 text-ink-2 hover:border-ink-3",
                  )}
                >
                  {h} ans
                </button>
              );
            })}
          </div>
        </div>

        {/* Scénario */}
        <div>
          <p className="text-[11px] uppercase tracking-wider text-ink-3 font-semibold mb-2">
            Scénario de marché
          </p>
          <div role="radiogroup" aria-label="Scénario" className="flex gap-2">
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
                    "flex-1 py-2 text-[12px] font-medium border rounded-full transition-colors",
                    active
                      ? "bg-moss-1 text-paper border-moss-1"
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
          <p className="text-[11px] uppercase tracking-wider text-ink-3 font-semibold mb-2">
            Enveloppe fiscale
          </p>
          <div role="radiogroup" aria-label="Enveloppe" className="flex gap-2">
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
                    "flex-1 py-2 text-[12px] font-medium border rounded-full transition-colors",
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
            <p className="text-[11px] uppercase tracking-wider text-ink-3 font-semibold mb-2">
              Test de résistance
            </p>
            <div role="radiogroup" aria-label="Stress" className="flex flex-wrap gap-2">
              {([
                { key: "none", label: "Aucun" },
                { key: "crash", label: "Krach −30 %" },
                { key: "pause", label: "Pause 2 ans" },
                { key: "inflation", label: "Inflation 5 %" },
              ] as const).map((s) => {
                const active = stressKey === s.key;
                return (
                  <button
                    key={s.key}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setStressKey(s.key)}
                    className={cn(
                      "px-3 py-1.5 text-[11px] font-medium border rounded-full transition-colors",
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
            label="Capital projeté (brut)"
            value={fmtEur0(result.finalValue)}
            hint={`Pouvoir d'achat équivalent aujourd'hui : ${fmtEur0(result.finalValueReal)} (infl. ${fmtPct(safe.inflation, 1)})`}
            accent
          />

          <div className="grid grid-cols-2 gap-4 mt-6">
            <KPIFigure
              size="sm"
              label="Net après fiscalité"
              value={fmtEur0(tax.netFinalValue)}
              hint={`${ENVELOPES.find((e) => e.key === envelope)!.label} · impôt ${fmtEur0(tax.tax)}`}
            />
            <KPIFigure
              size="sm"
              label={result.gain >= 0 ? "Plus-value brute" : "Perte estimée"}
              value={`${result.gain >= 0 ? "+" : ""}${fmtEur0(result.gain)}`}
              hint={`Total versé : ${fmtEur0(result.totalContributed)}`}
            />
          </div>

          {stressedResult && (
            <div className="mt-5 p-4 bg-paper-2 border-l-2 border-rust rounded-r">
              <p className="text-[10px] uppercase tracking-[0.18em] text-rust font-semibold mb-1">
                Sous stress
              </p>
              <p className="text-sm text-ink">
                Capital projeté : <span className="font-value tabular-nums">{fmtEur0(stressedResult.finalValue)}</span>{" "}
                <span className="text-ink-3">
                  ({stressedResult.finalValue - result.finalValue >= 0 ? "+" : ""}
                  {fmtEur0(stressedResult.finalValue - result.finalValue)} vs central)
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
                label="Versement mensuel requis"
                value={fmtEur0(goal.monthlyRequired)}
                hint={
                  goal.feasible
                    ? `Pour atteindre ${fmtEur0(targetCapital)} (${fmtEur0(goal.nominalTarget)} nominal) en ${safe.years} ans`
                    : `Objectif inatteignable même au plafond ${fmtEur0(PROJECTION_BOUNDS.monthlyMax)}/mois`
                }
                accent
              />
              {!goal.feasible && (
                <p role="alert" className="mt-3 text-[12px] text-rust">
                  Augmente l'horizon, baisse la cible ou choisis un scénario plus optimiste.
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
                <stop offset="0%" stopColor="var(--moss-1)" stopOpacity={0.25} />
                <stop offset="100%" stopColor="var(--moss-1)" stopOpacity={0} />
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
                background: "var(--paper)",
                border: "1px solid var(--paper-3)",
                borderRadius: 4,
                fontSize: 11,
              }}
              formatter={(value: number, name) => [
                fmtEur0(value),
                name === "withContrib"
                  ? "Avec versement"
                  : name === "withoutContrib"
                    ? "Sans versement"
                    : "Sous stress",
              ]}
              labelFormatter={(y: number) => `${y.toFixed(1)} an${y >= 2 ? "s" : ""}`}
            />
            <Area
              type="monotone"
              dataKey="withoutContrib"
              stroke="var(--moss-1)"
              strokeWidth={1.5}
              strokeDasharray="3 3"
              fill="url(#projWithout)"
            />
            <Area
              type="monotone"
              dataKey="withContrib"
              stroke="var(--gold)"
              strokeWidth={2}
              fill="url(#projWith)"
            />
            {stressedResult && (
              <Area
                type="monotone"
                dataKey="stressed"
                stroke="var(--rust)"
                strokeWidth={2}
                strokeDasharray="4 2"
                fill="none"
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-3">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-[2px] bg-gold rounded-full" /> Avec versement
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="w-3 h-[2px] rounded-full"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, var(--moss-1) 0 3px, transparent 3px 6px)",
            }}
          />{" "}
          Sans versement
        </span>
        {stressedResult && (
          <span className="inline-flex items-center gap-1.5">
            <span
              className="w-3 h-[2px] rounded-full"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(90deg, var(--rust) 0 4px, transparent 4px 6px)",
              }}
            />{" "}
            Sous stress
          </span>
        )}
      </div>

      {/* Hypothèses */}
      <details className="mt-5 border-t border-paper-3 pt-4 group">
        <summary className="text-[11px] uppercase tracking-wider text-ink-2 font-semibold cursor-pointer list-none flex items-center justify-between">
          Hypothèses de calcul
          <span className="text-ink-3 transition-transform group-open:rotate-180">▾</span>
        </summary>
        <dl className="mt-3 grid grid-cols-2 gap-y-2 gap-x-4 text-[11px]">
          <dt className="text-ink-3 uppercase tracking-wider">Rendement annualisé</dt>
          <dd className="text-ink font-medium tabular-nums text-right">
            {fmtPct(safe.annualReturn, 2)}
          </dd>
          <dt className="text-ink-3 uppercase tracking-wider">Taux mensuel équivalent</dt>
          <dd className="text-ink font-medium tabular-nums text-right">
            {fmtPct(result.monthlyRate, 3)}
          </dd>
          <dt className="text-ink-3 uppercase tracking-wider">Volatilité (réf.)</dt>
          <dd className="text-ink font-medium tabular-nums text-right">{fmtPct(vol, 1)}</dd>
          <dt className="text-ink-3 uppercase tracking-wider">Inflation</dt>
          <dd className="text-ink font-medium tabular-nums text-right">{fmtPct(safe.inflation, 1)}</dd>
          <dt className="text-ink-3 uppercase tracking-wider">Capitalisation</dt>
          <dd className="text-ink font-medium text-right">Mensuelle composée</dd>
          <dt className="text-ink-3 uppercase tracking-wider">Versement</dt>
          <dd className="text-ink font-medium text-right">Début de mois</dd>
          <dt className="text-ink-3 uppercase tracking-wider">Fiscalité</dt>
          <dd className="text-ink font-medium tabular-nums text-right">
            {fmtPct(tax.rate, 1)} effectif
          </dd>
        </dl>
        <p className="mt-3 text-[11px] text-ink-3 leading-relaxed">
          Le scénario <em>central</em> reprend le rendement attendu du portefeuille
          ({fmtPct(baseReturn, 1)}). Prudent / Optimiste : ±0,5 σ de volatilité (±{fmtPct(vol / 2, 1)}).
          {" "}
          {tax.note} Indicatif, hors abattements spécifiques, hors moins-values reportables.
          Les performances passées ne préjugent pas des performances futures.
        </p>
      </details>
    </section>
  );
}
