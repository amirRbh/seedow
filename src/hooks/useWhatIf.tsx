/**
 * What-if côté client (pivot PIU, §10). Pour un actif donné, propose des
 * ALTERNATIVES comparables (même classe) issues de l'univers, et calcule le
 * compromis dimension par dimension via `compareAssets` (pur, testé).
 *
 * Le classement des alternatives se fait par correspondance décroissante, mais
 * AUCUNE n'est présentée comme « meilleure » : l'UI affiche les compromis des
 * deux côtés (§10.3). Tout est mémoïsé (produit scalaire léger, §12.3).
 */
import { useMemo } from "react";
import { useAssetUniverse } from "@/hooks/useAssetUniverse";
import { usePersonalUniverse } from "@/hooks/usePersonalUniverse";
import { compareAssets, selectCandidates, type WhatIfComparison } from "@/lib/whatif/engine";
import type { CandidatePoolItem } from "@/lib/whatif/engine";
import type { DiscoverAsset } from "@/lib/discover/types";

export interface WhatIfAlternative {
  asset: DiscoverAsset;
  comparison: WhatIfComparison;
}

export function useWhatIf(current: DiscoverAsset | null | undefined, limit = 3) {
  const { assets, loading } = useAssetUniverse();
  const personal = usePersonalUniverse(assets);

  const alternatives = useMemo<WhatIfAlternative[]>(() => {
    if (!current) return [];
    const currentMatch = personal.matchOf(current.id);
    if (!currentMatch || !currentMatch.scorable) return [];

    const byId = new Map(assets.map((a) => [a.id, a]));
    const pool: CandidatePoolItem[] = assets.map((a) => {
      const m = personal.matchOf(a.id);
      return {
        id: a.id,
        assetClass: a.asset_class,
        matchScore: m?.scorable ? (m.score ?? null) : null,
      };
    });

    const candidates = selectCandidates(current.id, current.asset_class, pool, limit);
    const out: WhatIfAlternative[] = [];
    for (const cand of candidates) {
      const altAsset = byId.get(cand.id);
      const altMatch = personal.matchOf(cand.id);
      if (!altAsset || !altMatch) continue;
      const comparison = compareAssets(currentMatch, altMatch);
      if (comparison.comparable) out.push({ asset: altAsset, comparison });
    }
    return out;
  }, [current, assets, personal, limit]);

  return { alternatives, loading };
}
