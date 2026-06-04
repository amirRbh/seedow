import { useMemo, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { KPIFigure } from "@/components/ui/KPIFigure";
import {
  PROJECTION_BOUNDS,
  sanitizeProjectionInput,
  useProjection,
} from "@/hooks/useProjection";
import { cn } from "@/lib/utils";

interface Props {
  initialAmount: number;
  /** Rendement annualisé attendu du portefeuille (ex 0.06). */
  expectedReturn: number;
  /** Volatilité annualisée (ex 0.12). */
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
  const [monthly, setMonthly] = useState(100);
  const [horizon, setHorizon] = useState<Horizon>(10);
  const [scenario, setScenario] = useState<Scenario>("central");

  // Hypothèses : fallback raisonnables si métriques manquantes (ETF actions long terme).
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

  // Validation centralisée (bornes + warnings éventuels)
  const { input: safe } = useMemo(
    () =>
      sanitizeProjectionInput({
        initial: initialAmount,
        monthly,
        years: horizon,
        annualReturn: rawAnnualReturn,
      }),
    [initialAmount, monthly, horizon, rawAnnualReturn],
  );

  const result = useProjection(safe.initial, safe.monthly, safe.years, safe.annualReturn);

  // Garde-fous d'affichage
  const monthlyInvalid = monthly < PROJECTION_BOUNDS.monthlyMin || monthly > PROJECTION_BOUNDS.monthlyMax;

  return (
    <section className="px-5 pt-10" aria-labelledby="simulator-title">
      <div className="gold-rule mb-5" />
      <p className="text-[10px] uppercase tracking-[0.22em] text-gold font-semibold mb-3">
        Projection
      </p>
      <h2 id="simulator-title" className="font-value text-2xl text-ink leading-tight">
        Et si tu versais chaque mois ?
      </h2>
      <p className="text-sm text-ink-3 mt-2">
        Capital projeté sur {safe.years} ans à partir de {fmtEur2(safe.initial)}.
      </p>

      {/* Contrôles */}
      <div className="mt-6 space-y-5">
        {/* Versement mensuel */}
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
      </div>

      {/* Résultats */}
      <div className="mt-8 border-t border-paper-3 pt-6">
        <KPIFigure
          size="lg"
          label="Capital projeté"
          value={fmtEur0(result.finalValue)}
          hint={`Sans versement mensuel : ${fmtEur0(result.finalValueWithout)}`}
          accent
        />

        <div className="grid grid-cols-2 gap-4 mt-6">
          <KPIFigure
            size="sm"
            label="Total versé"
            value={fmtEur0(result.totalContributed)}
            hint={`dont ${fmtEur0(result.contributionsOnly)} de versements mensuels`}
          />
          <KPIFigure
            size="sm"
            label={result.gain >= 0 ? "Plus-value estimée" : "Perte estimée"}
            value={`${result.gain >= 0 ? "+" : ""}${fmtEur0(result.gain)}`}
          />
        </div>
      </div>

      {/* Graph */}
      <div className="mt-6 h-48 -mx-1" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={result.series} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
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
                name === "withContrib" ? "Avec versement" : "Sans versement",
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
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex items-center gap-4 text-[11px] text-ink-3">
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
          <dt className="text-ink-3 uppercase tracking-wider">Capitalisation</dt>
          <dd className="text-ink font-medium text-right">Mensuelle composée</dd>
          <dt className="text-ink-3 uppercase tracking-wider">Versement</dt>
          <dd className="text-ink font-medium text-right">Début de mois</dd>
          <dt className="text-ink-3 uppercase tracking-wider">Fiscalité &amp; frais</dt>
          <dd className="text-ink font-medium text-right">Non inclus</dd>
        </dl>
        <p className="mt-3 text-[11px] text-ink-3 leading-relaxed">
          Le scénario <em>central</em> reprend le rendement attendu du portefeuille
          ({fmtPct(baseReturn, 1)}). Les scénarios <em>prudent</em> et <em>optimiste</em>{" "}
          retranchent ou ajoutent 0,5 σ de volatilité (±{fmtPct(vol / 2, 1)}). Projection
          déterministe — elle n'estime pas la dispersion réelle des rendements et
          n'intègre ni inflation, ni fiscalité, ni frais de gestion. Les performances
          passées ne préjugent pas des performances futures.
        </p>
      </details>
    </section>
  );
}
