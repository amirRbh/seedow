import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { DataCoverage, GreenwashingReason, GreenwashingRisk } from "@/lib/esg/transparency";

/**
 * Badges de transparence — le différenciateur confiance de Seedow :
 * on affiche la qualité de nos données et le risque de greenwashing
 * AVEC leurs raisons, au lieu d'un score opaque.
 */

const COVERAGE_TONE: Record<DataCoverage, string> = {
  complete: "bg-highlight-5 text-highlight-1 border-highlight-4",
  partial: "bg-solar-tint text-ink border-solar/40",
  estimated: "bg-paper-2 text-ink-2 border-paper-3",
};

export function DataCoverageBadge({
  coverage,
  className,
}: {
  coverage: DataCoverage;
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex items-center gap-1 text-tag font-semibold px-2 py-0.5 rounded-full border cursor-help",
            COVERAGE_TONE[coverage],
            className,
          )}
        >
          <span aria-hidden className="inline-block w-1.5 h-1.5 rounded-full bg-current" />
          {t(`transparency.coverage.${coverage}`)}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-[260px] text-caption leading-snug">
        {t(`transparency.coverage_hint.${coverage}`)}
      </TooltipContent>
    </Tooltip>
  );
}

const RISK_TONE: Record<GreenwashingRisk, string> = {
  low: "bg-highlight-5 text-highlight-1 border-highlight-4",
  medium: "bg-solar-tint text-ink border-solar/40",
  high: "bg-rust/10 text-rust border-rust/20",
};

export function GreenwashingBadge({
  risk,
  reasons,
  className,
}: {
  risk: GreenwashingRisk;
  reasons: GreenwashingReason[];
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex items-center gap-1 text-tag font-semibold px-2 py-0.5 rounded-full border cursor-help",
            RISK_TONE[risk],
            className,
          )}
        >
          {risk !== "low" && <span aria-hidden>⚠</span>}
          {t("transparency.gw_label")} : {t(`transparency.gw_risk.${risk}`)}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-[280px] text-caption leading-snug">
        {reasons.length === 0 ? (
          t("transparency.gw_hint_low")
        ) : (
          <ul className="list-disc pl-3.5 space-y-1">
            {reasons.map((r) => (
              <li key={r}>{t(`transparency.reasons.${r}`)}</li>
            ))}
          </ul>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * "D'où vient ce chiffre ?" — chaque donnée ESG affichée doit être traçable
 * jusqu'à sa source et sa méthodologie. À placer sous tout score/graphique ESG.
 */
export function SourceLink({ className }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <Link
      to="/methodologie"
      className={cn(
        "inline-flex items-center gap-1 text-caption text-ink-3 hover:text-ink underline underline-offset-4 decoration-dotted transition-colors",
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        className="w-3 h-3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 16v-4M12 8h.01" />
      </svg>
      {t("transparency.source_link")}
    </Link>
  );
}
