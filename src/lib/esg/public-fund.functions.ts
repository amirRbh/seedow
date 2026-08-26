/**
 * Server functions publiques (sans auth) pour les pages Autorité (Phase C).
 * Mêmes colonnes/calculs que `api.public.esg-preview.ts` (cf. `public-fund.ts`).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { mapPublicFundRow, PUBLIC_FUND_COLUMNS, type PublicFundRow } from "./public-fund";

/**
 * Fiche publique d'un fonds, par ISIN **ou** par ticker.
 *
 * Accepter les deux n'est pas une commodité : c'est ce qui rend la page
 * atteignable. Aucun actif du catalogue ne porte d'ISIN aujourd'hui — la
 * colonne existe et elle est vide. L'Observatoire liait donc vers
 * `/fonds/{ticker}` (son propre repli), pendant que cette fonction cherchait
 * `isin = "ESGD"`. Résultat : chaque lien de l'Observatoire menait à « fonds
 * introuvable ».
 *
 * On ne devine pas l'ISIN manquant — il ne se dérive de rien. On accepte
 * simplement l'identifiant que l'application utilise réellement.
 */
export const getPublicFundByIsin = createServerFn({ method: "GET" })
  .inputValidator((input: string) => z.string().min(1).parse(input))
  .handler(async ({ data: key }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("assets")
      .select(`${PUBLIC_FUND_COLUMNS}, id`)
      .eq("is_active", true)
      // `or` plutôt que deux requêtes : un ticker et un ISIN ne se confondent
      // pas, la première correspondance est la bonne.
      .or(`isin.eq.${key},ticker.eq.${key}`)
      .limit(1)
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
      // `security_sector` vient d'être ajoutée (migration
      // `fund_holdings_real_identity`) et n'est pas encore dans les types
      // générés par Lovable Cloud — `types.ts` ne s'édite pas à la main (§1.6).
      // Cast localisé et retypage explicite, comme les autres accès Data Engine
      // aux colonnes récentes. À retirer à la prochaine régénération.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: rows } = await (supabaseAdmin.from("fund_holdings") as any)
        .select("security_name, security_isin, security_sector, weight_pct, as_of, source_url")
        .eq("asset_id", assetId)
        .order("as_of", { ascending: false })
        .order("weight_pct", { ascending: false })
        .limit(400);
      // Une seule date : mélanger deux publications donnerait une composition
      // qui n'a jamais existé.
      const holdingRows = (rows ?? []) as HoldingsQueryRow[];
      const latest = holdingRows[0]?.as_of ?? null;
      const sameDay = holdingRows.filter((r) => r.as_of === latest);
      holdings = sameDay.map((r) => ({
        name: r.security_name,
        ticker: null,
        // Le secteur est désormais persisté tel que l'émetteur le publie. Il
        // était renvoyé `null` en dur faute de colonne, ce qui privait le bloc
        // de composition de la seule chose par laquelle il sait commencer.
        sector: r.security_sector ?? null,
        weightPct: r.weight_pct == null ? null : Number(r.weight_pct),
      }));
      holdingsAsOf = latest;
      holdingsSourceUrl = sameDay[0]?.source_url ?? null;
    }

    return { ...fund, holdings, holdingsAsOf, holdingsSourceUrl };
  });

/** Ligne `fund_holdings` telle que cette requête la lit. */
interface HoldingsQueryRow {
  security_name: string;
  security_isin: string | null;
  security_sector: string | null;
  weight_pct: number | string | null;
  as_of: string;
  source_url: string | null;
}

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
