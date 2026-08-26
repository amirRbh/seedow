/**
 * Adaptateur Supabase de `HoldingWriter` (I/O réelle, server-only).
 *
 * Upsert sur l'IDENTITÉ publiée de la ligne — l'historisation empile les dates
 * (§13), on ne réécrit que la même date.
 *
 * La clé portait auparavant `(asset_id, security_name, as_of)`. Contre un
 * fichier réel, elle perd des positions : le iShares Global Corp Bond publie
 * 14 978 lignes dont 2 077 noms répétés, chaque répétition étant une obligation
 * distincte du même émetteur. Sous l'ancienne clé, elles s'écrasaient les unes
 * les autres et la composition enregistrée n'était plus celle du fichier — sans
 * la moindre erreur remontée.
 *
 * La clé est désormais le RANG de la ligne dans le document. C'est la seule qui
 * rende le fichier tel quel : l'émetteur publie lui-même des lignes que ses
 * propres colonnes ne distinguent pas (deux tranches HSBC de même échéance et
 * même coupon, douze jambes de change « SAR/USD »).
 *
 * `as any` localisé comme les autres écritures Data Engine (tables non encore
 * régénérées dans les types).
 */

import type { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { HoldingRow, HoldingWriter } from "./holdings";

/* eslint-disable @typescript-eslint/no-explicit-any */
export function supabaseHoldingWriter(client: typeof supabaseAdmin): HoldingWriter {
  const c = client as any;
  return {
    async insertHoldings(rows: HoldingRow[]) {
      if (rows.length === 0) return 0;
      const { error } = await c
        .from("fund_holdings")
        .upsert(rows, { onConflict: "asset_id,as_of,line_no" });
      if (error) throw new Error(`insertHoldings: ${error.message}`);
      return rows.length;
    },
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */
