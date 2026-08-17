import { useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserPortfolios } from "@/hooks/useUserPortfolios";
import type { CauseTag } from "@/lib/portfolio/types";
import type { ExclusionTag } from "@/lib/discover/types";

export interface ActiveHolding {
  id: string;
  ticker: string;
  name: string;
  category: string; // asset_class
  allocationPct: number; // 0..100
  esgScore: number;
  region: string | null;
  /**
   * Intensité par cause déclarée sur l'actif (0..1 par cause). Vide si non
   * renseigné. Sert à répartir un holding entre plusieurs thèmes de façon pondérée.
   */
  causeExposure: Partial<Record<CauseTag, number>>;
}

export interface ActivePortfolioMetrics {
  expected_return: number;
  volatility: number;
  sharpe: number;
  esg_score: number;
  ter: number;
  // Empreinte carbone réelle (données émetteurs) — présente sur les portefeuilles
  // générés depuis l'ajout de la méthodo carbone ; null/absente sur les plus anciens.
  carbon_intensity_gco2e_per_eur: number | null;
  carbon_intensity_coverage: number;
  // Part de la couverture carbone directement sourcée (vs estimée depuis les
  // holdings) + palier de fiabilité dominant. Absents sur les portefeuilles
  // générés avant le moteur d'estimation carbone (rétrocompat).
  carbon_sourced_share?: number | null;
  carbon_data_quality?: import("@/lib/esg/carbon-engine").CarbonDataQuality | null;
  // WACI émetteurs (données MSCI réelles) — présent sur les portefeuilles générés
  // depuis l'ajout de l'agrégation WACI ; null/absent sur les plus anciens.
  waci_tco2e_per_musd_sales: number | null;
  waci_coverage: number;
  diversification: number;
}

export interface ActivePortfolio {
  id: string;
  name: string;
  initial_amount: number;
  generated_at: string;
  holdings: ActiveHolding[];
  metrics: ActivePortfolioMetrics | null;
  /** Secteurs exclus par l'utilisateur, retirés en amont de la construction. */
  exclusions: ExclusionTag[];
  /** Causes choisies à l'onboarding — alimentent le « Pourquoi cette proposition ? ». */
  causes: CauseTag[];
  /** Cible de volatilité annuelle (fraction) déclarée par l'utilisateur. */
  risk_target: number;
  /** Horizon d'investissement en années. */
  horizon_years: number;
  /**
   * true si l'optimiseur n'a pas pu satisfaire le plancher ESG (70/100) sous les
   * contraintes de l'utilisateur : le plancher a été relâché pour produire une
   * allocation viable. Exposé pour l'afficher honnêtement (CLAUDE.md §1.2) —
   * jamais masqué.
   */
  esg_floor_relaxed: boolean;
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
    .select(
      "id, name, initial_amount, generated_at, weights, metrics, exclusions, causes, risk_target, horizon_years, esg_floor_relaxed",
    )
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
      .select("id, ticker, name, asset_class, esg_score, region, cause_exposure")
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
      causeExposure: (a.cause_exposure ?? {}) as Partial<Record<CauseTag, number>>,
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
    exclusions: (pf.exclusions ?? []) as ExclusionTag[],
    causes: (pf.causes ?? []) as CauseTag[],
    risk_target: Number(pf.risk_target ?? 0),
    horizon_years: Number(pf.horizon_years ?? 0),
    esg_floor_relaxed: Boolean((pf as { esg_floor_relaxed?: boolean }).esg_floor_relaxed),
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
