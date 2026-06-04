import { useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { KPIFigure } from "@/components/ui/KPIFigure";
import { useProjection } from "@/hooks/useProjection";
import { cn } from "@/lib/utils";

interface Props {
  initialAmount: number;
  expectedReturn: number; // ex: 0.06
  volatility: number; // ex: 0.12
}

const HORIZONS = [5, 10, 20] as const;
type Horizon = (typeof HORIZONS)[number];

type Scenario = "prudent" | "central" | "optimiste";
const SCENARIO_LABELS: Record<Scenario, string> = {
  prudent: "Prudent",
  central: "Central",
  optimiste: "Optimiste",
};

const fmtEur = (n: number) =>
  n.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

export function ProjectionSimulator({ initialAmount, expectedReturn, volatility }: Props) {
  const [monthly, setMonthly] = useState(100);
  const [horizon, setHorizon] = useState<Horizon>(10);
  const [scenario, setScenario] = useState<Scenario>("central");

  const baseReturn = expectedReturn > 0 ? expectedReturn : 0.05;
  const vol = volatility > 0 ? volatility : 0.12;
  const annualReturn =
    scenario === "central"
      ? baseReturn
      : scenario === "prudent"
        ? Math.max(0.005, baseReturn - 0.5 * vol)
        : baseReturn + 0.5 * vol;

  const result = useProjection(initialAmount, monthly, horizon, annualReturn);

  return (
    <section className="px-5 pt-10">
      <div className="gold-rule mb-5" />
      <p className="text-[10px] uppercase tracking-[0.22em] text-gold font-semibold mb-3">
        Projection
      </p>
      <h2 className="font-value text-2xl text-ink leading-tight">
        Et si tu versais chaque mois ?
      </h2>
      <p className="text-sm text-ink-3 mt-2">
        Capital projeté sur {horizon} ans à partir de {fmtEur(initialAmount)}.
      </p>

      {/* Contrôles */}
      <div className="mt-6 space-y-5">
        {/* Montant mensuel */}
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <label
              htmlFor="monthly"
              className="text-[11px] uppercase tracking-wider text-ink-3 font-semibold"
            >
              Versement mensuel
            </label>
            <span className="kpi-figure text-xl text-ink tabular-nums">
              {monthly} <span className="text-sm text-ink-3 font-sans">€</span>
            </span>
          </div>
          <input
            id="monthly"
            type="range"
            min={0}
            max={1000}
            step={25}
            value={monthly}
            onChange={(e) => setMonthly(Number(e.target.value))}
            className="w-full accent-[var(--moss-1)]"
          />
          <div className="flex justify-between text-[10px] text-ink-3 mt-1 tabular-nums">
            <span>0 €</span>
            <span>500 €</span>
            <span>1 000 €</span>
          </div>
        </div>

        {/* Horizon */}
        <div>
          <p className="text-[11px] uppercase tracking-wider text-ink-3 font-semibold mb-2">
            Horizon
          </p>
          <div className="flex gap-2">
            {HORIZONS.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setHorizon(h)}
                className={cn(
                  "flex-1 py-2 text-[12px] font-medium border rounded-full transition-colors",
                  horizon === h
                    ? "bg-ink text-paper border-ink"
                    : "border-paper-3 text-ink-2 hover:border-ink-3",
                )}
              >
                {h} ans
              </button>
            ))}
          </div>
        </div>

        {/* Scénario */}
        <div>
          <p className="text-[11px] uppercase tracking-wider text-ink-3 font-semibold mb-2">
            Scénario de marché
          </p>
          <div className="flex gap-2">
            {(Object.keys(SCENARIO_LABELS) as Scenario[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setScenario(s)}
                className={cn(
                  "flex-1 py-2 text-[12px] font-medium border rounded-full transition-colors",
                  scenario === s
                    ? "bg-moss-1 text-paper border-moss-1"
                    : "border-paper-3 text-ink-2 hover:border-ink-3",
                )}
              >
                {SCENARIO_LABELS[s]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Résultats */}
      <div className="mt-8 border-t border-paper-3 pt-6">
        <KPIFigure
          size="lg"
          label="Capital projeté"
          value={result.finalValue.toLocaleString("fr-FR", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })}
          unit="€"
          accent
        />

        <div className="grid grid-cols-2 gap-4 mt-6">
          <KPIFigure
            size="sm"
            label="Total versé"
            value={result.contributed.toLocaleString("fr-FR", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}
            unit="€"
          />
          <KPIFigure
            size="sm"
            label="Plus-value estimée"
            value={`+${result.gain.toLocaleString("fr-FR", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}`}
            unit="€"
          />
        </div>
      </div>

      {/* Graph */}
      <div className="mt-6 h-48 -mx-1">
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
                fmtEur(value),
                name === "withContrib" ? "Avec versement" : "Sans versement",
              ]}
              labelFormatter={(y: number) => `${y.toFixed(1)} an${y > 1 ? "s" : ""}`}
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

      <p className="mt-4 text-[11px] text-ink-3 leading-relaxed">
        Projection indicative, non contractuelle. Hypothèse :{" "}
        <span className="tabular-nums">{(annualReturn * 100).toFixed(1)} %</span> annualisé
        (volatilité {(vol * 100).toFixed(0)} %). Les performances passées ne préjugent pas des
        performances futures.
      </p>
    </section>
  );
}
