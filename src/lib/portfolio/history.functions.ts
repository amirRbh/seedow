import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface HistoryPoint {
  date: string; // YYYY-MM-DD
  value: number; // valeur du portefeuille
  invested: number; // capital cumulé investi à cette date
}

export interface PortfolioHistoryResult {
  points: HistoryPoint[];
  range: "1W" | "1M" | "3M" | "1Y" | "ALL";
  hasData: boolean;
}

const inputSchema = z.object({
  portfolioId: z.string().uuid().optional(),
  range: z.enum(["1W", "1M", "3M", "1Y", "ALL"]).default("3M"),
});

function rangeToDays(range: PortfolioHistoryResult["range"]): number | null {
  switch (range) {
    case "1W":
      return 7;
    case "1M":
      return 31;
    case "3M":
      return 93;
    case "1Y":
      return 366;
    case "ALL":
      return null;
  }
}

/**
 * Reconstitue l'évolution quotidienne de la valeur du portefeuille.
 * Méthode : pour chaque jour ouvré, valeur = somme(weight_i * price_i_t / price_i_t0) * invested_t
 * où invested_t = initial_amount + dépôts settled à cette date.
 */
export const getPortfolioHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => inputSchema.parse(input))
  .handler(async ({ data, context }): Promise<PortfolioHistoryResult> => {
    const { supabase, userId } = context;

    // 1. Charge le portefeuille actif (ou celui demandé)
    let pfQuery = supabase
      .from("portfolios")
      .select("id, initial_amount, weights, created_at, generated_at")
      .eq("user_id", userId);
    if (data.portfolioId) pfQuery = pfQuery.eq("id", data.portfolioId);
    else pfQuery = pfQuery.eq("is_active", true);
    const { data: pfs, error: pfErr } = await pfQuery
      .order("generated_at", { ascending: false })
      .limit(1);
    if (pfErr) throw new Error(pfErr.message);
    const pf = pfs?.[0];
    if (!pf) return { points: [], range: data.range, hasData: false };

    const weights = (pf.weights ?? {}) as Record<string, number>;
    const assetIds = Object.keys(weights).filter((id) => Number(weights[id]) > 0);
    if (assetIds.length === 0) return { points: [], range: data.range, hasData: false };

    // 2. Fenêtre temporelle
    const days = rangeToDays(data.range);
    const portfolioStart = new Date(pf.generated_at ?? pf.created_at);
    let startDate: Date;
    if (days == null) {
      startDate = portfolioStart;
    } else {
      const candidate = new Date(Date.now() - days * 86_400_000);
      startDate = candidate < portfolioStart ? portfolioStart : candidate;
    }
    const startStr = startDate.toISOString().slice(0, 10);

    // 3. Prix historiques sur la fenêtre + un point d'ancrage (premier prix dispo) pour normaliser
    const { data: prices, error: prErr } = await supabase
      .from("asset_prices")
      .select("asset_id, price_date, close")
      .in("asset_id", assetIds)
      .gte("price_date", startStr)
      .order("price_date", { ascending: true });
    if (prErr) throw new Error(prErr.message);

    if (!prices || prices.length === 0) {
      return { points: [], range: data.range, hasData: false };
    }

    // Premier prix dispo par actif sur la fenêtre = ancrage de normalisation
    const anchorByAsset = new Map<string, number>();
    // Index prix par date -> asset -> close
    const dateIndex = new Map<string, Map<string, number>>();
    for (const row of prices) {
      const aid = row.asset_id as string;
      const d = row.price_date as string;
      const close = Number(row.close);
      if (!anchorByAsset.has(aid)) anchorByAsset.set(aid, close);
      let bucket = dateIndex.get(d);
      if (!bucket) {
        bucket = new Map();
        dateIndex.set(d, bucket);
      }
      bucket.set(aid, close);
    }

    // 4. Dépôts pour reconstituer le capital investi à chaque date
    const { data: deposits, error: depErr } = await supabase
      .from("deposits")
      .select("amount, available_at, status")
      .eq("user_id", userId)
      .eq("status", "settled")
      .order("available_at", { ascending: true });
    if (depErr) throw new Error(depErr.message);

    const initialAmount = Number(pf.initial_amount ?? 0);
    // Capital cumulé settled à chaque date : on ne compte que les dépôts <= date
    const sortedDeposits = (deposits ?? []).map((d) => ({
      date: (d.available_at as string).slice(0, 10),
      amount: Number(d.amount),
    }));

    // 5. Itère sur chaque date de prix dispo, forward-fill des cours manquants
    const sortedDates = Array.from(dateIndex.keys()).sort();
    const lastPriceByAsset = new Map<string, number>();
    // initialise avec l'ancrage
    for (const [aid, p] of anchorByAsset) lastPriceByAsset.set(aid, p);

    const points: HistoryPoint[] = [];
    let depositCursor = 0;
    let cumulatedDeposits = 0;

    for (const date of sortedDates) {
      // Update last known price for each asset that quoted today
      const today = dateIndex.get(date)!;
      for (const [aid, p] of today) lastPriceByAsset.set(aid, p);

      // Advance deposit cursor
      while (
        depositCursor < sortedDeposits.length &&
        sortedDeposits[depositCursor].date <= date
      ) {
        cumulatedDeposits += sortedDeposits[depositCursor].amount;
        depositCursor++;
      }
      const invested = Math.max(initialAmount, 0) + cumulatedDeposits;

      // value = invested * sum(weight_i * price_i_today / anchor_i)
      let multiplier = 0;
      let weightCovered = 0;
      for (const aid of assetIds) {
        const w = Number(weights[aid]);
        const anchor = anchorByAsset.get(aid);
        const cur = lastPriceByAsset.get(aid);
        if (anchor && cur && anchor > 0) {
          multiplier += w * (cur / anchor);
          weightCovered += w;
        }
      }
      // Si une partie du portefeuille n'a pas de quote, on suppose 1.0 sur ces poids
      if (weightCovered < 1) multiplier += 1 - weightCovered;

      const value = invested * multiplier;
      points.push({ date, value, invested });
    }

    return { points, range: data.range, hasData: points.length > 0 };
  });
