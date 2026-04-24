import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserPortfolios } from "@/hooks/useUserPortfolios";

export type DepositMethod = "card" | "wallet" | "sepa";
export type DepositStatus = "pending" | "settled" | "failed";

export interface Deposit {
  id: string;
  amount: number;
  currency: string;
  method: DepositMethod;
  status: DepositStatus;
  reference: string | null;
  asset_hint: string | null;
  available_at: string;
  created_at: string;
  portfolio_id: string | null;
}

interface State {
  deposits: Deposit[];
  total: number;
  pending: number;
  loading: boolean;
  error: string | null;
  addDeposit: (input: {
    amount: number;
    method: DepositMethod;
    asset_hint?: string;
    /** Override the active portfolio target. Defaults to the currently selected portfolio. */
    portfolio_id?: string | null;
  }) => Promise<{ ok: true; deposit: Deposit } | { ok: false; error: string }>;
  refresh: () => void;
}

/**
 * Returns deposits SCOPED to the currently selected portfolio.
 * If no portfolio is selected (e.g. brand-new user), returns an empty list.
 */
export function useDeposits(): State {
  const { user, loading: authLoading } = useAuth();
  const { activeId, loading: pfListLoading } = useUserPortfolios();
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (authLoading || pfListLoading) return;
    if (!user) {
      setDeposits([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      let query = supabase
        .from("deposits")
        .select("id, amount, currency, method, status, reference, asset_hint, available_at, created_at, portfolio_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (activeId) {
        query = query.eq("portfolio_id", activeId);
      } else {
        // No portfolio selected → only show legacy deposits with no portfolio assignment
        query = query.is("portfolio_id", null);
      }
      const { data, error } = await query;
      if (cancelled) return;
      if (error) {
        setError(error.message);
        setDeposits([]);
      } else {
        setDeposits(
          (data ?? []).map((d) => ({
            ...d,
            amount: Number(d.amount),
          })) as Deposit[],
        );
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading, pfListLoading, activeId, tick]);

  const addDeposit: State["addDeposit"] = useCallback(
    async ({ amount, method, asset_hint, portfolio_id }) => {
      if (!user) return { ok: false, error: "Non authentifié" };
      const targetPortfolio = portfolio_id !== undefined ? portfolio_id : activeId;
      const status: DepositStatus = method === "sepa" ? "pending" : "settled";
      const availableAt =
        method === "sepa"
          ? new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
          : new Date().toISOString();
      const reference = `SEEDOW-${Date.now().toString(36).toUpperCase()}`;
      const { data, error } = await supabase
        .from("deposits")
        .insert({
          user_id: user.id,
          amount,
          method,
          status,
          reference,
          asset_hint: asset_hint ?? null,
          available_at: availableAt,
          portfolio_id: targetPortfolio,
        })
        .select()
        .single();
      if (error || !data) {
        return { ok: false, error: error?.message ?? "Erreur d'enregistrement" };
      }
      const d: Deposit = { ...data, amount: Number(data.amount) } as Deposit;
      // Only add to local list if it matches the currently viewed portfolio
      if (targetPortfolio === activeId || (targetPortfolio == null && activeId == null)) {
        setDeposits((prev) => [d, ...prev]);
      }
      return { ok: true, deposit: d };
    },
    [user, activeId],
  );

  const total = deposits
    .filter((d) => d.status === "settled")
    .reduce((sum, d) => sum + d.amount, 0);
  const pending = deposits
    .filter((d) => d.status === "pending")
    .reduce((sum, d) => sum + d.amount, 0);

  return { deposits, total, pending, loading, error, addDeposit, refresh };
}
