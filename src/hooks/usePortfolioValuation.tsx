import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserPortfolios } from "@/hooks/useUserPortfolios";

export interface ValuedHolding {
  asset_id: string;
  ticker: string;
  name: string;
  asset_class: string;
  weight: number; // 0..1
  invested: number; // € invested in this line
  currentPrice: number | null;
  entryPrice: number | null;
  currentValue: number; // € — falls back to invested if no quote
  pnl: number;
  returnPct: number;
  quoteAt: string | null;
}

export interface ValuationConsistency {
  viewValue: number; // somme des current_value renvoyés par la vue SQL
  expectedValue: number; // recalcul côté client (poids × prix / prix d'entrée)
  deltaAbs: number; // |view - expected| en €
  deltaPct: number; // écart relatif vs totalInvested, en %
  threshold: number; // seuil d'alerte (%)
  warn: boolean; // true si deltaPct > threshold
}

export interface PortfolioValuation {
  totalInvested: number;
  currentValue: number;
  pnl: number;
  returnPct: number;
  holdings: ValuedHolding[];
  hasQuotes: boolean;
  oldestQuoteAt: string | null;
  latestQuoteAt: string | null;
  consistency: ValuationConsistency | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

// Seuil par défaut : un écart supérieur à 0.5% du capital investi est suspect
// (au-delà du bruit d'arrondi numérique entre la vue SQL et le recalcul JS).
const CONSISTENCY_THRESHOLD_PCT = 0.5;

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
  // Valeur saisie par l'utilisateur (initial_amount du portefeuille).
  // Le système de dépôts a été retiré : on travaille sur du déclaratif.
  const totalInvested = Math.max(initialFromView, 0);

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

  const currentValue = holdings.reduce((s, h) => s + h.currentValue, 0) || totalInvested;
  const pnl = currentValue - totalInvested;
  const returnPct = totalInvested > 0 ? (pnl / totalInvested) * 100 : 0;

  const quoteDates = holdings.map((h) => h.quoteAt).filter(Boolean) as string[];
  const hasQuotes = quoteDates.length > 0;
  const sortedQuotes = hasQuotes ? [...quoteDates].sort() : [];
  const oldestQuoteAt = hasQuotes ? sortedQuotes[0] : null;
  const latestQuoteAt = hasQuotes ? sortedQuotes[sortedQuotes.length - 1] : null;

  // ── Cohérence vue SQL vs recalcul JS ─────────────────────
  // La vue `portfolio_holdings_valued` calcule current_value côté SQL.
  // On le re-dérive ici depuis (poids × prix / prix d'entrée) pour détecter
  // toute dérive (vue désynchronisée, quote partielle, arrondi anormal…).
  const viewValue = rows.reduce((s, r) => s + num(r.current_value), 0);
  const expectedValue = holdings.reduce((s, h) => s + h.currentValue, 0);
  const deltaAbs = Math.abs(viewValue - expectedValue);
  const deltaPct = totalInvested > 0 ? (deltaAbs / totalInvested) * 100 : 0;
  const consistency: ValuationConsistency | null =
    rows.length > 0
      ? {
          viewValue,
          expectedValue,
          deltaAbs,
          deltaPct,
          threshold: CONSISTENCY_THRESHOLD_PCT,
          warn: deltaPct > CONSISTENCY_THRESHOLD_PCT,
        }
      : null;

  if (consistency?.warn && typeof window !== "undefined") {
    console.warn(
      `[usePortfolioValuation] Écart vue/recalcul ${deltaPct.toFixed(2)}% ` +
        `(vue=${viewValue.toFixed(2)}€, attendu=${expectedValue.toFixed(2)}€)`,
    );
  }

  return {
    totalInvested,
    currentValue,
    pnl,
    returnPct,
    holdings,
    hasQuotes,
    oldestQuoteAt,
    latestQuoteAt,
    consistency,
    loading,
    error,
    refresh,
  };
}
