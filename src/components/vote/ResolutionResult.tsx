import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useLang } from "@/hooks/useLang";
import { blocShare, type BlocTally } from "@/lib/vote/bloc";
import type { Resolution } from "@/lib/vote/vote.functions";

interface Props {
  resolution: Resolution;
  bloc: BlocTally;
}

/**
 * Le Résultat — état clos. Le pourcentage officiel est affiché avec sa source
 * (§1.2). En dessous, comment le Bloc Seedow a voté (vrai décompte). Aucun
 * verdict inventé : si la source note une réserve, elle reste visible.
 */
export function ResolutionResult({ resolution, bloc }: Props) {
  const { t } = useTranslation();
  const { lang } = useLang();
  const nf = useMemo(() => new Intl.NumberFormat(lang === "en" ? "en-US" : "fr-FR"), [lang]);
  const pctFmt = useMemo(
    () => new Intl.NumberFormat(lang === "en" ? "en-US" : "fr-FR", { maximumFractionDigits: 1 }),
    [lang],
  );

  const againstPct = Math.round(blocShare(bloc, "against") * 100);

  return (
    <div className="flex flex-col gap-6">
      <div className="paper-card p-6 text-center md:p-8">
        <p className="text-tag font-mono uppercase tracking-[0.14em] text-ink-3">
          {t("vote.result.official")}
        </p>
        {resolution.outcomePct != null ? (
          <p className="mt-3 font-mono text-[clamp(3rem,12vw,4.5rem)] font-bold leading-none tracking-tight text-mint-ink tabular-nums">
            {pctFmt.format(resolution.outcomePct)}&nbsp;%
          </p>
        ) : (
          <p className="mt-3 font-value text-2xl text-ink">{t("vote.result.pending")}</p>
        )}
        {resolution.outcomeNote && (
          <p className="mx-auto mt-3 max-w-prose text-body-sm leading-relaxed text-ink-2">
            {resolution.outcomeNote}
          </p>
        )}
      </div>

      {/* Comment le Bloc Seedow s'est positionné (vrai décompte) */}
      <div className="rounded-lg border border-paper-3 bg-paper p-5">
        <p className="text-tag font-mono uppercase tracking-[0.12em] text-ink-3">
          {t("vote.result.bloc_title")}
        </p>
        {bloc.total === 0 ? (
          <p className="mt-2 text-body-sm text-ink-2">{t("vote.result.bloc_empty")}</p>
        ) : (
          <p className="mt-2 text-body-sm text-ink">
            {t("vote.result.bloc_line", {
              total: nf.format(bloc.total),
              against: nf.format(bloc.against),
              pct: againstPct,
            })}
          </p>
        )}
      </div>

      <a
        href={resolution.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 font-mono text-tag uppercase tracking-[0.08em] text-ink-3 transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight-1"
      >
        {t("vote.source", { name: resolution.sourceName })}
      </a>
    </div>
  );
}
