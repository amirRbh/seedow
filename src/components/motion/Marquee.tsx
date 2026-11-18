import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Bandeau défilant — DA V4.
 *
 * La piste est rendue deux fois : la seconde copie est `aria-hidden`, elle ne
 * sert qu'à boucler sans couture. Le défilement s'arrête au survol et au focus
 * (styles.css) ; en mouvement réduit le bandeau devient une liste que l'on fait
 * défiler soi-même.
 */
export function Marquee({
  children,
  className,
  duration = 38,
  label,
}: {
  children: ReactNode;
  className?: string;
  /** Durée d'un tour complet, en secondes. */
  duration?: number;
  label?: string;
}) {
  return (
    <div
      className={cn("marquee", className)}
      style={{ "--marquee-duration": `${duration}s` } as React.CSSProperties}
      role={label ? "group" : undefined}
      aria-label={label}
    >
      <div className="marquee-track">
        <div className="flex shrink-0 items-center">{children}</div>
        <div className="flex shrink-0 items-center" aria-hidden>
          {children}
        </div>
      </div>
    </div>
  );
}
