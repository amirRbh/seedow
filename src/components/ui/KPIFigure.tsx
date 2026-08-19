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
  sm: "text-[26px] md:text-[30px]",
  md: "text-[38px] md:text-[44px]",
  lg: "text-[52px] md:text-[64px]",
  xl: "text-[64px] md:text-[84px]",
};

/**
 * KPIFigure — le chiffre et sa preuve, dans le même bloc.
 *
 * DA V2 « Preuve » : le libellé est un tampon (mono capitales), la valeur est
 * en chasse fixe tabulaire, et la provenance est un élément de premier plan —
 * pas une légende grise dans un coin (CLAUDE.md §1.2).
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
          className={cn("mt-2.5", align === "center" && "inline-block text-left")}
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
