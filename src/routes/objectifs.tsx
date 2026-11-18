import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { BottomNavigation } from "@/components/navigation/BottomNavigation";
import { AppHeader } from "@/components/navigation/AppHeader";
import { Plus, Target } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { RevealGroup } from "@/components/motion/Reveal";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useFinancialGoals, type FinancialGoal } from "@/hooks/useFinancialGoals";
import { GoalCard } from "@/components/goals/GoalCard";
import { GoalDialog } from "@/components/goals/GoalDialog";
import { requireAuthedUser } from "@/lib/auth/requireAuthedUser";

export const Route = createFileRoute("/objectifs")({
  beforeLoad: () => requireAuthedUser("/objectifs"),
  component: ObjectifsPage,
  head: () => ({
    meta: [
      { title: "Objectifs — seedow" },
      {
        name: "description",
        content: "Définis tes objectifs financiers et suis ta progression vers la cible.",
      },
    ],
  }),
});

function ObjectifsPage() {
  const { t } = useTranslation();
  const { goals, loading, refresh } = useFinancialGoals();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FinancialGoal | null>(null);

  const openNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (g: FinancialGoal) => {
    setEditing(g);
    setDialogOpen(true);
  };

  return (
    <div className="min-h-screen">
      <div className="page page--wide accent-solar">
        <AppHeader
          eyebrow={t("objectives.section_eyebrow")}
          title={t("objectives.section_title")}
          subtitle={t("objectives.section_kicker")}
        />
        <div className="px-5">
          {goals.length > 0 && (
            <div className="mb-5 flex justify-end">
              <Button onClick={openNew}>
                <Plus aria-hidden />
                {t("objectives.new_goal")}
              </Button>
            </div>
          )}

          {loading ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-44 w-full rounded-[24px]" />
              <Skeleton className="h-44 w-full rounded-[24px]" />
            </div>
          ) : goals.length === 0 ? (
            <EmptyState
              icon={Target}
              title={t("objectives.empty_title")}
              description={t("objectives.empty_desc")}
              action={
                <Button onClick={openNew}>
                  <Plus aria-hidden />
                  {t("objectives.create_goal")}
                </Button>
              }
            />
          ) : (
            <RevealGroup className="grid gap-4 md:grid-cols-2">
              {goals.map((g) => (
                <GoalCard key={g.id} goal={g} onEdit={() => openEdit(g)} />
              ))}
            </RevealGroup>
          )}

          <p className="mt-10 text-body-sm text-ink-3">
            {t("objectives.estimates_note")}{" "}
            <Link
              to="/methodologie"
              className="font-semibold text-ink-2 underline underline-offset-2"
            >
              {t("objectives.methodology_link")}
            </Link>
            .
          </p>
        </div>
      </div>

      <GoalDialog open={dialogOpen} onOpenChange={setDialogOpen} goal={editing} onSaved={refresh} />
      <BottomNavigation />
    </div>
  );
}
