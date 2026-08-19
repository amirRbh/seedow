import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Boutons — DA V2 « Preuve » (docs/DA-V2-PREUVE.md §4.6).
 * Coins vifs (radius 2px), aucune ombre, aucun `transform` au survol : un
 * bouton s'inverse ou change d'épaisseur de filet, il ne bouge pas et ne
 * grossit pas. Plus jamais de `border-radius: 980px` sur une action — les
 * pills sont réservées aux statuts de donnée (`.stamp-tag`).
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[--radius] font-sans text-body font-medium transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        /** Action principale — aplat encre, s'inverse au survol. */
        default: "border border-ink bg-ink btn-on-ink hover:bg-transparent hover:text-ink",
        destructive: "border border-alert bg-alert btn-on-ink hover:opacity-90",
        outline: "border border-paper-3 bg-transparent text-ink hover:border-ink",
        secondary: "border border-paper-3 bg-paper-2 text-ink hover:border-ink",
        ghost: "text-ink-2 hover:text-ink hover:bg-paper-2",
        /** Lien : toujours souligné, jamais un bleu nu. */
        link: "text-ice-ink underline underline-offset-4 hover:no-underline",
        /** Action vérifiée / de confirmation — bleu de signature. */
        accent: "border border-ice bg-ice btn-on-ink hover:bg-transparent hover:text-ice-ink",
        /** Filet encre, s'inverse en plein au survol. */
        "outline-ink": "border border-ink bg-transparent btn-on-paper hover:bg-ink",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-8 px-3 text-body-sm",
        lg: "h-12 px-6",
        icon: "h-10 w-10",
        /** CTA plein format — hauteur de tap confortable, coins vifs. */
        pill: "h-11 px-6 text-body-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
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
