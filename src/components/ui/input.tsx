import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // DA V3 : 56px de haut (cible tactile), rayon 14, anneau discret au
          // focus plutôt qu'un ring bleu système.
          "flex min-h-14 w-full rounded-[--radius-md] border border-input bg-paper px-4 py-3.5 text-body-lg text-ink transition-[border-color,box-shadow] file:border-0 file:bg-transparent file:text-body-sm file:font-medium file:text-foreground placeholder:text-ink-3 focus-visible:outline-none focus-visible:border-ink focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-ink)_10%,transparent)] disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
