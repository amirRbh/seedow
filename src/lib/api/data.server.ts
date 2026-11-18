/**
 * Chargement serveur des données de l'API publique v1.
 *
 * Deux sources, assemblées par `buildUniverse` comme sur `/comparer` :
 * le catalogue (Observatoire, Supabase) et l'instantané émetteur. Sans base
 * joignable, l'API répond sur l'instantané seul — et le dit (`catalog: false`)
 * plutôt que d'échouer.
 */
import { buildUniverse, toSnapshotSide, type CompareFund } from "@/lib/compare/universe";
import { analyzeAllSnapshotFunds, type SnapshotFundAnalytics } from "@/lib/demo/demo.functions";
import type { ObservatoryFund } from "@/lib/esg/v2/observatory";
import { loadObservatory } from "@/lib/esg/v2/observatory.functions";

export interface ApiData {
  universe: CompareFund[];
  analytics: SnapshotFundAnalytics[];
  /** Fiches catalogue, pour les couches ESG (exclusions documentées, PAI). */
  catalog: ObservatoryFund[];
  snapshotGeneratedAt: string;
  catalogAvailable: boolean;
}

export async function loadApiData(): Promise<ApiData> {
  const [catalog, snap] = await Promise.all([
    loadObservatory().catch((e: unknown) => {
      console.error("[api.v1] catalogue indisponible", e);
      return null;
    }),
    analyzeAllSnapshotFunds(),
  ]);
  return {
    universe: buildUniverse(catalog?.funds ?? [], snap.funds.map(toSnapshotSide)),
    analytics: snap.funds,
    catalog: catalog?.funds ?? [],
    snapshotGeneratedAt: snap.generatedAt,
    catalogAvailable: catalog !== null,
  };
}
