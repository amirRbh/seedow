import { useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserPortfolios } from "@/hooks/useUserPortfolios";

export interface ActiveHolding {
  id: string;
  ticker: string;
  name: string;
  category: string; // asset_class
  allocationPct: number; // 0..100
  esgScore: number;
  region: string | null;
}

export interface ActivePortfolioMetrics {
  expected_return: number;
  volatility: number;
  sharpe: number;
  esg_score: number;
  ter: number;
  co2_avoided_tons: number;
  diversification: number;
}

export interface ActivePortfolio {
  id: string;
  name: string;
  initial_amount: number;
  generated_at: string;
  holdings: ActiveHolding[];
  metrics: ActivePortfolioMetrics | null;
}

interface State {
  portfolio: ActivePortfolio | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

async function fetchActivePortfolio(
  userId: string,
  activeId: string | null,
): Promise<ActivePortfolio | null> {
  let query = supabase
    .from("portfolios")
    .select("id, name, initial_amount, generated_at, weights, metrics")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (activeId) {
    query = query.eq("id", activeId);
  } else {
    query = query.order("generated_at", { ascending: false }).limit(1);
  }

  const { data: portfolios, error: pfErr } = await query;
  if (pfErr) throw new Error(pfErr.message);

  const pf = portfolios?.[0] ?? null;
  if (!pf) return null;

  const weights = (pf.weights ?? {}) as Record<string, number>;
  const ids = Object.keys(weights).filter((id) => weights[id] > 0);

  let holdings: ActiveHolding[] = [];
  if (ids.length > 0) {
    const { data: assets, error: aErr } = await supabase
      .from("assets")
      .select("id, ticker, name, asset_class, esg_score, region")
      .in("id", ids);
    if (aErr) throw new Error(aErr.message);
    holdings = (assets ?? []).map((a) => ({
      id: a.id,
      ticker: a.ticker,
      name: a.name,
      category: a.asset_class,
      allocationPct: (weights[a.id] ?? 0) * 100,
      esgScore: Number(a.esg_score),
      region: a.region,
    }));
    holdings.sort((a, b) => b.allocationPct - a.allocationPct);
  }

  return {
    id: pf.id,
    name: pf.name,
    initial_amount: Number(pf.initial_amount ?? 0),
    generated_at: pf.generated_at,
    holdings,
    metrics: (pf.metrics ?? null) as ActivePortfolioMetrics | null,
  };
}

export function useActivePortfolio(): State {
  const { user, loading: authLoading } = useAuth();
  const { activeId, loading: pfListLoading } = useUserPortfolios();
  const queryClient = useQueryClient();

  const ready = !authLoading && !pfListLoading && !!user;
  const {
    data,
    isLoading: queryLoading,
    error: queryError,
  } = useQuery({
    queryKey: ["active-portfolio", user?.id, activeId],
    queryFn: () => fetchActivePortfolio(user!.id, activeId),
    enabled: ready,
  });

  const portfolio = data ?? null;
  const loading = authLoading || pfListLoading || (!!user && queryLoading);
  const error = queryError instanceof Error ? queryError.message : null;

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["active-portfolio", user?.id] });
  }, [queryClient, user?.id]);

  // Realtime : un canal par portefeuille actif. Quand `activeId` change,
  // l'effet se rejoue → ancien canal délié proprement avant qu'un nouveau
  // ne s'abonne, donc aucun listener fantôme ne reste actif.
  useEffect(() => {
    if (!user) return;
    // On attend que la résolution du portefeuille actif soit faite côté contexte
    // pour éviter un cycle inutile (abonnement large → abonnement filtré).
    const targetId = portfolio?.id ?? activeId ?? null;

    let active = true;
    const suffix = Math.random().toString(36).slice(2);
    const channelName = targetId
      ? `pf:${user.id}:${targetId}:${suffix}`
      : `pf:${user.id}:all:${suffix}`;

    const filter = targetId ? `id=eq.${targetId}` : `user_id=eq.${user.id}`;

    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", { event: "*", schema: "public", table: "portfolios", filter }, () => {
        if (!active) return;
        void queryClient.invalidateQueries({ queryKey: ["active-portfolio", user.id] });
      })
      .subscribe();

    return () => {
      active = false;
      try {
        channel.unsubscribe();
      } catch {
        /* noop */
      }
      supabase.removeChannel(channel);
    };
  }, [user, activeId, portfolio?.id, queryClient]);

  return { portfolio, loading, error, refresh };
}
