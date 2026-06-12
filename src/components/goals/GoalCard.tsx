import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Progress } from "@/components/ui/progress";
import { type FinancialGoal } from "@/hooks/useFinancialGoals";
import { formatCurrency, formatDate } from "@/lib/format";
import { useLang } from "@/hooks/useLang";

function monthsBetween(from: Date, to: Date) {
  return Math.max(0, (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth()));
}

function estimateCurrent(goal: FinancialGoal): number {
  const start = new Date(goal.created_at);
  const now = new Date();
  const months = monthsBetween(start, now);
  const r = Math.pow(1.05, 1 / 12) - 1;
  let v = goal.initial_capital;
  for (let m = 0; m < months; m++) {
    v = (v + goal.monthly_contribution) * (1 + r);
  }
  return v;
}

export function GoalCard({ goal, onEdit }: { goal: FinancialGoal; onEdit: () => void }) {
  const { t } = useTranslation();
  const lang = useLang();
  const current = estimateCurrent(goal);
  const pct = Math.min(100, Math.max(0, (current / goal.target_amount) * 100));
  const target = new Date(goal.target_date);
  const monthsLeft = monthsBetween(new Date(), target);
  const yearsLeft = (monthsLeft / 12).toFixed(1);
  const status: { label: string; tone: string } =
    pct >= 100
      ? { label: t("goal.status_reached"), tone: "text-emerald-700" }
      : monthsLeft <= 0
        ? { label: t("goal.status_overdue"), tone: "text-rose-600" }
        : pct / 100 >= (1 - monthsLeft / Math.max(1, monthsBetween(new Date(goal.created_at), target)))
          ? { label: t("goal.status_ahead"), tone: "text-emerald-700" }
          : { label: t("goal.status_on_track"), tone: "text-ink-3" };

  return (
    <article className="rounded-lg border border-paper-3 bg-paper p-6 transition-shadow hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold">
            {t(`goal.type_${goal.goal_type}`)}
          </p>
          <h3 className="mt-2 font-value text-2xl text-ink leading-tight">{goal.name}</h3>
          <p className="mt-1 text-xs text-ink-3">
            {t("goal.due_label", {
              date: formatDate(target, lang, { month: "long", year: "numeric" }),
              years: yearsLeft,
            })}
          </p>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="text-[11px] uppercase tracking-[0.18em] text-ink-3 hover:text-ink"
        >
          {t("common.edit")}
        </button>
      </div>

      <div className="mt-5">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-value text-ink text-lg tabular-nums">{formatCurrency(current, lang)}</span>
          <span className="text-ink-3 tabular-nums">/ {formatCurrency(goal.target_amount, lang)}</span>
        </div>
        <Progress value={pct} className="mt-2 h-1.5 bg-paper-3 [&>div]:bg-gold" />
        <div className="mt-2 flex items-center justify-between text-[11px]">
          <span className="text-ink-3 tabular-nums">{pct.toFixed(1)} %</span>
          <span className={`uppercase tracking-[0.18em] font-semibold ${status.tone}`}>{status.label}</span>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-paper-3 pt-4 text-xs text-ink-3">
        <span>
          {t("goal.monthly_label")}{" "}
          <span className="text-ink font-medium tabular-nums">
            {formatCurrency(goal.monthly_contribution, lang)}
          </span>
        </span>
        <Link
          to="/objectifs/$goalId"
          params={{ goalId: goal.id }}
          className="text-ink hover:text-gold uppercase tracking-[0.18em] font-semibold"
        >
          {t("goal.simulate")}
        </Link>
      </div>
    </article>
  );
}
