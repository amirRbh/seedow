import { useMemo } from "react";
import { useActivePortfolio } from "@/hooks/useActivePortfolio";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useAssetUniverse } from "@/hooks/useAssetUniverse";
import { useResolutions } from "@/hooks/useResolutions";
import { buildReveil, type ReveilSubject, type ReveilVote } from "@/lib/reveil/reveil";
import { daysUntilClose } from "@/lib/vote/bloc";
import type { DiscoverAsset } from "@/lib/discover/types";

/**
 * Assemble Le Réveil : croise les entreprises que l'utilisateur détient/suit avec
 * leurs signaux ESG (univers) et les votes d'AG ouverts, puis délègue au moteur
 * pur `buildReveil`. Renvoie aussi la table des actifs pour ouvrir leur détail.
 */
export function useReveil() {
  const { portfolio, loading: pfLoading } = useActivePortfolio();
  const { assetIds: watchedIds, loading: wlLoading } = useWatchlist();
  const { assets, loading: uniLoading } = useAssetUniverse();
  const { resolutions, loading: resLoading } = useResolutions();

  const assetsById = useMemo(
    () => new Map<string, DiscoverAsset>(assets.map((a) => [a.id, a])),
    [assets],
  );

  const dispatches = useMemo(() => {
    const ownedIds = new Set((portfolio?.holdings ?? []).map((h) => h.id));
    const subjectIds = new Set<string>([...ownedIds, ...watchedIds]);

    const subjects: ReveilSubject[] = [];
    for (const id of subjectIds) {
      const a = assetsById.get(id);
      if (!a) continue;
      subjects.push({
        assetId: a.id,
        ticker: a.ticker,
        name: a.name,
        esgScore: a.overall_esg_score,
        greenwashingRisk: a.greenwashing_risk,
        greenwashingReasons: a.greenwashing_reasons,
        owned: ownedIds.has(id),
      });
    }

    const votes: ReveilVote[] = resolutions
      .filter((r) => r.resolution.status === "open")
      .map((r) => ({
        resolutionId: r.resolution.id,
        ticker: r.resolution.ticker,
        company: r.resolution.company,
        daysLeft: daysUntilClose(r.resolution.closesAt),
      }));

    return buildReveil(subjects, votes);
  }, [portfolio, watchedIds, assetsById, resolutions]);

  const loading = pfLoading || wlLoading || uniLoading || resLoading;
  return { dispatches, loading, assetsById };
}
