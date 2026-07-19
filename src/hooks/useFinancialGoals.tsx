import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Database } from "@/integrations/supabase/types";

export type GoalType = Database["public"]["Enums"]["goal_type"];

export interface FinancialGoal {
  id: string;
  name: string;
  goal_type: GoalType;
  target_amount: number;
  target_date: string;
  monthly_contribution: number;
  initial_capital: number;
  portfolio_id: string | null;
  created_at: string;
  updated_at: string;
}

export const GOAL_TYPE_LABEL: Record<GoalType, string> = {
  retirement: "Retraite",
  real_estate: "Achat immobilier",
  studies: "Études",
  safety_net: "Fonds de précaution",
  other: "Autre",
};

async function fetchGoals(userId: string): Promise<FinancialGoal[]> {
  const { data, error } = await supabase
    .from("financial_goals")
    .select(
      "id, name, goal_type, target_amount, target_date, monthly_contribution, initial_capital, portfolio_id, created_at, updated_at",
    )
    .eq("user_id", userId)
    .order("target_date", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((g) => ({
    ...g,
    target_amount: Number(g.target_amount),
    monthly_contribution: Number(g.monthly_contribution),
    initial_capital: Number(g.initial_capital),
  }));
}

export function useFinancialGoals() {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const ready = !authLoading && !!user;
  const { data, isLoading: queryLoading } = useQuery({
    queryKey: ["financial-goals", user?.id],
    queryFn: () => fetchGoals(user!.id),
    enabled: ready,
  });

  const goals = data ?? [];
  const loading = authLoading || (!!user && queryLoading);

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["financial-goals", user?.id] });
  }, [queryClient, user?.id]);

  return { goals, loading, refresh };
}

export interface GoalInput {
  id?: string;
  name: string;
  goal_type: GoalType;
  target_amount: number;
  target_date: string;
  monthly_contribution: number;
  initial_capital: number;
  portfolio_id: string | null;
}

export async function upsertGoal(input: GoalInput, userId: string) {
  const payload = {
    user_id: userId,
    name: input.name.trim().slice(0, 80),
    goal_type: input.goal_type,
    target_amount: input.target_amount,
    target_date: input.target_date,
    monthly_contribution: input.monthly_contribution,
    initial_capital: input.initial_capital,
    portfolio_id: input.portfolio_id,
  };
  if (input.id) {
    const { error } = await supabase.from("financial_goals").update(payload).eq("id", input.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("financial_goals").insert(payload);
    if (error) throw new Error(error.message);
  }
}

export async function deleteGoal(id: string) {
  const { error } = await supabase.from("financial_goals").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
