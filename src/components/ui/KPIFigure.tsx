import { cn } from "@/lib/utils";
import { AnimatedFigure } from "./AnimatedFigure";

interface Props {
  value: string | number;
  unit?: string;
  label: string;
  hint?: string;
  size?: "sm" | "md" | "lg" | "xl";
  align?: "left" | "center";
  accent?: boolean;
  /** Si true et `value` est numérique, anime le compteur au mount. */
  animate?: boolean;
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
  animate = false,
  className,
}: Props) {
  const numeric = typeof value === "number" ? value : Number(value);
  const canAnimate = animate && Number.isFinite(numeric) && typeof value !== "string";

  return (
    <div className={cn(align === "center" && "text-center", className)}>
      <p
        className={cn(
          "text-body-sm font-semibold tracking-[-0.01em] mb-3",
          accent ? "text-gold" : "text-ink-2",
        )}
      >
        {label}
      </p>
      <div
        className={cn(
          "kpi-figure flex items-baseline gap-2 transition-[text-shadow] duration-300 hover:[text-shadow:0_0_24px_color-mix(in_oklab,var(--color-gold)_35%,transparent)]",
          align === "center" && "justify-center",
          SIZES[size],
        )}
      >
        {canAnimate ? (
          <AnimatedFigure value={numeric} />
        ) : (
          <span>{value}</span>
        )}
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
