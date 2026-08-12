/**
 * Adaptateur Supabase de `HoldingWriter` (I/O réelle, server-only).
 *
 * Upsert par (asset_id, security_name, as_of) — l'historisation empile les
 * dates (§13), on ne réécrit que la même date. `as any` localisé comme les
 * autres écritures Data Engine (tables non encore régénérées dans les types).
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
        .upsert(rows, { onConflict: "asset_id,security_name,as_of" });
      if (error) throw new Error(`insertHoldings: ${error.message}`);
      return rows.length;
    },
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */
