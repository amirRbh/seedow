/**
 * Adaptateur DiscoverAsset → MatchAssetInput (pivot PIU, câblage §6/§7).
 *
 * Le moteur de matching reste découplé de l'UI : il consomme une entrée minimale.
 * Ce mapping est le seul point qui connaît la forme `DiscoverAsset`. Aucune donnée
 * inventée — un champ absent devient null, et le moteur en tirera une couverture
 * nulle honnête plutôt qu'un score fabriqué.
 */
import type { DiscoverAsset } from "@/lib/discover/types";
import type { MatchAssetInput } from "./types";

export function discoverAssetToMatchInput(a: DiscoverAsset): MatchAssetInput {
  return {
    id: a.id,
    terPct: a.ter_pct ?? null,
    riskLevel: a.risk_level ?? null,
    waci: a.waci_tco2e_per_musd_sales ?? null,
    climateScore: a.climate_score ?? null,
    esgScore: a.overall_esg_score ?? null,
    // Les controverses par actif ne sont pas encore exposées dans DiscoverAsset
    // → non couvertes (jamais un « pas de controverse » inventé).
    controversyBand: null,
    dataCoverage: a.data_coverage ?? null,
  };
}
