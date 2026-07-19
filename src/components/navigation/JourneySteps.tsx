import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export type JourneyStepKey = "values" | "portfolio" | "tracking";

interface Props {
  /** Étape actuelle — surlignée. */
  active: JourneyStepKey;
  /** Variante compacte (sans bordures pour l'onboarding). */
  compact?: boolean;
}

export function JourneySteps({ active, compact = false }: Props) {
  const { t } = useTranslation();

  const STEPS: { key: JourneyStepKey; label: string; to: string; n: string }[] = [
    { key: "values", label: t("journey_steps.values"), to: "/profil", n: "01" },
    { key: "portfolio", label: t("journey_steps.portfolio"), to: "/portfolio", n: "02" },
    { key: "tracking", label: t("journey_steps.tracking"), to: "/dashboard", n: "03" },
  ];

  return (
    <nav
      aria-label={t("journey_steps.aria")}
      className={cn("flex items-stretch gap-2", !compact && "px-5 pb-2")}
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
                  ? "border-highlight-2 text-ink-2 hover:text-ink"
                  : "border-paper-3 text-ink-3 hover:text-ink-2",
            )}
          >
            <span className="font-value text-tag tabular-nums tracking-widest text-ink-3 shrink-0">
              {step.n}
            </span>
            <span
              className={cn(
                "text-tag uppercase tracking-[0.18em] truncate",
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
