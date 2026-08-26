/**
 * Server functions publiques (sans auth) pour les pages Autorité (Phase C).
 * Mêmes colonnes/calculs que `api.public.esg-preview.ts` (cf. `public-fund.ts`).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { mapPublicFundRow, PUBLIC_FUND_COLUMNS, type PublicFundRow } from "./public-fund";

export const getPublicFundByIsin = createServerFn({ method: "GET" })
  .inputValidator((input: string) => z.string().min(1).parse(input))
  .handler(async ({ data: isin }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("assets")
      .select(PUBLIC_FUND_COLUMNS)
      .eq("is_active", true)
      .eq("isin", isin)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    const fund = mapPublicFundRow(data as unknown as PublicFundRow);

    // Composition la plus récente, si elle a été ingérée. Elle est facultative :
    // la fiche doit se lire entièrement sans elle (frais, risque, durabilité ne
    // dépendent pas des holdings). Une erreur de lecture n'est donc pas fatale.
    const assetId = (data as unknown as { id?: string }).id ?? null;
    let holdings: FundHoldingRow[] = [];
    let holdingsAsOf: string | null = null;
    let holdingsSourceUrl: string | null = null;
    if (assetId) {
      const { data: rows } = await supabaseAdmin
        .from("fund_holdings")
        .select("security_name, security_isin, weight_pct, as_of, source_url")
        .eq("asset_id", assetId)
        .order("as_of", { ascending: false })
        .order("weight_pct", { ascending: false })
        .limit(400);
      // Une seule date : mélanger deux publications donnerait une composition
      // qui n'a jamais existé.
      const latest = rows?.[0]?.as_of ?? null;
      const sameDay = (rows ?? []).filter((r) => r.as_of === latest);
      holdings = sameDay.map((r) => ({
        name: r.security_name,
        ticker: null,
        // Le secteur n'est pas encore persisté par le writer : on le laisse
        // absent plutôt que d'en inventer un.
        sector: null,
        weightPct: r.weight_pct == null ? null : Number(r.weight_pct),
      }));
      holdingsAsOf = latest;
      holdingsSourceUrl = sameDay[0]?.source_url ?? null;
    }

    return { ...fund, holdings, holdingsAsOf, holdingsSourceUrl };
  });

/** Une position telle que la fiche publique la consomme. */
export interface FundHoldingRow {
  name: string;
  ticker: string | null;
  sector: string | null;
  weightPct: number | null;
}

export const getPublicFundsList = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("assets")
    .select(PUBLIC_FUND_COLUMNS)
    .eq("is_active", true)
    .order("esg_score", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => mapPublicFundRow(r as unknown as PublicFundRow));
});
