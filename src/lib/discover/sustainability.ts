/**
 * Pont entre l'univers Découvrir et la classification durable indépendante de
 * SFDR (Phase B4). Centralise le choix du référentiel carbone (ACWI) pour que
 * TOUS les consommateurs Découvrir (lignes, fiche, alertes, réveil) partagent la
 * même vérité de durabilité — au lieu de dériver chacun sa lecture de l'article
 * SFDR. Fonction pure et testée.
 */

import { ACWI_WACI_TCO2E_PER_MUSD } from "@/lib/esg/benchmark";
import {
  deriveSustainabilityProfile,
  type DataCoverage,
  type SustainabilityProfile,
} from "@/lib/esg/sustainability-classification";

export interface AssetTierInput {
  /** Score ESG global 0..100 (échelle `assets.esg_score`), ou null. */
  esgScore0to100: number | null;
  /** Score climat / pilier E 0..100, ou null. */
  climateScore0to100: number | null;
  waci: number | null;
  impliedTempRise: string | null;
  exclusionsCount: number;
  dataCoverage: DataCoverage;
  sfdrArticle: number | null;
}

/** Dérive le profil de durabilité d'un actif de l'univers (référence ACWI). */
export function deriveDiscoverAssetTier(input: AssetTierInput): SustainabilityProfile {
  return deriveSustainabilityProfile({
    esgScore: input.esgScore0to100,
    climateScore: input.climateScore0to100,
    waci: input.waci,
    benchmarkWaci: ACWI_WACI_TCO2E_PER_MUSD,
    impliedTempRise: input.impliedTempRise,
    exclusionsCount: input.exclusionsCount,
    dataCoverage: input.dataCoverage,
    sfdrArticle: input.sfdrArticle,
  });
}
