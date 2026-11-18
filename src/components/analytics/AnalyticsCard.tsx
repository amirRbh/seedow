import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Carte de section analytique : un titre, une phrase, un contenu, une méthode repliable. */
export function AnalyticsCard({
  title,
  description,
  method,
  methodLabel,
  aside,
  className,
  children,
}: {
  title: string;
  description?: ReactNode;
  /** Méthode de calcul, repliée par défaut — accessible sans encombrer. */
  method?: ReactNode;
  methodLabel?: string;
  aside?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("paper-card p-5 sm:p-7", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[clamp(18px,2vw,21px)]">{title}</h3>
          {description && (
            <p className="mt-1.5 max-w-[62ch] text-body-sm leading-relaxed text-ink-2">
              {description}
            </p>
          )}
        </div>
        {aside}
      </div>
      <div className="mt-5">{children}</div>
      {method && (
        <details className="group mt-5 border-t border-paper-3 pt-4">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-label font-bold text-ink-2 outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-mint [&::-webkit-details-marker]:hidden">
            <span aria-hidden className="transition-transform duration-200 group-open:rotate-90">
              ›
            </span>
            {methodLabel}
          </summary>
          <div className="mt-3 max-w-[70ch] text-label leading-relaxed text-ink-2">{method}</div>
        </details>
      )}
    </section>
  );
}
