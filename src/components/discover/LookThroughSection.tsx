import { useTranslation } from "react-i18next";
import { useAssetHoldings } from "@/hooks/useAssetHoldings";

/**
 * « Ce que ton argent finance » (pivot PIU, §7/§11) — la composition RÉELLE du
 * fonds (look-through), pas un score. Combien d'entreprises, la répartition
 * sectorielle/géographique, les principaux titres, la concentration — chaque
 * chiffre rapporté à la COUVERTURE et daté (§1.2). Tant que la composition n'est
 * pas ingérée, on l'affiche honnêtement « en attente », jamais un chiffre inventé.
 */
function pct(x: number): string {
  return `${x.toFixed(1).replace(".", ",")} %`;
}

function Bar({ label, weightPct, max }: { label: string; weightPct: number; max: number }) {
  const width = max > 0 ? Math.max(2, (weightPct / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="w-28 flex-shrink-0 truncate text-body-sm text-ink" title={label}>
        {label}
      </span>
      <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-paper-2">
        <span
          className="absolute inset-y-0 left-0 rounded-full bg-mint"
          style={{ width: `${width}%` }}
          aria-hidden="true"
        />
      </span>
      <span className="w-14 flex-shrink-0 text-right font-mono text-tag tabular-nums text-ink-2">
        {pct(weightPct)}
      </span>
    </div>
  );
}

export function LookThroughSection({
  assetId,
  issuer,
}: {
  assetId: string;
  issuer?: string | null;
}) {
  const { t } = useTranslation();
  const { profile, loading, hasData } = useAssetHoldings(assetId);

  return (
    <section className="rounded-xl border border-paper-3 bg-paper p-3.5">
      <p className="mb-2.5 font-mono text-tag uppercase tracking-[0.18em] text-ink-3">
        {t("lookthrough.title", "Ce que ton argent finance")}
      </p>

      {loading ? (
        <p className="text-body-sm text-ink-3">{t("common.loading", "Chargement…")}</p>
      ) : !hasData || !profile ? (
        // En attente : la composition n'est pas encore ingérée (harvester iShares).
        <p className="text-body-sm text-ink-2 leading-relaxed">
          {t(
            "lookthrough.pending",
            "Composition en cours d'ingestion depuis les documents officiels. On n'affiche que ce qu'on a réellement mesuré.",
          )}
        </p>
      ) : (
        <div className="space-y-4">
          {/* Compte + couverture datée (§5.4 / §7 — jamais un chiffre sans sa base). */}
          <p className="text-body-sm text-ink-2 leading-relaxed">
            <span className="font-semibold text-ink">
              {t("lookthrough.count", "{{n}} entreprises", { n: profile.holdingsCount })}
            </span>{" "}
            —{" "}
            {t("lookthrough.coverage", "calculé sur {{cov}} du fonds", {
              cov: pct(profile.coveragePct),
            })}
            {profile.asOf ? ` · ${t("lookthrough.asof", "au {{d}}", { d: profile.asOf })}` : ""}
          </p>

          {/* Répartition sectorielle (si fournie). */}
          {profile.sectorBreakdown.length > 0 && (
            <div className="space-y-1.5">
              <p className="font-mono text-tag uppercase tracking-wider text-ink-3">
                {t("lookthrough.sectors", "Secteurs")}
              </p>
              {profile.sectorBreakdown.slice(0, 5).map((s) => (
                <Bar
                  key={s.key}
                  label={s.key}
                  weightPct={s.weightPct}
                  max={profile.sectorBreakdown[0].weightPct}
                />
              ))}
            </div>
          )}

          {/* Principaux titres. */}
          {profile.topHoldings.length > 0 && (
            <div className="space-y-1">
              <p className="font-mono text-tag uppercase tracking-wider text-ink-3">
                {t("lookthrough.top_holdings", "Principales positions")}
              </p>
              <ul className="space-y-0.5">
                {profile.topHoldings.slice(0, 5).map((h) => (
                  <li
                    key={`${h.name}-${h.isin ?? ""}`}
                    className="flex items-baseline justify-between gap-3 text-body-sm"
                  >
                    <span className="truncate text-ink">{h.name}</span>
                    <span className="flex-shrink-0 font-mono text-tag tabular-nums text-ink-2">
                      {pct(h.weightPct)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Concentration — sur les titres sous-jacents (vraie granularité). */}
          {profile.concentration && (
            <p className="text-caption text-ink-2 leading-relaxed">
              {t(
                "lookthrough.concentration",
                "Ton exposition repose sur ~{{eff}} titres effectifs ; la plus grosse ligne pèse {{top}}.",
                {
                  eff: Math.round(profile.concentration.effectiveHoldings),
                  top: pct(profile.concentration.topWeightPct),
                },
              )}
            </p>
          )}

          {/* Source datée (§1.2 — un chiffre, une source visible). */}
          <p className="border-t border-paper-3 pt-2 font-mono text-tag text-ink-3">
            {t("lookthrough.source", "Source : composition officielle")}
            {issuer ? ` ${issuer}` : ""}
            {profile.asOf ? ` · ${profile.asOf}` : ""}
          </p>
        </div>
      )}
    </section>
  );
}
