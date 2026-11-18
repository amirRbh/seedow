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
    { key: "tracking", label: t("journey_steps.tracking"), to: "/le-fil", n: "03" },
  ];

  return (
    <nav
      aria-label={t("journey_steps.aria")}
      className={cn("flex items-stretch gap-1.5", !compact && "px-5 pb-2")}
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
              "group flex min-w-0 flex-1 items-center gap-2.5 rounded-full px-2 py-2 pr-4 outline-none transition-colors duration-200",
              "focus-visible:ring-2 focus-visible:ring-mint",
              isActive ? "bg-paper shadow-card" : "hover:bg-paper-inset",
            )}
          >
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-value text-caption tabular-nums transition-colors duration-200",
                isActive
                  ? "bg-mint text-paper"
                  : isDone
                    ? "bg-mint-tint text-mint-ink"
                    : "bg-paper-inset text-ink-3",
              )}
            >
              {i + 1}
            </span>
            <span
              className={cn(
                "truncate text-label font-bold",
                isActive ? "text-ink" : isDone ? "text-ink-2" : "text-ink-3",
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
