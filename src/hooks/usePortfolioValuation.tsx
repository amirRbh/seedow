import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDeposits } from "@/hooks/useDeposits";
import { useUserPortfolios } from "@/hooks/useUserPortfolios";

export interface ValuedHolding {
  asset_id: string;
  ticker: string;
  name: string;
  asset_class: string;
  weight: number;            // 0..1
  invested: number;          // € invested in this line
  currentPrice: number | null;
  entryPrice: number | null;
  currentValue: number;      // € — falls back to invested if no quote
  pnl: number;
  returnPct: number;
  quoteAt: string | null;
}

export interface PortfolioValuation {
  // Money figures (deposits-aware: includes settled deposits beyond initial_amount)
  totalInvested: number;     // initial_amount of active portfolio + settled deposits
  currentValue: number;      // sum of holdings.currentValue rescaled to totalInvested
  pnl: number;               // currentValue - totalInvested
  returnPct: number;         // pnl / totalInvested * 100
  // Composition
  holdings: ValuedHolding[];
  // Meta
  hasQuotes: boolean;        // false until refresh-market-data runs at least once
  oldestQuoteAt: string | null;
  latestQuoteAt: string | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

interface ViewRow {
  portfolio_id: string;
  user_id: string;
  asset_id: string;
  ticker: string;
  name: string;
  asset_class: string;
  weight: number | string;
  total_invested: number | string;
  invested_in_holding: number | string;
  current_price: number | string | null;
  entry_price: number | string | null;
  current_value: number | string | null;
  quote_fetched_at: string | null;
}

export function usePortfolioValuation(): PortfolioValuation {
  const { user, loading: authLoading } = useAuth();
  const { activeId, loading: pfListLoading } = useUserPortfolios();
  const { total: depositsTotal, loading: depLoading } = useDeposits();
  const [rows, setRows] = useState<ViewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (authLoading || pfListLoading) return;
    if (!user) {
      setRows([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      let query = supabase
        .from("portfolio_holdings_valued" as never)
        .select(
          "portfolio_id, user_id, asset_id, ticker, name, asset_class, weight, total_invested, invested_in_holding, current_price, entry_price, current_value, quote_fetched_at",
        )
        .eq("user_id", user.id);
      if (activeId) {
        query = query.eq("portfolio_id", activeId);
      }
      const { data, error } = await query;
      if (cancelled) return;
      if (error) {
        setError(error.message);
        setRows([]);
      } else {
        setRows((data ?? []) as unknown as ViewRow[]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading, pfListLoading, activeId, tick]);

  // ── Aggregate ────────────────────────────────────────────
  const num = (v: number | string | null | undefined) =>
    v == null ? 0 : typeof v === "number" ? v : Number(v);

  const initialFromView = rows[0] ? num(rows[0].total_invested) : 0;
  // Real money the user actually put in = portfolio's initial_amount + settled deposits.
  // We keep initial_amount as the floor so that an empty deposits table still values
  // the portfolio at the amount the user set during onboarding.
  const totalInvested = Math.max(initialFromView, 0) + depositsTotal;

  const holdings: ValuedHolding[] = rows.map((r) => {
    const weight = num(r.weight);
    const invested = totalInvested * weight;
    const currentPrice = r.current_price == null ? null : num(r.current_price);
    const entryPrice = r.entry_price == null ? null : num(r.entry_price);
    let currentValue = invested;
    if (currentPrice != null && entryPrice && entryPrice > 0) {
      currentValue = invested * (currentPrice / entryPrice);
    }
    const pnl = currentValue - invested;
    const returnPct = invested > 0 ? (pnl / invested) * 100 : 0;
    return {
      asset_id: r.asset_id,
      ticker: r.ticker,
      name: r.name,
      asset_class: r.asset_class,
      weight,
      invested,
      currentPrice,
      entryPrice,
      currentValue,
      pnl,
      returnPct,
      quoteAt: r.quote_fetched_at,
    };
  });

  const currentValue = holdings.reduce((s, h) => s + h.currentValue, 0)
    || totalInvested;
  const pnl = currentValue - totalInvested;
  const returnPct = totalInvested > 0 ? (pnl / totalInvested) * 100 : 0;

  const quoteDates = holdings.map((h) => h.quoteAt).filter(Boolean) as string[];
  const hasQuotes = quoteDates.length > 0;
  const sortedQuotes = hasQuotes ? [...quoteDates].sort() : [];
  const oldestQuoteAt = hasQuotes ? sortedQuotes[0] : null;
  const latestQuoteAt = hasQuotes ? sortedQuotes[sortedQuotes.length - 1] : null;

  return {
    totalInvested,
    currentValue,
    pnl,
    returnPct,
    holdings,
    hasQuotes,
    oldestQuoteAt,
    latestQuoteAt,
    loading: loading || depLoading,
    error,
    refresh,
  };
}
