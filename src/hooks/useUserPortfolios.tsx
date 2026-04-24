import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface PortfolioSummary {
  id: string;
  name: string;
  generated_at: string;
  initial_amount: number;
}

interface Ctx {
  portfolios: PortfolioSummary[];
  activeId: string | null;
  setActiveId: (id: string) => void;
  loading: boolean;
  refresh: () => void;
  canCreateMore: boolean;
}

const STORAGE_KEY = "seedow.activePortfolioId";

const PortfoliosContext = createContext<Ctx | null>(null);

export function UserPortfoliosProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [portfolios, setPortfolios] = useState<PortfolioSummary[]>([]);
  const [activeId, setActiveIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const setActiveId = useCallback((id: string) => {
    setActiveIdState(id);
    if (typeof window !== "undefined") {
      try { window.localStorage.setItem(STORAGE_KEY, id); } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setPortfolios([]);
      setActiveIdState(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from("portfolios")
        .select("id, name, generated_at, initial_amount")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("generated_at", { ascending: true });
      if (cancelled) return;
      if (error) {
        setPortfolios([]);
        setLoading(false);
        return;
      }
      const list: PortfolioSummary[] = (data ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        generated_at: p.generated_at,
        initial_amount: Number(p.initial_amount ?? 0),
      }));
      setPortfolios(list);
      // Resolve active id
      let resolved: string | null = null;
      if (typeof window !== "undefined") {
        try { resolved = window.localStorage.getItem(STORAGE_KEY); } catch { /* ignore */ }
      }
      if (!resolved || !list.some((p) => p.id === resolved)) {
        resolved = list[0]?.id ?? null;
        if (resolved && typeof window !== "undefined") {
          try { window.localStorage.setItem(STORAGE_KEY, resolved); } catch { /* ignore */ }
        }
      }
      setActiveIdState(resolved);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user, authLoading, tick]);

  // Realtime: refresh on portfolio changes
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`user_portfolios:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "portfolios", filter: `user_id=eq.${user.id}` },
        () => setTick((t) => t + 1),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  return (
    <PortfoliosContext.Provider
      value={{
        portfolios,
        activeId,
        setActiveId,
        loading,
        refresh,
        canCreateMore: portfolios.length < 3,
      }}
    >
      {children}
    </PortfoliosContext.Provider>
  );
}

export function useUserPortfolios(): Ctx {
  const ctx = useContext(PortfoliosContext);
  if (!ctx) {
    // Fallback: no provider mounted (e.g., auth route). Return empty stub.
    return {
      portfolios: [],
      activeId: null,
      setActiveId: () => { /* noop */ },
      loading: false,
      refresh: () => { /* noop */ },
      canCreateMore: true,
    };
  }
  return ctx;
}
