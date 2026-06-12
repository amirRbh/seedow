import { useTranslation } from "react-i18next";
import { useDecisionHistory, type DecisionType } from "@/hooks/useDecisionHistory";
import { cn } from "@/lib/utils";
import { useLang } from "@/hooks/useLang";
import { formatDate } from "@/lib/format";

export function DecisionTimeline() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const { decisions, loading } = useDecisionHistory();

  const TYPE_TONE: Record<DecisionType, { dot: string; label: string }> = {
    creation: { dot: "bg-ink", label: t("decision_timeline.creation") },
    cause: { dot: "bg-moss-1", label: t("decision_timeline.cause") },
    exclusion: { dot: "bg-rust", label: t("decision_timeline.exclusion") },
    horizon: { dot: "bg-gold", label: t("decision_timeline.horizon") },
    risk: { dot: "bg-gold", label: t("decision_timeline.risk") },
    rebalance: { dot: "bg-moss-2", label: t("decision_timeline.rebalance") },
    contribution: { dot: "bg-gold", label: t("decision_timeline.contribution") },
  };

  if (loading) {
    return <p className="text-[12px] text-ink-3 mt-3">{t("decision_timeline.loading")}</p>;
  }

  if (decisions.length === 0) {
    return (
      <p className="text-sm text-ink-3 mt-3">
        {t("decision_timeline.empty")}
      </p>
    );
  }

  return (
    <ol className="mt-5 relative border-l border-paper-3 pl-5 space-y-5">
      {decisions.map((d) => {
        const tone = TYPE_TONE[d.type];
        return (
          <li key={d.id} className="relative">
            <span
              aria-hidden="true"
              className={cn(
                "absolute -left-[26px] top-1.5 w-2.5 h-2.5 rounded-full ring-4 ring-paper",
                tone.dot,
              )}
            />
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase tracking-[0.18em] font-semibold text-ink-3">
                {tone.label}
              </span>
              <span className="text-[10px] text-ink-3">·</span>
              <time
                dateTime={d.date}
                className="text-[10px] text-ink-3 tabular-nums uppercase tracking-wider"
              >
                {formatDate(d.date, lang, { day: "numeric", month: "long", year: "numeric" })}
              </time>
            </div>
            <p className="text-sm font-medium text-ink leading-snug">{d.title}</p>
            {d.detail && (
              <p className="text-[12px] text-ink-3 mt-0.5 leading-relaxed">{d.detail}</p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
