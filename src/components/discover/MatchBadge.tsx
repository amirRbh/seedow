import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { MatchResult, MatchBand } from "@/lib/matching/types";
import {
  BAND_LABELS,
  DIMENSION_LABELS,
  UNCOVERED_REASON_LABELS,
  satisfactionWord,
} from "@/lib/matching/labels";

/**
 * Repère de correspondance PIU — « à quel point cet actif correspond à CE QUE TU
 * AS DIT ». Ce n'est pas un jugement de Seedow : c'est le résultat du filtre de
 * l'utilisateur (§6). Comme ImpactBadge : pastille + mot, jamais le sens par la
 * couleur seule (DA §4). On affiche une BANDE, pas un faux « 94 % » ; le
 * pourcentage n'apparaît qu'au-delà d'une couverture élevée (§6.4).
 */
const BAND_TONE: Record<MatchBand, { dot: string; text: string }> = {
  strong: { dot: "bg-mint", text: "text-mint-ink" },
  good: { dot: "bg-mint", text: "text-mint-ink" },
  partial: { dot: "bg-ink-3", text: "text-ink-2" },
  weak: { dot: "bg-ink-3", text: "text-ink-3" },
  not_scored: { dot: "bg-paper-3", text: "text-ink-3" },
};

export function MatchBadge({ match, className }: { match: MatchResult; className?: string }) {
  const { t } = useTranslation();
  const tone = BAND_TONE[match.band];
  const band = BAND_LABELS[match.band];
  const label = t(band.i18nKey, band.fr);

  return (
    <span
      className={cn("inline-flex items-center gap-1.5", className)}
      title={
        match.scorable
          ? `${label}${match.displayPercent != null ? ` · ${match.displayPercent}%` : ""}`
          : label
      }
    >
      <span className={cn("h-1.5 w-1.5 flex-shrink-0 rounded-full", tone.dot)} aria-hidden="true" />
      <span className={cn("font-mono text-tag uppercase tracking-wider", tone.text)}>{label}</span>
      {match.displayPercent != null && (
        <span className="text-tag font-semibold tabular-nums text-ink-3">
          {match.displayPercent}%
        </span>
      )}
    </span>
  );
}

/**
 * « Pourquoi ? » décomposé (§6.6) : les dimensions triées par contribution, avec
 * la valeur mesurée et le mot de satisfaction — dimensions faibles COMPRISES, pas
 * seulement les points forts. Puis, honnêtement, ce qui n'a pas pu être évalué et
 * pourquoi. Aucune information cachée.
 */
export function MatchWhy({ match, className }: { match: MatchResult; className?: string }) {
  const { t } = useTranslation();

  return (
    <div className={cn("space-y-2", className)}>
      {match.contributions.length > 0 && (
        <ul className="space-y-1.5">
          {match.contributions.map((c) => {
            const dim = DIMENSION_LABELS[c.dimension];
            const sat = satisfactionWord(c.satisfaction);
            const strong = c.satisfaction >= 0.6;
            return (
              <li
                key={c.dimension}
                className="flex items-baseline justify-between gap-3 text-body-sm"
              >
                <span className="flex items-center gap-1.5 text-ink">
                  <span
                    className={cn(
                      "h-1.5 w-1.5 flex-shrink-0 rounded-full",
                      strong ? "bg-mint" : "bg-ink-3",
                    )}
                    aria-hidden="true"
                  />
                  {t(dim.i18nKey, dim.fr)}
                </span>
                <span className="flex items-baseline gap-2 text-right">
                  {c.measuredLabel && (
                    <span className="font-mono text-tag text-ink-3">{c.measuredLabel}</span>
                  )}
                  <span
                    className={cn(
                      "text-caption font-semibold",
                      strong ? "text-mint-ink" : "text-ink-2",
                    )}
                  >
                    {t(sat.i18nKey, sat.fr)}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {match.missing.length > 0 && (
        <div className="border-t border-paper-3 pt-2">
          <p className="mb-1 font-mono text-tag uppercase tracking-wider text-ink-3">
            {t("match.not_measured", "Non mesuré")}
          </p>
          <ul className="flex flex-wrap gap-x-3 gap-y-0.5">
            {match.missing.map((m) => {
              const dim = DIMENSION_LABELS[m.dimension];
              const reason = UNCOVERED_REASON_LABELS[m.reason];
              return (
                <li key={m.dimension} className="text-caption text-ink-3">
                  {t(dim.i18nKey, dim.fr)}
                  <span className="text-ink-3/70"> — {t(reason.i18nKey, reason.fr)}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
