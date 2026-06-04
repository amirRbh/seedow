import { useEffect, useState, useCallback } from "react";
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

export function useActivePortfolio(): State {
  const { user, loading: authLoading } = useAuth();
  const { activeId, loading: pfListLoading } = useUserPortfolios();
  const [portfolio, setPortfolio] = useState<ActivePortfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (authLoading || pfListLoading) return;
    if (!user) {
      setPortfolio(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      let query = supabase
        .from("portfolios")
        .select("id, name, initial_amount, generated_at, weights, metrics")
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (activeId) {
        query = query.eq("id", activeId);
      } else {
        query = query.order("generated_at", { ascending: false }).limit(1);
      }

      const { data: portfolios, error: pfErr } = await query;

      if (cancelled) return;
      if (pfErr) {
        setError(pfErr.message);
        setLoading(false);
        return;
      }

      const pf = portfolios?.[0] ?? null;
      if (!pf) {
        setPortfolio(null);
        setLoading(false);
        return;
      }

      const weights = (pf.weights ?? {}) as Record<string, number>;
      const ids = Object.keys(weights).filter((id) => weights[id] > 0);

      let holdings: ActiveHolding[] = [];
      if (ids.length > 0) {
        const { data: assets, error: aErr } = await supabase
          .from("assets")
          .select("id, ticker, name, asset_class, esg_score, region")
          .in("id", ids);
        if (cancelled) return;
        if (aErr) {
          setError(aErr.message);
          setLoading(false);
          return;
        }
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

      setPortfolio({
        id: pf.id,
        name: pf.name,
        initial_amount: Number(pf.initial_amount ?? 0),
        generated_at: pf.generated_at,
        holdings,
        metrics: (pf.metrics ?? null) as ActivePortfolioMetrics | null,
      });
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading, pfListLoading, activeId, tick]);

  // Realtime: re-fetch when the user's portfolios row changes (e.g. après Réglages recalcule)
  useEffect(() => {
    if (!user) return;
    let active = true;
    const channel = supabase
      .channel(`portfolios:${user.id}:${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "portfolios", filter: `user_id=eq.${user.id}` },
        () => {
          if (!active) return;
          setTick((t) => t + 1);
        },
      )
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
  }, [user]);

  return { portfolio, loading, error, refresh };
}
