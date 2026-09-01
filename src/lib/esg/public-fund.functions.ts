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
 *
 * ── Deux requêtes, et pas un `or` ─────────────────────────────────────────
 *
 * La clé arrive du segment d'URL `/fonds/$isin` : elle est publique et
 * arbitraire. Interpolée dans `.or("isin.eq.<clé>,ticker.eq.<clé>")`, une clé
 * contenant une virgule ou une parenthèse ne se lit plus comme une valeur mais
 * comme de la GRAMMAIRE de filtre PostgREST — l'appelant décide alors d'une
 * partie de la requête. `.eq()` passe la valeur en paramètre, jamais en
 * syntaxe : deux appels successifs ferment la porte, au prix d'un aller-retour
 * supplémentaire dans le seul cas où l'ISIN ne correspond à rien.
 */
export const getPublicFundByIsin = createServerFn({ method: "GET" })
  .inputValidator((input: string) => z.string().min(1).parse(input))
  .handler(async ({ data: key }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const byColumn = (column: "isin" | "ticker") =>
      supabaseAdmin
        .from("assets")
        .select(`${PUBLIC_FUND_COLUMNS}, id`)
        .eq("is_active", true)
        .eq(column, key)
        .limit(1)
        .maybeSingle();

    // Un ticker et un ISIN ne se confondent pas : la première correspondance
    // est la bonne, et l'ISIN prime puisque c'est l'identifiant officiel.
    let { data, error } = await byColumn("isin");
    if (error) throw new Error(error.message);
    if (!data) ({ data, error } = await byColumn("ticker"));
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
