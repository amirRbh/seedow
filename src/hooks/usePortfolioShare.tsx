import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface PortfolioShareRow {
  id: string;
  user_id: string;
  portfolio_id: string;
  public_handle: string;
  causes: string[];
  exclusions: string[];
  risk_target: number;
  horizon_years: number;
  weights: Record<string, number>;
  expected_return: number | null;
  volatility: number | null;
  esg_score: number | null;
  carbon_intensity: number | null;
  shared_at: string;
  updated_at: string;
}

export function useCommunityShares(filter?: { cause?: string; risk?: "low" | "mid" | "high" }) {
  const [shares, setShares] = useState<PortfolioShareRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from("portfolio_shares")
        .select("*")
        .order("shared_at", { ascending: false })
        .limit(60);
      if (cancelled) return;
      if (error) {
        setShares([]);
      } else {
        let rows = (data ?? []) as PortfolioShareRow[];
        if (filter?.cause) {
          rows = rows.filter((r) => r.causes.includes(filter.cause!));
        }
        if (filter?.risk) {
          rows = rows.filter((r) => {
            const v = Number(r.volatility ?? 0.15);
            if (filter.risk === "low") return v < 0.10;
            if (filter.risk === "mid") return v >= 0.10 && v < 0.18;
            return v >= 0.18;
          });
        }
        setShares(rows);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [filter?.cause, filter?.risk]);

  return { shares, loading };
}

export function useImpactLeaderboard() {
  const [rows, setRows] = useState<PortfolioShareRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("portfolio_shares")
        .select("*")
        .order("esg_score", { ascending: false, nullsFirst: false })
        .limit(50);
      if (cancelled) return;
      if (!error) setRows((data ?? []) as PortfolioShareRow[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { rows, loading };
}

export function useMyShare(portfolioId: string | null) {
  const { user } = useAuth();
  const [share, setShare] = useState<PortfolioShareRow | null>(null);
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!user || !portfolioId) {
      setShare(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("portfolio_shares")
        .select("*")
        .eq("portfolio_id", portfolioId)
        .maybeSingle();
      if (cancelled) return;
      if (!error) setShare((data as PortfolioShareRow | null) ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, portfolioId, tick]);

  return { share, refresh };
}

export async function fetchOrCreatePublicHandle(userId: string): Promise<string> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("public_handle, display_name")
    .eq("id", userId)
    .maybeSingle();
  if (profile?.public_handle) return profile.public_handle;
  // Generate one from display_name or random
  const base = (profile?.display_name ?? "investor")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 16) || "investor";
  const handle = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  const { error } = await supabase
    .from("profiles")
    .update({ public_handle: handle })
    .eq("id", userId);
  if (error) throw new Error(error.message);
  return handle;
}

export async function sharePortfolio(args: {
  userId: string;
  portfolioId: string;
  publicHandle: string;
  causes: string[];
  exclusions: string[];
  riskTarget: number;
  horizonYears: number;
  weights: Record<string, number>;
  expectedReturn?: number | null;
  volatility?: number | null;
  esgScore?: number | null;
  carbonIntensity?: number | null;
}) {
  const { error } = await supabase.from("portfolio_shares").upsert(
    {
      user_id: args.userId,
      portfolio_id: args.portfolioId,
      public_handle: args.publicHandle,
      causes: args.causes,
      exclusions: args.exclusions,
      risk_target: args.riskTarget,
      horizon_years: args.horizonYears,
      weights: args.weights,
      expected_return: args.expectedReturn ?? null,
      volatility: args.volatility ?? null,
      esg_score: args.esgScore ?? null,
      carbon_intensity: args.carbonIntensity ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "portfolio_id" },
  );
  if (error) throw new Error(error.message);
}

export async function unsharePortfolio(portfolioId: string) {
  const { error } = await supabase
    .from("portfolio_shares")
    .delete()
    .eq("portfolio_id", portfolioId);
  if (error) throw new Error(error.message);
}
