import { cn } from "@/lib/utils";

interface Props {
  value: string | number;
  unit?: string;
  label: string;
  hint?: string;
  size?: "sm" | "md" | "lg" | "xl";
  align?: "left" | "center";
  accent?: boolean;
  className?: string;
}

const SIZES: Record<NonNullable<Props["size"]>, string> = {
  sm: "text-3xl",
  md: "text-5xl",
  lg: "text-6xl md:text-7xl",
  xl: "text-7xl md:text-8xl",
};

/**
 * KPIFigure — chiffre éditorial signature.
 * Space Grotesk tabulaire + libellé uppercase tracking large + filet or optionnel.
 */
export function KPIFigure({
  value,
  unit,
  label,
  hint,
  size = "md",
  align = "left",
  accent = false,
  className,
}: Props) {
  return (
    <div className={cn(align === "center" && "text-center", className)}>
      <p
        className={cn(
          "text-[10px] font-semibold uppercase tracking-[0.22em] mb-3",
          accent ? "text-gold" : "text-ink-3",
        )}
      >
        {label}
      </p>
      <div
        className={cn(
          "kpi-figure flex items-baseline gap-2",
          align === "center" && "justify-center",
          SIZES[size],
        )}
      >
        <span>{value}</span>
        {unit && (
          <span className="text-base font-medium tracking-normal text-ink-3 font-sans">
            {unit}
          </span>
        )}
      </div>
      {hint && <p className="mt-3 text-xs text-ink-3 leading-relaxed">{hint}</p>}
    </div>
  );
}
