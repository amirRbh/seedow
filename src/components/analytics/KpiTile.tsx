import type { ReactNode } from "react";
import type { DataStatus } from "@/lib/data/status";
import { DataStatusChip } from "./DataStatusChip";
import { cn } from "@/lib/utils";

/**
 * Une mesure clé : son libellé, sa valeur, son statut de donnée et une ligne
 * qui dit comment elle se calcule. Une mesure sans explication n'est pas
 * affichée seule (cahier des charges : « chaque métrique a sa méthode »).
 */
export function KpiTile({
  label,
  value,
  status,
  hint,
  className,
}: {
  label: string;
  value: ReactNode;
  status?: DataStatus;
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("paper-card flex flex-col gap-2 p-5", className)}>
      <p className="text-label font-semibold text-ink-2">{label}</p>
      <p className="font-display text-[clamp(24px,2.6vw,30px)] font-extrabold leading-none tracking-[-0.03em] text-ink tabular-nums">
        {value}
      </p>
      {hint && <p className="text-caption leading-relaxed text-ink-3">{hint}</p>}
      {status && <DataStatusChip status={status} className="mt-auto w-fit" />}
    </div>
  );
}
