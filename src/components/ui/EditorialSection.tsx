import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  eyebrow?: string;
  title?: string;
  kicker?: string;
  number?: string;
  children: ReactNode;
  divider?: boolean;
  className?: string;
}

/**
 * EditorialSection — pattern de section unifié.
 * Eyebrow uppercase or + titre Space Grotesk + filet or fin.
 */
export function EditorialSection({
  eyebrow,
  title,
  kicker,
  number,
  children,
  divider = true,
  className,
}: Props) {
  return (
    <section className={cn("py-12 md:py-16", className)}>
      {(eyebrow || title || kicker) && (
        <header className="mb-8 md:mb-10">
          {number && (
            <p className="font-display text-xs tracking-[0.25em] text-ink-3 tabular-nums mb-4">
              {number.padStart(2, "0")}
            </p>
          )}
          {eyebrow && <p className="eyebrow mb-4">{eyebrow}</p>}
          {title && <h2 className="display-lg text-ink max-w-3xl">{title}</h2>}
          {kicker && (
            <p className="mt-4 text-base md:text-lg text-ink-2 max-w-2xl leading-relaxed">
              {kicker}
            </p>
          )}
          {divider && <div className="gold-rule mt-8" />}
        </header>
      )}
      {children}
    </section>
  );
}
