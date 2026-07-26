import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { detectEsgDrop } from "@/lib/esg/esg-alert";

/**
 * Badge d'avertissement affiché à côté d'un actif dont le score ESG a
 * récemment baissé de façon significative (> 20 % par défaut).
 *
 * Ne s'affiche que si un score précédent réel est fourni et qu'une baisse est
 * détectée — jamais sur une donnée fabriquée (CLAUDE.md). L'avertissement est
 * porté par une icône + un libellé accessible (jamais la couleur seule), en
 * ton `--solar` (avertissement doux, pas `--alert`). Le badge mène à Ethi pour
 * une explication.
 */
export function ESGAlertBadge({
  assetName,
  esgScore,
  previousEsgScore,
  thresholdPct = 20,
}: {
  assetName: string;
  esgScore: number;
  previousEsgScore?: number | null;
  thresholdPct?: number;
}) {
  const { t } = useTranslation();
  const { dropped } = detectEsgDrop(esgScore, previousEsgScore, thresholdPct);
  if (!dropped) return null;

  const message = t("esg_alert.tooltip", { asset: assetName });

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to="/ethi"
          search={{} as never}
          aria-label={message}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center justify-center w-4 h-4 rounded-full flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          style={{
            background: "var(--solar-tint)",
            border: "1px solid var(--solar-tint-border)",
            color: "var(--solar)",
          }}
        >
          <svg
            viewBox="0 0 24 24"
            className="w-2.5 h-2.5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
          </svg>
        </Link>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[220px] text-caption leading-snug">
        {message}
      </TooltipContent>
    </Tooltip>
  );
}
