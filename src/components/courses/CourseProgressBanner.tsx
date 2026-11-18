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
    <div className="hero-card mb-10 p-6 md:p-7">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <p className="stamp">Ta progression</p>
        <p className="text-body text-ink-2 tabular-nums">
          <span className="font-value text-body-xl text-ink">{completedCount}</span> / {total} cours
          terminés
        </p>
      </div>

      <div
        className="h-2.5 w-full overflow-hidden rounded-full bg-paper-inset"
        role="progressbar"
        aria-valuenow={completedCount}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label="Cours terminés"
      >
        <div
          className="h-full rounded-full bg-mint transition-[width] duration-700 ease-brand motion-reduce:transition-none"
          style={{ width: `${pct}%` }}
        />
      </div>

      {allDone ? (
        <p className="mt-4 text-body font-semibold text-mint-ink">
          Bravo — tu as terminé tous les cours. 🌱
        </p>
      ) : (
        resumeSlug && (
          <Link
            to="/cours/$slug"
            params={{ slug: resumeSlug }}
            className="link-u mt-4 inline-flex items-center gap-1.5 text-body font-bold text-mint-ink"
          >
            Reprendre : {resumeTitle}
            <span aria-hidden="true">→</span>
          </Link>
        )
      )}
    </div>
  );
}
