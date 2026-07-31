import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useLang } from "@/hooks/useLang";
import { daysUntilClose, type BlocTally, type VoteChoice } from "@/lib/vote/bloc";
import type { Resolution } from "@/lib/vote/vote.functions";

interface Props {
  resolution: Resolution;
  bloc: BlocTally;
  myChoice: VoteChoice | null;
}

/** Une résolution dans la liste `/vote` — carte cliquable vers le parcours. */
export function ResolutionListItem({ resolution, bloc, myChoice }: Props) {
  const { t } = useTranslation();
  const { lang } = useLang();
  const nf = useMemo(() => new Intl.NumberFormat(lang === "en" ? "en-US" : "fr-FR"), [lang]);

  const isClosed = resolution.status === "closed";
  const days = isClosed ? null : daysUntilClose(resolution.closesAt);

  return (
    <Link
      to="/vote/$resolutionId"
      params={{ resolutionId: resolution.id }}
      className="group block rounded-lg border border-paper-3 bg-paper p-5 transition-transform duration-300 hover:scale-[1.01] hover:border-ink-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight-1"
      style={{ transitionTimingFunction: "cubic-bezier(0.32,0.72,0,1)" }}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-tag uppercase tracking-[0.1em] text-ink-3">
          {resolution.company}
          {resolution.ticker ? ` · ${resolution.ticker}` : ""}
        </span>
        {isClosed ? (
          <span className="rounded-full bg-paper-2 px-2.5 py-1 font-mono text-tag uppercase tracking-[0.08em] text-ink-2">
            {t("vote.status.closed")}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-paper-2 px-2.5 py-1 font-mono text-tag uppercase tracking-[0.08em] text-ink">
            <span aria-hidden="true" className="apple-live" />
            {days === 0 ? t("vote.status.last_day") : t("vote.status.days_left", { n: days })}
          </span>
        )}
      </div>

      <h3 className="mt-3 font-value text-lg leading-snug text-ink">{resolution.title}</h3>

      <div className="mt-4 flex items-center justify-between border-t border-paper-3 pt-3">
        <span className="font-mono text-caption text-ink-2 tabular-nums">
          {bloc.total === 0
            ? t("vote.list.bloc_empty")
            : t("vote.list.bloc_count", { formatted: nf.format(bloc.total) })}
        </span>
        <span className="font-mono text-tag uppercase tracking-[0.12em] text-ink">
          {myChoice
            ? t("vote.list.voted", { choice: t(`vote.choice_${myChoice}`) })
            : isClosed
              ? t("vote.list.see_result")
              : t("vote.list.give_voice")}
          <span
            aria-hidden="true"
            className="ml-1 inline-block transition-transform group-hover:translate-x-0.5"
          >
            →
          </span>
        </span>
      </div>
    </Link>
  );
}
