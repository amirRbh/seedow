import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

/**
 * La marque — « seedow » et sa graine.
 *
 * Une seule définition pour tout le produit : la landing, les pages publiques,
 * l'app et les écrans d'auth en dessinaient chacun une version différente
 * (capitales, bas de casse, point rond, point typographique…). Le point final
 * est la graine : il saute au survol.
 */
export function Wordmark({
  to = "/",
  size = "md",
  className,
  label,
}: {
  to?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Libellé accessible quand la marque sert de lien d'accueil. */
  label?: string;
}) {
  const sizes = { sm: "text-[19px]", md: "text-[23px]", lg: "text-[30px]" } as const;
  return (
    <Link
      to={to}
      aria-label={label}
      className={cn(
        "wordmark group inline-flex items-baseline font-display font-extrabold leading-none tracking-[-0.04em] text-ink",
        "rounded-md outline-none focus-visible:ring-2 focus-visible:ring-mint focus-visible:ring-offset-4 focus-visible:ring-offset-transparent",
        sizes[size],
        className,
      )}
    >
      seedow
      <span aria-hidden className="wordmark-seed" />
    </Link>
  );
}

/** Le signe seul — une graine dans un carré d'encre. Pour le dock de l'app. */
export function SeedMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-flex h-10 w-10 items-center justify-center rounded-[14px] bg-ink",
        className,
      )}
    >
      <span className="font-display text-[21px] font-extrabold leading-none tracking-[-0.04em] text-paper">
        s
      </span>
      <span className="absolute right-[7px] bottom-[9px] h-[5px] w-[5px] rounded-full bg-mint" />
    </span>
  );
}
