import { useMemo, useState } from "react";
import { computeProjection, solveMonthlyForGoal } from "@/hooks/useProjection";
import { Slider } from "@/components/ui/slider";
import { KPIFigure } from "@/components/ui/KPIFigure";
import type { FinancialGoal } from "@/hooks/useFinancialGoals";

const fmtEur = (n: number) =>
  n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function yearsBetween(from: Date, to: Date) {
  return Math.max(0.5, (to.getTime() - from.getTime()) / (365.25 * 24 * 3600 * 1000));
}

export function GoalSimulator({ goal, annualReturn = 0.055, volatility = 0.12 }: {
  goal: FinancialGoal;
  annualReturn?: number;
  volatility?: number;
}) {
  const years = yearsBetween(new Date(), new Date(goal.target_date));
  const [monthly, setMonthly] = useState(goal.monthly_contribution);

  const scenarios = useMemo(() => {
    const base = (ret: number) =>
      computeProjection({
        initial: goal.initial_capital,
        monthly,
        years,
        annualReturn: ret,
      });
    return {
      pess: base(annualReturn - volatility),
      med: base(annualReturn),
      opt: base(annualReturn + volatility),
    };
  }, [goal.initial_capital, monthly, years, annualReturn, volatility]);

  const needed = useMemo(
    () =>
      solveMonthlyForGoal({
        targetCapital: goal.target_amount,
        initial: goal.initial_capital,
        years,
        annualReturn,
      }),
    [goal.target_amount, goal.initial_capital, years, annualReturn],
  );

  const gap = needed.monthlyRequired - monthly;

  return (
    <div className="rounded-lg border border-paper-3 bg-paper p-6">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold mb-4">Simulateur</p>

      <div className="space-y-5">
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-[11px] uppercase tracking-[0.18em] text-ink-3">Apport mensuel</span>
            <span className="font-value text-xl text-ink tabular-nums">{fmtEur(monthly)} €</span>
          </div>
          <Slider
            value={[monthly]}
            onValueChange={(v) => setMonthly(v[0])}
            min={0}
            max={2000}
            step={10}
          />
          <p className="mt-2 text-xs text-ink-3">
            Horizon estimé : <span className="text-ink tabular-nums">{years.toFixed(1)} ans</span> · Rendement médian{" "}
            <span className="text-ink tabular-nums">{(annualReturn * 100).toFixed(1)} %</span>
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 border-t border-paper-3 pt-5">
          <KPIFigure size="sm" label="Pessimiste" value={fmtEur(scenarios.pess.finalValue)} unit="€" />
          <KPIFigure size="sm" label="Médian" value={fmtEur(scenarios.med.finalValue)} unit="€" accent />
          <KPIFigure size="sm" label="Optimiste" value={fmtEur(scenarios.opt.finalValue)} unit="€" />
        </div>

        <div className="rounded-md bg-paper-2 px-4 py-3 text-sm">
          <p className="text-ink-3 text-xs uppercase tracking-[0.18em] font-semibold mb-1">
            Pour atteindre {fmtEur(goal.target_amount)} €
          </p>
          {needed.feasible ? (
            <p className="text-ink">
              Apport mensuel requis :{" "}
              <span className="font-value text-lg tabular-nums">{fmtEur(needed.monthlyRequired)} €</span>
              {gap > 0 ? (
                <span className="ml-2 text-rose-600 text-xs">
                  (manque {fmtEur(gap)} € / mois)
                </span>
              ) : (
                <span className="ml-2 text-emerald-700 text-xs">objectif tenu</span>
              )}
            </p>
          ) : (
            <p className="text-rose-600">
              Objectif difficile à atteindre dans le délai. Augmente l'horizon ou la cible.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
