/**
 * Composition look-through d'un fonds côté client (pivot PIU, §7).
 *
 * Lit la dernière composition connue (`fund_latest_holdings`, RLS lecture
 * authentifiée) et en dérive le profil « ce que ce fonds contient / ce que ton
 * argent finance » via `buildLookThroughProfile` (pur, testé). Tant que
 * `fund_holdings` n'est pas alimentée (harvester iShares pas encore lancé),
 * `hasData` est false et l'UI affiche « en attente » — jamais de chiffre inventé.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { buildLookThroughProfile, type HoldingLine } from "@/lib/holdings/lookthrough";

// `fund_holdings` / `fund_latest_holdings` pas dans les types générés — cast local.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface HoldingRowRead {
  security_name: string;
  security_isin: string | null;
  security_sector: string | null;
  security_country: string | null;
  weight_pct: number | null;
  as_of: string;
}

export function useAssetHoldings(assetId: string | null | undefined) {
  const { data, isLoading } = useQuery({
    queryKey: ["asset-holdings", assetId],
    enabled: !!assetId,
    queryFn: async (): Promise<{ lines: HoldingLine[]; asOf: string | null }> => {
      const { data: rows, error } = await db
        .from("fund_latest_holdings")
        .select(
          "security_name, security_isin, security_sector, security_country, weight_pct, as_of",
        )
        .eq("asset_id", assetId)
        .order("weight_pct", { ascending: false });
      if (error) throw new Error(error.message);
      const list = (rows ?? []) as HoldingRowRead[];
      const lines: HoldingLine[] = list.map((r) => ({
        securityName: r.security_name,
        securityIsin: r.security_isin,
        sector: r.security_sector,
        country: r.security_country,
        weightPct: r.weight_pct,
      }));
      return { lines, asOf: list[0]?.as_of ?? null };
    },
  });

  const profile = useMemo(
    () => (data && data.lines.length > 0 ? buildLookThroughProfile(data.lines, data.asOf) : null),
    [data],
  );

  return { profile, loading: isLoading, hasData: !!profile };
}
