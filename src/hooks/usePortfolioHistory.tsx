import { useQuery } from "@tanstack/react-query";
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

/** Facteur de croissance normalisé par date — indépendant de totalInvested,
 * pour que le cache ne soit pas fragmenté par un montant qui peut varier
 * légèrement d'un appelant à l'autre sans que les prix aient changé. */
interface HistoryFactor {
  date: string;
  factor: number;
  coverage: number;
}

/**
 * Reconstruit le facteur de croissance du portefeuille sur les `days` derniers
 * jours à partir de `asset_prices` + weights du portefeuille actif.
 *
 * Méthode : pour chaque date présente dans asset_prices on calcule
 *   factor(t) = Σ_i w_i * price_i(t) / price_i(t0)
 * où t0 = première date disponible (point de référence). La valeur en €
 * (totalInvested * factor/coverage) est dérivée séparément, hors cache.
 *
 * Si une ligne n'a pas de prix à une date donnée on garde le dernier connu
 * (forward-fill) pour éviter les trous.
 */
async function fetchHistoryFactors(
  userId: string,
  activeId: string | null,
  days: number,
): Promise<HistoryFactor[]> {
  // 1) récupère les weights du portefeuille actif
  let pfQ = supabase.from("portfolios").select("id, weights").eq("user_id", userId).eq("is_active", true);
  if (activeId) pfQ = pfQ.eq("id", activeId);
  else pfQ = pfQ.order("generated_at", { ascending: false }).limit(1);

  const { data: pfs, error: pfErr } = await pfQ;
  if (pfErr) throw new Error(pfErr.message);
  const pf = pfs?.[0];
  const weights = (pf?.weights ?? {}) as Record<string, number>;
  const ids = Object.keys(weights).filter((id) => weights[id] > 0);
  if (ids.length === 0) return [];

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
  if (prErr) throw new Error(prErr.message);
  if (!prices || prices.length === 0) return [];

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

  // 5) forward-fill et calcul du facteur de croissance
  const lastSeen = new Map<string, number>();
  const out: HistoryFactor[] = [];
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
    out.push({ date: d, factor, coverage });
  }
  return out;
}

export function usePortfolioHistory(totalInvested: number, days = 90): State {
  const { user, loading: authLoading } = useAuth();
  const { activeId, loading: pfListLoading } = useUserPortfolios();

  const ready = !authLoading && !pfListLoading && !!user;
  const {
    data,
    isLoading: queryLoading,
    error: queryError,
  } = useQuery({
    queryKey: ["portfolio-history-factors", user?.id, activeId, days],
    queryFn: () => fetchHistoryFactors(user!.id, activeId, days),
    enabled: ready,
  });

  const factors = data ?? [];
  // rescale to full coverage so missing assets don't deflate the curve
  const points: HistoryPoint[] = factors.map((f) => ({
    date: f.date,
    value: totalInvested * (f.factor / f.coverage),
  }));
  const loading = authLoading || pfListLoading || (!!user && queryLoading);
  const error = queryError instanceof Error ? queryError.message : null;

  return { points, loading, error, hasHistory: points.length > 1 };
}
