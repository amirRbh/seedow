/**
 * Personal Investment Universe côté client (pivot PIU, §6/§7).
 *
 * Combine l'univers Découvrir (`DiscoverAsset[]`) avec les préférences PONDÉRÉES
 * de l'utilisateur pour produire, par actif, un `MatchResult` (bande, couverture,
 * « pourquoi » décomposé). Le calcul est un simple produit scalaire par actif :
 * il tourne côté client, mémoïsé, pour que le reclassement soit instantané quand
 * l'utilisateur bouge ses curseurs (§12.3). Aucune I/O ici — les poids viennent de
 * `usePreferences`, la donnée d'actif est déjà en mémoire.
 */
import { useMemo } from "react";
import { usePreferences } from "@/hooks/usePreferences";
import { discoverAssetToMatchInput } from "@/lib/matching/discover-adapter";
import { matchUniverse, riskToleranceToTargetLevel } from "@/lib/matching";
import type { MatchResult } from "@/lib/matching/types";
import type { DiscoverAsset } from "@/lib/discover/types";

interface PersonalUniverse {
  /** Résultat de correspondance d'un actif, ou null s'il n'est pas dans l'univers. */
  matchOf: (assetId: string) => MatchResult | null;
  /** ids des actifs scorables, meilleure correspondance d'abord. */
  rankedIds: string[];
  /** Nombre d'actifs pour lesquels un score est affichable. */
  scoredCount: number;
  /** Total analysé (le « sur N analysés », §5.4). */
  analyzedCount: number;
  loading: boolean;
}

export function usePersonalUniverse(assets: DiscoverAsset[]): PersonalUniverse {
  const { effective, loading } = usePreferences();

  return useMemo(() => {
    const weights = effective.dimensionWeights;
    const context = {
      targetRiskLevel: riskToleranceToTargetLevel(effective.riskTolerance),
    };
    const inputs = assets.map(discoverAssetToMatchInput);
    const universe = matchUniverse(inputs, weights, context);
    const byId = new Map<string, MatchResult>();
    for (const r of universe.ranked) byId.set(r.assetId, r);
    for (const r of universe.unscored) byId.set(r.assetId, r);
    return {
      matchOf: (id: string) => byId.get(id) ?? null,
      rankedIds: universe.ranked.map((r) => r.assetId),
      scoredCount: universe.ranked.length,
      analyzedCount: universe.analyzed,
      loading,
    };
  }, [assets, effective, loading]);
}
