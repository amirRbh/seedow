import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export type JourneyStepKey = "values" | "portfolio" | "tracking";

const STEPS: { key: JourneyStepKey; label: string; to: string; n: string }[] = [
  { key: "values", label: "Tes valeurs", to: "/profil", n: "01" },
  { key: "portfolio", label: "Ton portefeuille", to: "/portfolio", n: "02" },
  { key: "tracking", label: "Ton suivi", to: "/dashboard", n: "03" },
];

interface Props {
  /** Étape actuelle — surlignée. */
  active: JourneyStepKey;
  /** Variante compacte (sans bordures pour l'onboarding). */
  compact?: boolean;
}

/**
 * Bandeau « parcours » — repère persistant : valeurs → portefeuille → suivi.
 * Affiché en haut du dashboard, onboarding et profil pour ancrer la vision globale.
 */
export function JourneySteps({ active, compact = false }: Props) {
  return (
    <nav
      aria-label="Parcours d'investissement"
      className={cn(
        "flex items-stretch gap-2",
        !compact && "px-5 pb-2",
      )}
    >
      {STEPS.map((step, i) => {
        const isActive = step.key === active;
        const idx = STEPS.findIndex((s) => s.key === active);
        const isDone = i < idx;
        return (
          <Link
            key={step.key}
            to={step.to}
            aria-current={isActive ? "step" : undefined}
            className={cn(
              "group flex-1 min-w-0 flex items-center gap-2 py-2 border-t-2 transition-colors duration-200",
              isActive
                ? "border-gold text-ink"
                : isDone
                  ? "border-moss-2 text-ink-2 hover:text-ink"
                  : "border-paper-3 text-ink-3 hover:text-ink-2",
            )}
          >
            <span className="font-value text-[10px] tabular-nums tracking-widest text-ink-3 shrink-0">
              {step.n}
            </span>
            <span
              className={cn(
                "text-[10px] uppercase tracking-[0.18em] truncate",
                isActive ? "font-semibold" : "font-medium",
              )}
            >
              {step.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
