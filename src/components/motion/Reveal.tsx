import type { CSSProperties, ElementType, ReactNode } from "react";
import { useInView } from "@/hooks/useInView";
import { cn } from "@/lib/utils";

/**
 * Apparition au défilement — DA V4.
 *
 * `Reveal` fait monter un bloc ; `RevealGroup` fait monter ses ENFANTS en
 * cascade courte (70 ms d'écart, plafonnée à huit rangs : au-delà, la cascade
 * devient une attente). Tout est en CSS (`.reveal`, `.reveal-group`) : le hook
 * ne fait que poser une classe, donc aucun rendu par image.
 *
 * `prefers-reduced-motion` affiche tout, tout de suite (styles.css).
 */
export function Reveal({
  as: Tag = "div",
  delay = 0,
  className,
  children,
  ...rest
}: {
  as?: ElementType;
  /** Retard en millisecondes — pour décaler deux colonnes voisines. */
  delay?: number;
  className?: string;
  children: ReactNode;
  id?: string;
  style?: CSSProperties;
}) {
  const { ref, inView } = useInView<HTMLElement>();
  return (
    <Tag
      ref={ref}
      className={cn("reveal", inView && "in-view", className)}
      {...rest}
      style={delay ? { ...rest.style, transitionDelay: `${delay}ms` } : rest.style}
    >
      {children}
    </Tag>
  );
}

export function RevealGroup({
  as: Tag = "div",
  className,
  children,
  ...rest
}: {
  as?: ElementType;
  className?: string;
  children: ReactNode;
  id?: string;
  role?: string;
  "aria-label"?: string;
}) {
  const { ref, inView } = useInView<HTMLElement>();
  return (
    <Tag ref={ref} className={cn("reveal-group", inView && "in-view", className)} {...rest}>
      {children}
    </Tag>
  );
}
