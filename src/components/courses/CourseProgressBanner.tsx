import { Link } from "@tanstack/react-router";

interface Props {
  completedCount: number;
  total: number;
  resumeSlug?: string;
  resumeTitle?: string;
}

/**
 * Rappel de progression en tête de l'index des cours — rend l'avancement
 * visible et propose un point de reprise. N'apparaît qu'une fois au moins un
 * cours terminé (voir cours.index).
 */
export function CourseProgressBanner({ completedCount, total, resumeSlug, resumeTitle }: Props) {
  const pct = total > 0 ? Math.round((completedCount / total) * 100) : 0;
  const allDone = completedCount >= total;

  return (
    <div className="mb-10 bg-paper-2/60 border border-ink/8 p-5 md:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
        <p className="text-tag font-semibold uppercase tracking-[0.2em] text-ink-3">
          Ta progression
        </p>
        <p className="text-body-sm text-ink-2 tabular-nums">
          <span className="text-ink font-semibold">{completedCount}</span> / {total} cours terminés
        </p>
      </div>

      <div
        className="h-1.5 w-full bg-ink/10 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={completedCount}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label="Cours terminés"
      >
        <div
          className="h-full bg-mint rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      {allDone ? (
        <p className="mt-3 text-body-sm text-mint font-medium">
          Bravo — tu as terminé tous les cours. 🌱
        </p>
      ) : (
        resumeSlug && (
          <Link
            to="/cours/$slug"
            params={{ slug: resumeSlug }}
            className="mt-3 inline-flex items-center gap-1.5 text-body-sm font-semibold text-ink hover:text-gold transition-colors"
          >
            Reprendre : {resumeTitle}
            <span aria-hidden="true">→</span>
          </Link>
        )
      )}
    </div>
  );
}
