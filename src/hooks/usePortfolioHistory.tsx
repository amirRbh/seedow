import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserPortfolios } from "@/hooks/useUserPortfolios";

export interface HistoryPoint {
  date: string; // ISO date
  value: number; // € value of the portfolio on that date
}

interface State {
  points: HistoryPoint[];
  loading: boolean;
  error: string | null;
  /** Number of distinct dates returned, useful to show "Pas encore d'historique" */
  hasHistory: boolean;
}

/**
 * Reconstruit la valeur du portefeuille sur les `days` derniers jours
 * à partir de `asset_prices` + weights du portefeuille actif.
 *
 * Méthode : pour chaque date présente dans asset_prices on calcule
 *   value(t) = totalInvested * Σ_i w_i * price_i(t) / price_i(t0)
 * où t0 = première date disponible (point de référence).
 *
 * Si une ligne n'a pas de prix à une date donnée on garde le dernier connu
 * (forward-fill) pour éviter les trous.
 */
export function usePortfolioHistory(totalInvested: number, days = 90): State {
  const { user, loading: authLoading } = useAuth();
  const { activeId, loading: pfListLoading } = useUserPortfolios();
  const [points, setPoints] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || pfListLoading) return;
    if (!user) {
      setPoints([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      // 1) récupère les weights du portefeuille actif
      let pfQ = supabase
        .from("portfolios")
        .select("id, weights")
        .eq("user_id", user.id)
        .eq("is_active", true);
      if (activeId) pfQ = pfQ.eq("id", activeId);
      else pfQ = pfQ.order("generated_at", { ascending: false }).limit(1);

      const { data: pfs, error: pfErr } = await pfQ;
      if (cancelled) return;
      if (pfErr) {
        setError(pfErr.message);
        setLoading(false);
        return;
      }
      const pf = pfs?.[0];
      const weights = ((pf?.weights ?? {}) as Record<string, number>);
      const ids = Object.keys(weights).filter((id) => weights[id] > 0);
      if (ids.length === 0) {
        setPoints([]);
        setLoading(false);
        return;
      }

      // 2) récupère les prix sur la fenêtre
      const since = new Date();
      since.setDate(since.getDate() - days);
      const sinceStr = since.toISOString().slice(0, 10);

      const { data: prices, error: prErr } = await supabase
        .from("asset_prices")
        .select("asset_id, price_date, close")
        .in("asset_id", ids)
        .gte("price_date", sinceStr)
        .order("price_date", { ascending: true });
      if (cancelled) return;
      if (prErr) {
        setError(prErr.message);
        setLoading(false);
        return;
      }
      if (!prices || prices.length === 0) {
        setPoints([]);
        setLoading(false);
        return;
      }

      // 3) construit la matrice [date][asset] -> price
      const dateSet = new Set<string>();
      const byAsset = new Map<string, Map<string, number>>();
      for (const r of prices) {
        const d = r.price_date as string;
        const a = r.asset_id as string;
        const c = Number(r.close);
        dateSet.add(d);
        if (!byAsset.has(a)) byAsset.set(a, new Map());
        byAsset.get(a)!.set(d, c);
      }
      const dates = Array.from(dateSet).sort();

      // 4) prix de référence = premier prix dispo de chaque asset dans la fenêtre
      const refPrice = new Map<string, number>();
      for (const id of ids) {
        const m = byAsset.get(id);
        if (!m) continue;
        for (const d of dates) {
          const v = m.get(d);
          if (v != null && v > 0) {
            refPrice.set(id, v);
            break;
          }
        }
      }

      // 5) forward-fill et calcul de la valeur portefeuille
      const lastSeen = new Map<string, number>();
      const out: HistoryPoint[] = [];
      for (const d of dates) {
        let factor = 0;
        let coverage = 0;
        for (const id of ids) {
          const m = byAsset.get(id);
          const ref = refPrice.get(id);
          if (!m || !ref) continue;
          const px = m.get(d) ?? lastSeen.get(id);
          if (px == null) continue;
          lastSeen.set(id, px);
          factor += (weights[id] ?? 0) * (px / ref);
          coverage += weights[id] ?? 0;
        }
        if (coverage <= 0) continue;
        // rescale to full coverage so missing assets don't deflate the curve
        const value = totalInvested * (factor / coverage);
        out.push({ date: d, value });
      }

      setPoints(out);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading, pfListLoading, activeId, totalInvested, days]);

  return { points, loading, error, hasHistory: points.length > 1 };
}
