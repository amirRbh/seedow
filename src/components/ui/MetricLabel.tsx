import { useState } from "react";

interface Props {
  label: string;
  hint?: string;
  className?: string;
}

/**
 * Libellé d'une métrique avec un tooltip explicatif au survol/clic.
 * Pensé pour aider les débutants à comprendre les termes financiers.
 */
export function MetricLabel({ label, hint, className = "" }: Props) {
  const [open, setOpen] = useState(false);

  if (!hint) {
    return <span className={className}>{label}</span>;
  }

  return (
    <span className={`relative inline-flex items-center gap-1 ${className}`}>
      <span>{label}</span>
      <button
        type="button"
        aria-label={`Aide : ${label}`}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(e) => {
          e.preventDefault();
          setOpen((v) => !v);
        }}
        className="w-3.5 h-3.5 rounded-full bg-paper-3 text-ink-2 text-tag font-bold flex items-center justify-center hover:bg-moss-4 hover:text-moss-1 transition-colors leading-none"
      >
        ?
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute z-50 bottom-full left-0 mb-2 w-56 p-2.5 rounded-lg bg-ink text-paper text-caption leading-snug shadow-popover normal-case tracking-normal"
          style={{ letterSpacing: "0" }}
        >
          {hint}
        </span>
      )}
    </span>
  );
}
