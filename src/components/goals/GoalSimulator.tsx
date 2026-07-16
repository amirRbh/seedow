import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { computeProjection, solveMonthlyForGoal } from "@/hooks/useProjection";
import { Slider } from "@/components/ui/slider";
import { KPIFigure } from "@/components/ui/KPIFigure";
import { formatCurrency } from "@/lib/format";
import { useLang } from "@/hooks/useLang";
import type { FinancialGoal } from "@/hooks/useFinancialGoals";

function yearsBetween(from: Date, to: Date) {
  return Math.max(0.5, (to.getTime() - from.getTime()) / (365.25 * 24 * 3600 * 1000));
}

export function GoalSimulator({ goal, annualReturn = 0.055, volatility = 0.12 }: {
  goal: FinancialGoal;
  annualReturn?: number;
  volatility?: number;
}) {
  const { t } = useTranslation();
  const { lang } = useLang();
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
      <p className="text-tag font-semibold uppercase tracking-[0.22em] text-gold mb-4">{t("goal.sim_eyebrow")}</p>

      <div className="space-y-5">
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-caption uppercase tracking-[0.18em] text-ink-3">{t("goal.sim_monthly_label")}</span>
            <span className="font-value text-xl text-ink tabular-nums">{formatCurrency(monthly, lang)}</span>
          </div>
          <Slider
            value={[monthly]}
            onValueChange={(v) => setMonthly(v[0])}
            min={0}
            max={2000}
            step={10}
          />
          <p className="mt-2 text-xs text-ink-3">
            {t("goal.sim_horizon")} <span className="text-ink tabular-nums">{years.toFixed(1)} {t("common.years")}</span> · {t("goal.sim_median_return")}{" "}
            <span className="text-ink tabular-nums">{(annualReturn * 100).toFixed(1)} %</span>
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 border-t border-paper-3 pt-5">
          <KPIFigure size="sm" label={t("goal.sim_scenario_pess")} value={formatCurrency(scenarios.pess.finalValue, lang)} />
          <KPIFigure size="sm" label={t("goal.sim_scenario_med")} value={formatCurrency(scenarios.med.finalValue, lang)} accent />
          <KPIFigure size="sm" label={t("goal.sim_scenario_opt")} value={formatCurrency(scenarios.opt.finalValue, lang)} />
        </div>

        <div className="rounded-md bg-paper-2 px-4 py-3 text-sm">
          <p className="text-ink-3 text-xs uppercase tracking-[0.18em] font-semibold mb-1">
            {t("goal.sim_to_reach", { amount: formatCurrency(goal.target_amount, lang) })}
          </p>
          {needed.feasible ? (
            <p className="text-ink">
              {t("goal.sim_required")}{" "}
              <span className="font-value text-lg tabular-nums">{formatCurrency(needed.monthlyRequired, lang)}</span>
              {gap > 0 ? (
                <span className="ml-2 text-rose-600 text-xs">
                  {t("goal.sim_gap", { amount: formatCurrency(gap, lang) })}
                </span>
              ) : (
                <span className="ml-2 text-emerald-700 text-xs">{t("goal.sim_met")}</span>
              )}
            </p>
          ) : (
            <p className="text-rose-600">{t("goal.sim_unreachable")}</p>
          )}
        </div>
      </div>
    </div>
  );
}
