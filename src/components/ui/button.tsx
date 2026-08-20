import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Boutons — DA V3 (docs/DA-V3.md §Boutons).
 *
 * Pill 999, hauteur 48px (38px en `sm`) : la convention du marché premium,
 * et la cible tactile minimale. Aucune ombre, aucun `transform` au survol —
 * l'état se joue sur l'opacité et le fond.
 *
 * ATTENTION : la couleur de texte passe par une CLASSE (`btn-ink`,
 * `btn-on-deep`, `btn-mint`…), jamais par `text-ink` / `text-deep`.
 * tailwind-merge range les couleurs de thème qu'il ne connaît pas dans le même
 * groupe que les tailles, donc `text-body-lg` (apporté par la taille) les
 * efface silencieusement — le CTA se retrouvait sans texte visible.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-sans font-semibold transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper-2 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        /** Action principale — encre pleine. */
        default: "bg-ink btn-on-ink hover:opacity-85",
        destructive: "bg-alert btn-on-ink hover:opacity-85",
        /** Contour discret sur fond clair. */
        outline: "bg-transparent btn-ink ring-1 ring-inset ring-paper-3 hover:ring-ink",
        /** Tertiaire — aplat doux, sans contour. */
        secondary: "bg-paper-2 btn-ink hover:bg-paper-inset",
        ghost: "btn-ink-2 hover:bg-paper-2",
        link: "btn-mint underline underline-offset-4 hover:no-underline",
        /** Accent de marque — teal. */
        accent: "bg-mint btn-on-ink hover:opacity-85",
        /** Sur bande sombre : blanc plein, texte encre. `--on-deep` et `--deep`
         *  sont FIXES — `bg-paper`/`text-ink` s'inverseraient en thème sombre. */
        "on-dark": "bg-on-deep btn-on-deep hover:opacity-85",
        /** Sur bande sombre : contour clair. */
        "outline-ink":
          "bg-transparent btn-ink ring-1 ring-inset ring-paper-3 hover:ring-ink hover:bg-paper-2",
      },
      size: {
        default: "h-12 px-6 text-body-lg",
        sm: "h-[38px] px-[18px] text-body",
        lg: "h-14 px-8 text-body-xl",
        icon: "h-12 w-12",
        /** Alias historique du CTA plein format. */
        pill: "h-12 px-7 text-body-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
