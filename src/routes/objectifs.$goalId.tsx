import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { BottomNavigation } from "@/components/navigation/BottomNavigation";
import { AppHeader } from "@/components/navigation/AppHeader";
import { EditorialSection } from "@/components/ui/EditorialSection";
import { Button } from "@/components/ui/button";
import { GoalSimulator } from "@/components/goals/GoalSimulator";
import { GOAL_TYPE_LABEL, type FinancialGoal } from "@/hooks/useFinancialGoals";
import { useActivePortfolio } from "@/hooks/useActivePortfolio";
import { useLang } from "@/hooks/useLang";
import { formatDate } from "@/lib/format";
import { requireAuthedUser } from "@/lib/auth/requireAuthedUser";

export const Route = createFileRoute("/objectifs/$goalId")({
  beforeLoad: ({ params }) => requireAuthedUser(`/objectifs/${params.goalId}`),
  component: GoalDetail,
});

function GoalDetail() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const { goalId } = useParams({ from: "/objectifs/$goalId" });
  const navigate = useNavigate();
  const { portfolio } = useActivePortfolio();
  const [goal, setGoal] = useState<FinancialGoal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("financial_goals")
        .select(
          "id, name, goal_type, target_amount, target_date, monthly_contribution, initial_capital, portfolio_id, created_at, updated_at",
        )
        .eq("id", goalId)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setGoal(null);
      } else {
        setGoal({
          ...data,
          target_amount: Number(data.target_amount),
          monthly_contribution: Number(data.monthly_contribution),
          initial_capital: Number(data.initial_capital),
        });
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [goalId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-paper p-10">
        <p className="text-ink-3">{t("objectives.loading")}</p>
      </div>
    );
  }
  if (!goal) {
    return (
      <div className="min-h-screen bg-paper p-10 text-center">
        <p className="font-value text-2xl text-ink">{t("objectives.goal_not_found")}</p>
        <Button className="mt-4" onClick={() => navigate({ to: "/objectifs" })}>
          {t("objectives.back")}
        </Button>
      </div>
    );
  }

  const annualReturn = portfolio?.metrics?.expected_return ?? 0.055;
  const volatility = portfolio?.metrics?.volatility ?? 0.12;
  const dueDate = formatDate(goal.target_date, lang, { month: "long", year: "numeric" });

  return (
    <div className="min-h-screen bg-paper pb-24 md:pb-12">
      <AppHeader eyebrow={t("objectives.eyebrow_goal")} title={goal.name} />
      <div className="mx-auto max-w-3xl px-4 md:px-8">
        <Link
          to="/objectifs"
          className="text-caption uppercase tracking-[0.18em] text-ink-3 hover:text-ink"
        >
          {t("objectives.all_goals")}
        </Link>
        <EditorialSection
          eyebrow={GOAL_TYPE_LABEL[goal.goal_type]}
          title={goal.name}
          kicker={t("objectives.due", { date: dueDate })}
        >
          <GoalSimulator goal={goal} annualReturn={annualReturn} volatility={volatility} />
        </EditorialSection>
      </div>
      <BottomNavigation />
    </div>
  );
}
