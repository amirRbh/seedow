import { useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { Resolution } from "@/lib/vote/vote.functions";
import type { VoteChoice } from "@/lib/vote/bloc";

interface Props {
  resolution: Resolution;
  onVote: (choice: VoteChoice) => void;
  casting: boolean;
}

/**
 * Le Vote — Ethi explique la résolution en clair (§5.3), les deux camps sont
 * présentés à poids égal (neutralité §5.1 : on n'oriente pas le vote), la source
 * est visible à l'écran (§1.2). L'utilisateur tranche : Pour / Contre / s'abstenir.
 */
export function VotePanel({ resolution, onVote, casting }: Props) {
  const { t } = useTranslation();
  const [pending, setPending] = useState<VoteChoice | null>(null);

  const choose = (choice: VoteChoice) => {
    if (casting) return;
    setPending(choice);
    onVote(choice);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Ethi explique */}
      <div className="paper-card p-4 md:p-5">
        <div className="flex gap-3">
          <span
            aria-hidden="true"
            className="mt-0.5 h-7 w-7 flex-none rounded-full"
            style={{ background: "linear-gradient(135deg, var(--mint), var(--ice))" }}
          />
          <div>
            <span className="text-tag font-mono uppercase tracking-[0.12em] text-ink-3">
              {t("vote.explainer.who")}
            </span>
            <p className="mt-1 text-body-sm leading-relaxed text-ink">{resolution.summary}</p>
          </div>
        </div>
      </div>

      {/* Les deux camps, à poids égal */}
      <div className="flex flex-col gap-2.5">
        <CampRow tone="against" label={resolution.againstLabel} tag={t("vote.choice_against")} />
        <CampRow tone="for" label={resolution.forLabel} tag={t("vote.choice_for")} />
      </div>

      {/* Contexte : ce que votent les gros fonds par défaut */}
      <p className="rounded-lg bg-paper-2 px-4 py-3 font-mono text-caption leading-relaxed text-ink-2">
        {resolution.fundsStance}
      </p>

      {/* Le geste — deux choix neutres, égaux */}
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <VoteButton
            label={t("vote.choice_against")}
            loading={casting && pending === "against"}
            disabled={casting}
            onClick={() => choose("against")}
          />
          <VoteButton
            label={t("vote.choice_for")}
            loading={casting && pending === "for"}
            disabled={casting}
            onClick={() => choose("for")}
          />
        </div>
        <button
          type="button"
          disabled={casting}
          onClick={() => choose("abstain")}
          className="mx-auto text-caption uppercase tracking-[0.16em] text-ink-3 underline-offset-4 transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight-1 disabled:opacity-50"
        >
          {casting && pending === "abstain" ? t("vote.casting") : t("vote.choice_abstain")}
        </button>
      </div>

      {/* Source visible à l'écran */}
      <a
        href={resolution.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 font-mono text-tag uppercase tracking-[0.08em] text-ink-3 transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight-1"
      >
        <SourceIcon />
        {t("vote.source", { name: resolution.sourceName })}
      </a>
    </div>
  );
}

function CampRow({ tone, label, tag }: { tone: "for" | "against"; label: string; tag: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-paper-3 bg-paper p-3">
      <span
        className={cn(
          "mt-0.5 flex-none rounded-full px-2.5 py-1 font-mono text-tag font-semibold uppercase tracking-[0.06em]",
          tone === "against" ? "bg-paper-2 text-ink" : "bg-paper-2 text-ink",
        )}
      >
        {tag}
      </span>
      <span className="text-body-sm leading-snug text-ink">{label}</span>
    </div>
  );
}

function VoteButton({
  label,
  loading,
  disabled,
  onClick,
}: {
  label: string;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex items-center justify-center rounded-full border border-ink px-4 py-4 text-body font-semibold text-ink",
        "transition-transform duration-300 hover:scale-[1.02] hover:bg-ink hover:text-paper",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight-1 focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-60",
      )}
      style={{ transitionTimingFunction: "cubic-bezier(0.32,0.72,0,1)" }}
    >
      {loading ? t("vote.casting") : label}
    </button>
  );
}

function SourceIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.5 1.5" />
      <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.5-1.5" />
    </svg>
  );
}
