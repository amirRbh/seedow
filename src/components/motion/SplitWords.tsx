import { cn } from "@/lib/utils";

/**
 * Titre qui monte mot par mot — DA V4.
 *
 * Animation CSS pure (`.word-rise`), donc jouée dès la première peinture, avant
 * même l'hydratation : le titre du hero est le plus gros élément de la page et
 * ne doit pas attendre le JavaScript pour apparaître.
 *
 * Accessibilité : le texte complet est rendu une fois, masqué visuellement ;
 * les mots découpés sont `aria-hidden` — un lecteur d'écran lirait sinon une
 * suite de fragments.
 */
export function SplitWords({
  text,
  className,
  wordClassName,
  startIndex = 0,
}: {
  text: string;
  className?: string;
  wordClassName?: string;
  /** Rang du premier mot — pour enchaîner deux lignes sans repartir de zéro. */
  startIndex?: number;
}) {
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      {words.map((word, i) => (
        <span key={`${word}-${i}`} aria-hidden className="word-mask">
          <span
            className={cn("word-rise", wordClassName)}
            style={{ "--i": startIndex + i } as React.CSSProperties}
          >
            {word}
          </span>
          {i < words.length - 1 ? " " : null}
        </span>
      ))}
    </span>
  );
}

/** Nombre de mots d'un texte — pour chaîner `startIndex` entre deux lignes. */
export function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}
