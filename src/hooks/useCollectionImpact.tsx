/**
 * Impact consolidé d'une collection côté client (pivot PIU, §9/§10).
 *
 * Charge les compositions look-through de TOUS les fonds de la collection en une
 * requête (`fund_latest_holdings`, RLS lecture authentifiée), puis agrège au
 * niveau du titre sous-jacent via `buildCollectionImpact` (pur, testé). Tant que
 * `fund_holdings` est vide, `hasData` est false → l'UI affiche « en attente ».
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { effectiveWeights, type Collection } from "@/lib/collections/model";
import { buildCollectionImpact, type CollectionFund } from "@/lib/holdings/collection-impact";
import type { HoldingLine } from "@/lib/holdings/lookthrough";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface HoldingRowRead {
  asset_id: string;
  security_name: string;
  security_isin: string | null;
  security_sector: string | null;
  security_country: string | null;
  weight_pct: number | null;
}

export function useCollectionImpact(collection: Collection | null | undefined) {
  const assetIds = useMemo(
    () => (collection ? collection.items.map((i) => i.assetId) : []),
    [collection],
  );

  const { data, isLoading } = useQuery({
    queryKey: ["collection-impact-holdings", assetIds.slice().sort()],
    enabled: assetIds.length > 0,
    queryFn: async (): Promise<Map<string, HoldingLine[]>> => {
      const { data: rows, error } = await db
        .from("fund_latest_holdings")
        .select(
          "asset_id, security_name, security_isin, security_sector, security_country, weight_pct",
        )
        .in("asset_id", assetIds);
      if (error) throw new Error(error.message);
      const byAsset = new Map<string, HoldingLine[]>();
      for (const r of (rows ?? []) as HoldingRowRead[]) {
        const line: HoldingLine = {
          securityName: r.security_name,
          securityIsin: r.security_isin,
          sector: r.security_sector,
          country: r.security_country,
          weightPct: r.weight_pct,
        };
        const arr = byAsset.get(r.asset_id) ?? [];
        arr.push(line);
        byAsset.set(r.asset_id, arr);
      }
      return byAsset;
    },
  });

  const impact = useMemo(() => {
    if (!collection || collection.items.length === 0) return null;
    const weights = effectiveWeights(collection.items, collection.weightMode);
    const holdingsByAsset = data ?? new Map<string, HoldingLine[]>();
    const funds: CollectionFund[] = collection.items.map((it) => ({
      assetId: it.assetId,
      weight: weights[it.assetId] ?? 0,
      holdings: holdingsByAsset.get(it.assetId) ?? [],
    }));
    return buildCollectionImpact(funds);
  }, [collection, data]);

  return {
    impact,
    loading: isLoading,
    /** Au moins un fonds de la collection a une composition connue. */
    hasData: !!impact && impact.coveredFunds > 0,
  };
}
