import { Link } from "@tanstack/react-router";
import { Progress } from "@/components/ui/progress";
import { GOAL_TYPE_LABEL, type FinancialGoal } from "@/hooks/useFinancialGoals";

const fmtEur = (n: number) =>
  n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function monthsBetween(from: Date, to: Date) {
  return Math.max(0, (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth()));
}

/** Projection simple : capital initial + apport mensuel à 5 %/an pour estimer la trajectoire. */
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
  const current = estimateCurrent(goal);
  const pct = Math.min(100, Math.max(0, (current / goal.target_amount) * 100));
  const target = new Date(goal.target_date);
  const monthsLeft = monthsBetween(new Date(), target);
  const yearsLeft = (monthsLeft / 12).toFixed(1);
  const status: { label: string; tone: string } =
    pct >= 100
      ? { label: "Objectif atteint", tone: "text-emerald-700" }
      : monthsLeft <= 0
        ? { label: "Échéance dépassée", tone: "text-rose-600" }
        : pct / 100 >= (1 - monthsLeft / Math.max(1, monthsBetween(new Date(goal.created_at), target)))
          ? { label: "En avance", tone: "text-emerald-700" }
          : { label: "Dans les temps", tone: "text-ink-3" };

  return (
    <article className="rounded-lg border border-paper-3 bg-paper p-6 transition-shadow hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold">
            {GOAL_TYPE_LABEL[goal.goal_type]}
          </p>
          <h3 className="mt-2 font-value text-2xl text-ink leading-tight">{goal.name}</h3>
          <p className="mt-1 text-xs text-ink-3">
            Échéance : {target.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })} ·{" "}
            {yearsLeft} an{Number(yearsLeft) > 1 ? "s" : ""} restant{Number(yearsLeft) > 1 ? "s" : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="text-[11px] uppercase tracking-[0.18em] text-ink-3 hover:text-ink"
        >
          Modifier
        </button>
      </div>

      <div className="mt-5">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-value text-ink text-lg tabular-nums">{fmtEur(current)} €</span>
          <span className="text-ink-3 tabular-nums">/ {fmtEur(goal.target_amount)} €</span>
        </div>
        <Progress value={pct} className="mt-2 h-1.5 bg-paper-3 [&>div]:bg-gold" />
        <div className="mt-2 flex items-center justify-between text-[11px]">
          <span className="text-ink-3 tabular-nums">{pct.toFixed(1)} %</span>
          <span className={`uppercase tracking-[0.18em] font-semibold ${status.tone}`}>{status.label}</span>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-paper-3 pt-4 text-xs text-ink-3">
        <span>
          Apport mensuel{" "}
          <span className="text-ink font-medium tabular-nums">
            {fmtEur(goal.monthly_contribution)} €
          </span>
        </span>
        <Link
          to="/objectifs/$goalId"
          params={{ goalId: goal.id }}
          className="text-ink hover:text-gold uppercase tracking-[0.18em] font-semibold"
        >
          Simuler →
        </Link>
      </div>
    </article>
  );
}
