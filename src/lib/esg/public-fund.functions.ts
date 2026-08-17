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
    return data ? mapPublicFundRow(data as unknown as PublicFundRow) : null;
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
