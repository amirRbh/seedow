import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useUserPortfolios } from "@/hooks/useUserPortfolios";
import { upsertGoal, deleteGoal, type FinancialGoal, type GoalType } from "@/hooks/useFinancialGoals";
import { toast } from "sonner";

const GOAL_TYPES: GoalType[] = ["retirement", "real_estate", "studies", "safety_net", "other"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: FinancialGoal | null;
  onSaved: () => void;
}

export function GoalDialog({ open, onOpenChange, goal, onSaved }: Props) {
  const { t } = useTranslation();
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
      toast.error(t("goal.name_required"));
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
      toast.success(goal ? t("goal.saved") : t("goal.created"));
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!goal) return;
    if (!confirm(t("goal.confirm_delete"))) return;
    setSaving(true);
    try {
      await deleteGoal(goal.id);
      toast.success(t("goal.deleted"));
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-paper">
        <DialogHeader>
          <DialogTitle className="font-value text-2xl text-ink">
            {goal ? t("goal.dialog_title_edit") : t("goal.dialog_title_new")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="goal-name" className="text-caption uppercase tracking-[0.18em] text-ink-3">
              {t("goal.name")}
            </Label>
            <Input id="goal-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("goal.name_placeholder")} maxLength={80} />
          </div>

          <div>
            <Label className="text-caption uppercase tracking-[0.18em] text-ink-3">{t("goal.type")}</Label>
            <Select value={type} onValueChange={(v) => setType(v as GoalType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {GOAL_TYPES.map((k) => (
                  <SelectItem key={k} value={k}>{t(`goal.type_${k}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-caption uppercase tracking-[0.18em] text-ink-3">{t("goal.target_amount")}</Label>
              <Input type="number" min={0} step={1000} value={target} onChange={(e) => setTarget(Number(e.target.value))} />
            </div>
            <div>
              <Label className="text-caption uppercase tracking-[0.18em] text-ink-3">{t("goal.due_date")}</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-caption uppercase tracking-[0.18em] text-ink-3">{t("goal.monthly_contribution")}</Label>
              <Input type="number" min={0} step={10} value={monthly} onChange={(e) => setMonthly(Number(e.target.value))} />
            </div>
            <div>
              <Label className="text-caption uppercase tracking-[0.18em] text-ink-3">{t("goal.initial_capital")}</Label>
              <Input type="number" min={0} step={100} value={initial} onChange={(e) => setInitial(Number(e.target.value))} />
            </div>
          </div>

          <div>
            <Label className="text-caption uppercase tracking-[0.18em] text-ink-3">{t("goal.attached_portfolio")}</Label>
            <Select value={portfolioId} onValueChange={setPortfolioId}>
              <SelectTrigger><SelectValue placeholder={t("goal.none")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("goal.none")}</SelectItem>
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
              {t("common.delete")}
            </Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>{t("common.cancel")}</Button>
            <Button onClick={save} disabled={saving}>{goal ? t("common.save") : t("common.create")}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
