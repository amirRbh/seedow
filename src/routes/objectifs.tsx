import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BottomNavigation } from "@/components/navigation/BottomNavigation";
import { AppHeader } from "@/components/navigation/AppHeader";
import { EditorialSection } from "@/components/ui/EditorialSection";
import { Button } from "@/components/ui/button";
import { useFinancialGoals, type FinancialGoal } from "@/hooks/useFinancialGoals";
import { GoalCard } from "@/components/goals/GoalCard";
import { GoalDialog } from "@/components/goals/GoalDialog";

export const Route = createFileRoute("/objectifs")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/auth", search: { redirect: "/objectifs", mode: "login" } });
    }
  },
  component: ObjectifsPage,
  head: () => ({
    meta: [
      { title: "Objectifs — seedow" },
      { name: "description", content: "Définis tes objectifs financiers et suis ta progression vers la cible." },
    ],
  }),
});

function ObjectifsPage() {
  const { goals, loading, refresh } = useFinancialGoals();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FinancialGoal | null>(null);

  const openNew = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (g: FinancialGoal) => { setEditing(g); setDialogOpen(true); };

  return (
    <div className="min-h-screen bg-paper pb-24 md:pb-12">
      <AppHeader eyebrow="Cap" title="Objectifs" />
      <div className="mx-auto max-w-5xl px-4 md:px-8">
        <EditorialSection
          eyebrow="Objectifs financiers"
          title="Vise précis, suis ta trajectoire."
          kicker="Retraite, achat, études — donne un cap à ton épargne et mesure l'écart à la cible."
          number="01"
        >
          <div className="flex justify-end mb-6">
            <Button onClick={openNew}>Nouvel objectif</Button>
          </div>

          {loading ? (
            <p className="text-ink-3 text-sm">Chargement…</p>
          ) : goals.length === 0 ? (
            <div className="rounded-lg border border-dashed border-paper-3 bg-paper p-10 text-center">
              <p className="font-value text-xl text-ink">Aucun objectif pour l'instant</p>
              <p className="mt-2 text-sm text-ink-3">Crée ton premier objectif pour visualiser ta progression.</p>
              <Button className="mt-6" onClick={openNew}>Créer un objectif</Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {goals.map((g) => (
                <GoalCard key={g.id} goal={g} onEdit={() => openEdit(g)} />
              ))}
            </div>
          )}

          <div className="gold-rule my-10" />
          <p className="text-xs text-ink-3">
            Estimations indicatives à 5 %/an. Voir{" "}
            <Link to="/methodologie" className="underline">méthodologie</Link>.
          </p>
        </EditorialSection>
      </div>

      <GoalDialog open={dialogOpen} onOpenChange={setDialogOpen} goal={editing} onSaved={refresh} />
      <BottomNavigation />
    </div>
  );
}
