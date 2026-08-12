/**
 * Adaptateur Supabase de `ObservationWriter` (I/O réelle, server-only).
 *
 * Les tables du Data Engine (data_sources, data_observations) ne figurent dans
 * les types Supabase auto-générés qu'après régénération post-migration ; on
 * passe donc par `as any` de façon localisée, exactement comme
 * `lib/esg/ingest.functions.ts` le fait déjà pour les colonnes MSCI. Aucun
 * calcul ici : uniquement la traduction vers le client Supabase.
 */

import type { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { ObservationRow, ObservationWriter } from "./persist";

/* eslint-disable @typescript-eslint/no-explicit-any */
export function supabaseObservationWriter(client: typeof supabaseAdmin): ObservationWriter {
  const c = client as any;
  return {
    async resolveSourceIds(keys) {
      if (keys.length === 0) return {};
      const { data, error } = await c.from("data_sources").select("id, key").in("key", keys);
      if (error) throw new Error(`resolveSourceIds: ${error.message}`);
      const map: Record<string, string> = {};
      for (const row of data ?? []) map[row.key as string] = row.id as string;
      return map;
    },
    async insertObservations(rows: ObservationRow[]) {
      if (rows.length === 0) return 0;
      const { error } = await c.from("data_observations").insert(rows);
      if (error) throw new Error(`insertObservations: ${error.message}`);
      return rows.length;
    },
    async updateAssetCanonical(assetId, update) {
      const { error } = await c.from("assets").update(update).eq("id", assetId);
      if (error) throw new Error(`updateAssetCanonical: ${error.message}`);
    },
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */
