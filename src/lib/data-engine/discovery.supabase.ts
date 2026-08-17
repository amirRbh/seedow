/**
 * Adaptateur Supabase de la découverte de fonds (I/O réelle, server-only).
 *
 * Crée en base les fonds découverts absents du catalogue, en `is_active=false` :
 * ils n'entrent PAS dans l'univers investissable tant que leur complétude n'est
 * pas validée par le cron d'activation existant (recompute-ingestion-plan). La
 * décision de QUOI créer (dédoublonnage) est pure (`planAssetInserts`) ; ce
 * module ne fait que la lecture des clés existantes et l'INSERT.
 *
 * Aucune donnée inventée : on n'écrit que les champs d'identité réellement
 * fournis par l'export émetteur ; les champs statistiques (expected_return,
 * volatility, esg_score) prennent les défauts de seed de la table et restent
 * marqués « insufficient » côté moteur tant que le marché ne les a pas remplis.
 */

import type { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { DiscoveredFund, ExistingAssetKey } from "./discovery";
import { planAssetInserts } from "./discovery";

export interface EnsureResult {
  created: number;
  skippedExisting: number;
  createdTickers: string[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function ensureDiscoveredAssets(
  client: typeof supabaseAdmin,
  discovered: DiscoveredFund[],
): Promise<EnsureResult> {
  if (discovered.length === 0) return { created: 0, skippedExisting: 0, createdTickers: [] };
  const c = client as any;

  // Clés existantes (actifs actifs ET inactifs) pour ne jamais dupliquer.
  const { data: existingRows, error: selErr } = await c
    .from("assets")
    .select("ticker, isin")
    .limit(5000);
  if (selErr) throw new Error(`ensureDiscoveredAssets/select: ${selErr.message}`);
  const existing: ExistingAssetKey[] = (existingRows ?? []).map((r: any) => ({
    ticker: String(r.ticker),
    isin: r.isin != null ? String(r.isin) : null,
  }));

  const { toCreate, skippedExisting } = planAssetInserts(existing, discovered);
  if (toCreate.length === 0) {
    return { created: 0, skippedExisting: skippedExisting.length, createdTickers: [] };
  }

  const rows = toCreate.map((f) => {
    const row: Record<string, unknown> = {
      ticker: f.ticker,
      name: f.name,
      asset_class: f.assetClass,
      issuer: f.issuer,
      isin: f.isin,
      region: f.region,
      // Découverte = identité seulement. Aucune donnée d'impact inventée : le
      // fonds reste inactif jusqu'à enrichissement + validation de complétude.
      is_active: false,
      esg_score_source: null,
    };
    if (f.currency) row.currency = f.currency;
    if (f.ter != null) row.ter = f.ter;
    return row;
  });

  // onConflict sur ticker : si une course a créé la ligne entre-temps, on ignore.
  const { data: inserted, error: insErr } = await c
    .from("assets")
    .upsert(rows, { onConflict: "ticker", ignoreDuplicates: true })
    .select("ticker");
  if (insErr) throw new Error(`ensureDiscoveredAssets/insert: ${insErr.message}`);

  const createdTickers = (inserted ?? []).map((r: any) => String(r.ticker));
  return {
    created: createdTickers.length,
    skippedExisting: skippedExisting.length,
    createdTickers,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */
