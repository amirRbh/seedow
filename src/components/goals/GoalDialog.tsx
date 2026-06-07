import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useUserPortfolios } from "@/hooks/useUserPortfolios";
import { upsertGoal, deleteGoal, GOAL_TYPE_LABEL, type FinancialGoal, type GoalType } from "@/hooks/useFinancialGoals";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: FinancialGoal | null;
  onSaved: () => void;
}

export function GoalDialog({ open, onOpenChange, goal, onSaved }: Props) {
  const { user } = useAuth();
  const { portfolios } = useUserPortfolios();
  const [saving, setSaving] = useState(false);

  const defaultDate = (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 10);
    return d.toISOString().slice(0, 10);
  })();

  const [name, setName] = useState("");
  const [type, setType] = useState<GoalType>("other");
  const [target, setTarget] = useState(50000);
  const [date, setDate] = useState(defaultDate);
  const [monthly, setMonthly] = useState(200);
  const [initial, setInitial] = useState(0);
  const [portfolioId, setPortfolioId] = useState<string>("none");

  useEffect(() => {
    if (goal) {
      setName(goal.name);
      setType(goal.goal_type);
      setTarget(goal.target_amount);
      setDate(goal.target_date);
      setMonthly(goal.monthly_contribution);
      setInitial(goal.initial_capital);
      setPortfolioId(goal.portfolio_id ?? "none");
    } else if (open) {
      setName("");
      setType("other");
      setTarget(50000);
      setDate(defaultDate);
      setMonthly(200);
      setInitial(0);
      setPortfolioId("none");
    }
  }, [goal, open, defaultDate]);

  const save = async () => {
    if (!user) return;
    if (!name.trim()) {
      toast.error("Donne un nom à ton objectif.");
      return;
    }
    setSaving(true);
    try {
      await upsertGoal(
        {
          id: goal?.id,
          name,
          goal_type: type,
          target_amount: target,
          target_date: date,
          monthly_contribution: monthly,
          initial_capital: initial,
          portfolio_id: portfolioId === "none" ? null : portfolioId,
        },
        user.id,
      );
      toast.success(goal ? "Objectif mis à jour." : "Objectif créé.");
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!goal) return;
    if (!confirm("Supprimer cet objectif ?")) return;
    setSaving(true);
    try {
      await deleteGoal(goal.id);
      toast.success("Objectif supprimé.");
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-paper">
        <DialogHeader>
          <DialogTitle className="font-value text-2xl text-ink">
            {goal ? "Modifier l'objectif" : "Nouvel objectif"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="goal-name" className="text-[11px] uppercase tracking-[0.18em] text-ink-3">
              Nom
            </Label>
            <Input id="goal-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Retraite à 60 ans" maxLength={80} />
          </div>

          <div>
            <Label className="text-[11px] uppercase tracking-[0.18em] text-ink-3">Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as GoalType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(GOAL_TYPE_LABEL) as GoalType[]).map((k) => (
                  <SelectItem key={k} value={k}>{GOAL_TYPE_LABEL[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px] uppercase tracking-[0.18em] text-ink-3">Montant cible (€)</Label>
              <Input type="number" min={0} step={1000} value={target} onChange={(e) => setTarget(Number(e.target.value))} />
            </div>
            <div>
              <Label className="text-[11px] uppercase tracking-[0.18em] text-ink-3">Échéance</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px] uppercase tracking-[0.18em] text-ink-3">Apport mensuel (€)</Label>
              <Input type="number" min={0} step={10} value={monthly} onChange={(e) => setMonthly(Number(e.target.value))} />
            </div>
            <div>
              <Label className="text-[11px] uppercase tracking-[0.18em] text-ink-3">Capital de départ (€)</Label>
              <Input type="number" min={0} step={100} value={initial} onChange={(e) => setInitial(Number(e.target.value))} />
            </div>
          </div>

          <div>
            <Label className="text-[11px] uppercase tracking-[0.18em] text-ink-3">Portefeuille rattaché</Label>
            <Select value={portfolioId} onValueChange={setPortfolioId}>
              <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucun</SelectItem>
                {portfolios.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="flex sm:justify-between gap-2">
          {goal ? (
            <Button type="button" variant="ghost" onClick={remove} disabled={saving} className="text-rose-600 hover:text-rose-700">
              Supprimer
            </Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Annuler</Button>
            <Button onClick={save} disabled={saving}>{goal ? "Enregistrer" : "Créer"}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
