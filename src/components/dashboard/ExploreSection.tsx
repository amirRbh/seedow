import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

/**
 * Bloc "Explorer" — regroupe les modules secondaires du dashboard (audit
 * .lovable/plan.md §11) : repliés par défaut, visuellement allégés, pour ne
 * plus concurrencer l'action du jour et l'impact.
 */
export function ExploreSection({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <section className="px-5 pt-8">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between text-caption uppercase tracking-wider text-ink-3 font-medium py-2 border-t border-paper-3"
      >
        {t("dashboard.explore.title")}
        <svg
          viewBox="0 0 16 16"
          className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>
      {open && <div className="mt-1 space-y-0 opacity-90">{children}</div>}
    </section>
  );
}
