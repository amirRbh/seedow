/**
 * Server functions publiques (sans auth) pour les pages Autorité (Phase C).
 * Mêmes colonnes/calculs que `api.public.esg-preview.ts` (cf. `public-fund.ts`).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  mapPublicFundRow,
  PUBLIC_FUND_COLUMNS,
  type CarbonEstimateRow,
  type PublicFundRow,
} from "./public-fund";

export const getPublicFundByIsin = createServerFn({ method: "GET" })
  .inputValidator((input: string) => z.string().min(1).parse(input))
  .handler(async ({ data: isin }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("assets")
      // `id` en plus des colonnes publiques : sert à joindre la trace carbone.
      .select(`id, ${PUBLIC_FUND_COLUMNS}`)
      .eq("is_active", true)
      .eq("isin", isin)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    const row = data as unknown as PublicFundRow & { id: string };

    // Dernière estimation carbone bottom-up connue (scope 1+2). `carbon_estimates`
    // n'est pas encore dans les types Supabase générés → accès casté, comme le
    // reste du Data Engine. Absente = aucune trace affichée (jamais fabriquée).
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    const carbonRes = await (supabaseAdmin as any)
      .from("carbon_estimates")
      .select(
        "intensity_gco2e_per_eur, coverage, sourced_coverage, data_quality, methodology, holdings_considered, holdings_covered, as_of",
      )
      .eq("asset_id", row.id)
      .eq("scope", "scope_1_2")
      .order("as_of", { ascending: false })
      .limit(1)
      .maybeSingle();
    const carbon = (carbonRes?.data ?? null) as CarbonEstimateRow | null;

    return mapPublicFundRow(row, carbon);
  });

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
