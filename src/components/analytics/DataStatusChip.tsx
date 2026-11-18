import { CircleCheck, CircleDashed, Clock, FlaskConical, Sigma } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { DataStatus } from "@/lib/data/status";
import { cn } from "@/lib/utils";

/**
 * Pastille de statut de donnée — les cinq statuts de `lib/data/status.ts`.
 * Chaque statut a son icône ET son libellé écrit : il ne repose jamais sur la
 * seule couleur (CLAUDE.md §4).
 */
const STYLE: Record<DataStatus, { icon: typeof CircleCheck; className: string }> = {
  VERIFIED: { icon: CircleCheck, className: "chip--verified" },
  ESTIMATED: { icon: Sigma, className: "chip--modelled" },
  SIMULATED: { icon: FlaskConical, className: "chip--volt" },
  STALE: { icon: Clock, className: "chip--modelled" },
  UNAVAILABLE: { icon: CircleDashed, className: "" },
};

export function DataStatusChip({
  status,
  className,
  detail,
}: {
  status: DataStatus;
  className?: string;
  /** Précision courte ajoutée au libellé (date, source). */
  detail?: string | null;
}) {
  const { t } = useTranslation();
  const { icon: Icon, className: tone } = STYLE[status];
  return (
    <span className={cn("chip", tone, className)}>
      <Icon aria-hidden className="size-3.5" strokeWidth={2.5} />
      {t(`fin.status.${status}`)}
      {detail ? <span className="font-medium opacity-80">· {detail}</span> : null}
    </span>
  );
}
