import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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
  }) => Promise<{ ok: true; deposit: Deposit } | { ok: false; error: string }>;
  refresh: () => void;
}

export function useDeposits(): State {
  const { user, loading: authLoading } = useAuth();
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setDeposits([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from("deposits")
        .select("id, amount, currency, method, status, reference, asset_hint, available_at, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
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
  }, [user, authLoading, tick]);

  const addDeposit: State["addDeposit"] = useCallback(
    async ({ amount, method, asset_hint }) => {
      if (!user) return { ok: false, error: "Non authentifié" };
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
        })
        .select()
        .single();
      if (error || !data) {
        return { ok: false, error: error?.message ?? "Erreur d'enregistrement" };
      }
      const d: Deposit = { ...data, amount: Number(data.amount) } as Deposit;
      setDeposits((prev) => [d, ...prev]);
      return { ok: true, deposit: d };
    },
    [user],
  );

  const total = deposits
    .filter((d) => d.status === "settled")
    .reduce((sum, d) => sum + d.amount, 0);
  const pending = deposits
    .filter((d) => d.status === "pending")
    .reduce((sum, d) => sum + d.amount, 0);

  return { deposits, total, pending, loading, error, addDeposit, refresh };
}
