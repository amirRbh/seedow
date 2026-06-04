import { useDecisionHistory, type DecisionType } from "@/hooks/useDecisionHistory";
import { cn } from "@/lib/utils";

const TYPE_TONE: Record<DecisionType, { dot: string; label: string }> = {
  creation: { dot: "bg-ink", label: "Création" },
  cause: { dot: "bg-moss-1", label: "Cause" },
  exclusion: { dot: "bg-rust", label: "Exclusion" },
  horizon: { dot: "bg-gold", label: "Horizon" },
  risk: { dot: "bg-gold", label: "Risque" },
  rebalance: { dot: "bg-moss-2", label: "Rééquilibrage" },
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

export function DecisionTimeline() {
  const { decisions, loading } = useDecisionHistory();

  if (loading) {
    return <p className="text-[12px] text-ink-3 mt-3">Chargement de l'historique…</p>;
  }

  if (decisions.length === 0) {
    return (
      <p className="text-sm text-ink-3 mt-3">
        Aucune décision enregistrée pour ce portefeuille.
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
                {fmtDate(d.date)}
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
