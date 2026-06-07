import { createFileRoute, redirect, Link, useParams, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BottomNavigation } from "@/components/navigation/BottomNavigation";
import { AppHeader } from "@/components/navigation/AppHeader";
import { EditorialSection } from "@/components/ui/EditorialSection";
import { Button } from "@/components/ui/button";
import { GoalSimulator } from "@/components/goals/GoalSimulator";
import { GOAL_TYPE_LABEL, type FinancialGoal } from "@/hooks/useFinancialGoals";
import { useActivePortfolio } from "@/hooks/useActivePortfolio";

export const Route = createFileRoute("/objectifs/$goalId")({
  beforeLoad: async ({ params }) => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/auth", search: { redirect: `/objectifs/${params.goalId}`, mode: "login" } });
    }
  },
  component: GoalDetail,
});

function GoalDetail() {
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
        .select("id, name, goal_type, target_amount, target_date, monthly_contribution, initial_capital, portfolio_id, created_at, updated_at")
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
    return () => { cancelled = true; };
  }, [goalId]);

  if (loading) {
    return <div className="min-h-screen bg-paper p-10"><p className="text-ink-3">Chargement…</p></div>;
  }
  if (!goal) {
    return (
      <div className="min-h-screen bg-paper p-10 text-center">
        <p className="font-value text-2xl text-ink">Objectif introuvable</p>
        <Button className="mt-4" onClick={() => navigate({ to: "/objectifs" })}>Retour</Button>
      </div>
    );
  }

  const annualReturn = portfolio?.metrics?.expected_return ?? 0.055;
  const volatility = portfolio?.metrics?.volatility ?? 0.12;

  return (
    <div className="min-h-screen bg-paper pb-24 md:pb-12">
      <AppHeader />
      <div className="mx-auto max-w-3xl px-4 md:px-8">
        <Link to="/objectifs" className="text-[11px] uppercase tracking-[0.18em] text-ink-3 hover:text-ink">
          ← Tous les objectifs
        </Link>
        <EditorialSection
          eyebrow={GOAL_TYPE_LABEL[goal.goal_type]}
          title={goal.name}
          kicker={`Échéance ${new Date(goal.target_date).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`}
        >
          <GoalSimulator goal={goal} annualReturn={annualReturn} volatility={volatility} />
        </EditorialSection>
      </div>
      <BottomNavigation />
    </div>
  );
}
