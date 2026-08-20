import { cn } from "@/lib/utils";
import { AnimatedFigure } from "./AnimatedFigure";
import { Provenance, type ProvenanceStatus } from "./Provenance";

interface Props {
  value: string | number;
  unit?: string;
  label: string;
  hint?: string;
  size?: "sm" | "md" | "lg" | "xl";
  align?: "left" | "center";
  accent?: boolean;
  /** Accent sémantique du libellé. `accent` = raccourci mint. */
  tone?: "mint" | "ice" | "volt" | "solar" | "alert";
  /** Si true et `value` est numérique, anime le compteur au mount. */
  animate?: boolean;
  /** Provenance de la donnée — voir docs/DA-V2-PREUVE.md §4.4. */
  source?: string;
  asOf?: string | Date;
  coverage?: number;
  status?: ProvenanceStatus;
  sourceHref?: string;
  className?: string;
}

const SIZES: Record<NonNullable<Props["size"]>, string> = {
  sm: "text-[24px] md:text-[28px]",
  md: "text-[34px] md:text-[40px]",
  lg: "text-[48px] md:text-[58px]",
  xl: "text-[60px] md:text-[76px]",
};

/**
 * KPIFigure — le chiffre et sa preuve, dans le même bloc.
 *
 * DA V3 : libellé 13px semi-gras gris, valeur en Manrope 800 tabulaire à
 * tracking serré, et l'état de preuve en pastille sous le chiffre plutôt
 * qu'en légende grise dans un coin (CLAUDE.md §1.2).
 */
export function KPIFigure({
  value,
  unit,
  label,
  hint,
  size = "md",
  align = "left",
  accent = false,
  tone,
  animate = false,
  source,
  asOf,
  coverage,
  status,
  sourceHref,
  className,
}: Props) {
  // Variantes texte-safe (contraste AA vérifié dans src/lib/a11y), qui se
  // réajustent en thème sombre et sur .ink-section.
  const toneVar = tone ? `var(--${tone}-ink)` : undefined;
  const numeric = typeof value === "number" ? value : Number(value);
  const canAnimate = animate && Number.isFinite(numeric) && typeof value !== "string";
  const hasProvenance = Boolean(source || asOf || coverage != null || status);

  return (
    <div className={cn(align === "center" && "text-center", className)}>
      <p
        className={cn("stamp mb-2.5", !tone && (accent ? "text-mint-ink" : undefined))}
        style={toneVar ? { color: toneVar } : undefined}
      >
        {label}
      </p>
      <div
        className={cn(
          "kpi-figure flex items-baseline gap-1.5",
          align === "center" && "justify-center",
          SIZES[size],
        )}
      >
        {canAnimate ? <AnimatedFigure value={numeric} /> : <span>{value}</span>}
        {unit && (
          <span className="font-sans text-body font-medium tracking-normal text-ink-3">{unit}</span>
        )}
      </div>
      {hasProvenance && (
        <Provenance
          className={cn("mt-3", align === "center" && "items-center")}
          source={source}
          asOf={asOf}
          coverage={coverage}
          status={status}
          href={sourceHref}
        />
      )}
      {hint && <p className="mt-2 text-body-sm text-ink-2 leading-relaxed">{hint}</p>}
    </div>
  );
}
