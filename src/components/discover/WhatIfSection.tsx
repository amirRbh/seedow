import { useTranslation } from "react-i18next";
import { useWhatIf } from "@/hooks/useWhatIf";
import { BAND_LABELS, DIMENSION_LABELS } from "@/lib/matching/labels";
import type { DiscoverAsset } from "@/lib/discover/types";
import type { DimensionDelta } from "@/lib/whatif/engine";

/**
 * What-if (pivot PIU, §10) — « et si tu remplaçais cet actif ? ». Montre des
 * alternatives comparables avec leurs COMPROMIS (ce qui s'améliore ET ce qui se
 * dégrade), jamais un « meilleur ». Affiché seulement s'il existe AU MOINS DEUX
 * alternatives (§10.3 — une alternative unique = une recommandation).
 */
function dimList(t: (k: string, f: string) => string, deltas: DimensionDelta[], n = 2): string {
  return deltas
    .slice(0, n)
    .map((d) => t(DIMENSION_LABELS[d.dimension].i18nKey, DIMENSION_LABELS[d.dimension].fr))
    .join(", ");
}

export function WhatIfSection({ asset }: { asset: DiscoverAsset }) {
  const { t } = useTranslation();
  const { alternatives, loading } = useWhatIf(asset);

  // Règle §10.3 : jamais une seule alternative mise en avant.
  if (loading || alternatives.length < 2) return null;

  return (
    <section className="rounded-xl border border-paper-3 bg-paper p-3.5">
      <p className="mb-1 font-mono text-tag uppercase tracking-[0.18em] text-ink-3">
        {t("whatif.title", "Et si tu changeais ?")}
      </p>
      <p className="mb-3 text-caption text-ink-3 leading-relaxed">
        {t(
          "whatif.subtitle",
          "Des alternatives comparables, avec leurs compromis. À toi de décider — il n'y a pas de « meilleur » universel.",
        )}
      </p>

      <ul className="space-y-3">
        {alternatives.map(({ asset: alt, comparison }) => {
          const impr = comparison.improvements;
          const regr = comparison.regressions;
          return (
            <li key={alt.id} className="rounded-lg border border-paper-3 bg-paper-2/40 p-3">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="truncate text-body-sm font-semibold text-ink">{alt.name}</span>
                <span className="flex-shrink-0 font-mono text-tag uppercase tracking-wider text-ink-3">
                  {t(
                    BAND_LABELS[comparison.bandChange.to].i18nKey,
                    BAND_LABELS[comparison.bandChange.to].fr,
                  )}
                </span>
              </div>

              {/* Compromis bidirectionnel — gains ET coûts dans la même phrase. */}
              <p className="text-body-sm leading-relaxed text-ink-2">
                {impr.length > 0 && (
                  <>
                    <span className="text-mint-ink">
                      {t("whatif.better_on", "Correspond mieux sur {{dims}}", {
                        dims: dimList(t, impr),
                      })}
                    </span>
                    {regr.length > 0 ? " " : "."}
                  </>
                )}
                {regr.length > 0 && (
                  <span className="text-alert-ink">
                    {t("whatif.worse_on", "en échange, {{dims}} baisse.", {
                      dims: dimList(t, regr),
                    })}
                  </span>
                )}
                {impr.length === 0 && regr.length === 0 && (
                  <span>{t("whatif.similar", "Profil très proche sur tes critères.")}</span>
                )}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
