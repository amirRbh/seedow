import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // DA V2 : registre formulaire administratif — coins vifs, filet bas
          // encre au focus plutôt qu'un ring bleu de SaaS.
          "flex h-11 w-full rounded-[--radius] border border-input bg-paper px-3.5 py-2 text-body-lg text-ink transition-colors file:border-0 file:bg-transparent file:text-body-sm file:font-medium file:text-foreground placeholder:text-ink-3 focus-visible:outline-none focus-visible:border-ink focus-visible:shadow-[inset_0_-2px_0_0_var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-50",
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
