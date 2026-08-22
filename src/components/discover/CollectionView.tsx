import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useCollections } from "@/hooks/useCollections";
import { useAssetUniverse } from "@/hooks/useAssetUniverse";
import { effectiveWeights } from "@/lib/collections/model";
import { CollectionImpactPanel } from "./CollectionImpactPanel";

/**
 * « Ma collection » (pivot PIU, §8/§12) — les actifs que l'utilisateur a
 * sélectionnés, avec leur poids effectif, et l'analyse d'impact consolidée
 * juste en dessous (feedback immédiat §8.3). L'utilisateur décide ; Seedow
 * analyse. Pas d'optimisation automatique.
 */
function pct(x: number): string {
  return `${(x * 100).toFixed(1).replace(".", ",")} %`;
}

export function CollectionView() {
  const { t } = useTranslation();
  const { collections, loading, removeEverywhere } = useCollections();
  const { assets } = useAssetUniverse();

  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of assets) m.set(a.id, a.name);
    return m;
  }, [assets]);

  const collection = collections[0] ?? null;
  const weights = useMemo(
    () => (collection ? effectiveWeights(collection.items, collection.weightMode) : {}),
    [collection],
  );

  if (loading) {
    return <p className="px-5 text-body-sm text-ink-3">{t("common.loading", "Chargement…")}</p>;
  }

  if (!collection || collection.items.length === 0) {
    return (
      <div className="px-5">
        <div className="rounded-xl border border-dashed border-paper-3 bg-paper p-6 text-center">
          <p className="text-body-sm font-semibold text-ink">
            {t("collection.empty_title", "Ta collection est vide")}
          </p>
          <p className="mt-1 text-body-sm text-ink-2 leading-relaxed">
            {t(
              "collection.empty_desc",
              "Ajoute des actifs depuis l'explorateur pour voir ce que ton argent financerait — et si tes fonds se recoupent.",
            )}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-5">
      {/* Lignes de la collection */}
      <div>
        <p className="mb-2 font-mono text-tag uppercase tracking-[0.16em] text-ink-3">
          {collection.name} ·{" "}
          {t("collection.count", "{{n}} actifs", { n: collection.items.length })}
        </p>
        <ul className="space-y-1.5">
          {collection.items.map((item) => (
            <li key={item.assetId} className="paper-card flex items-center gap-3 p-3">
              <div className="flex-1 min-w-0">
                <p className="truncate text-body-sm font-semibold text-ink">
                  {nameById.get(item.assetId) ?? item.assetId}
                </p>
                <p className="font-mono text-tag tabular-nums text-ink-3">
                  {pct(weights[item.assetId] ?? 0)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeEverywhere(item.assetId)}
                aria-label={t("collection.remove", "Retirer")}
                className="flex-shrink-0 rounded-full border border-paper-3 px-3 py-1.5 text-caption font-semibold text-ink-2 transition-colors hover:border-alert/50 hover:text-alert-ink"
              >
                {t("collection.remove", "Retirer")}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Impact consolidé (look-through + overlap). */}
      <CollectionImpactPanel collection={collection} />
    </div>
  );
}
