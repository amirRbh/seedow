import { cn } from "@/lib/utils";

/**
 * Aurore — le fond d'ambiance des scènes (hero, appels à l'action).
 * Trois taches floues qui dérivent ; couleurs lues sur les tokens (styles.css
 * `.aurora`). Purement décoratif. Le parent doit être `relative` et son contenu
 * placé au-dessus (`relative z-10`).
 */
export function Aurora({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("aurora", className)}>
      <i />
      <i />
      <i />
    </div>
  );
}
