import { Link } from "@tanstack/react-router";
import type { Course } from "@/content/courses";
import { cn } from "@/lib/utils";

interface Props {
  course: Course;
  isAuthed: boolean;
}

export function CourseCard({ course, isAuthed }: Props) {
  const accessible = course.isFree || isAuthed;
  const trackLabel = course.track === "esg" ? "Finance ESG" : "Finance";
  const levelLabel = course.level === "debutant" ? "Débutant" : "Intermédiaire";

  return (
    <Link
      to="/cours/$slug"
      params={{ slug: course.slug }}
      className={cn(
        "group relative flex flex-col gap-4 bg-paper p-6 md:p-7 border border-ink/8 transition-all hover:border-gold/60 hover:shadow-sm",
        !accessible && "opacity-95",
      )}
    >
      <div className="flex items-center justify-between text-tag font-semibold uppercase tracking-[0.18em] text-ink-3">
        <span>
          {trackLabel} · {levelLabel}
        </span>
        <span className="tabular-nums">{course.readingMinutes} min</span>
      </div>

      <p className="font-display text-xs tracking-[0.25em] text-gold tabular-nums">
        N° {String(course.number).padStart(2, "0")}
      </p>

      <h3 className="font-display text-lg md:text-xl leading-tight text-ink group-hover:text-gold transition-colors">
        {course.title}
      </h3>

      <p className="text-sm text-ink-2 leading-relaxed line-clamp-3">{course.description}</p>

      <div className="mt-auto pt-4 border-t border-ink/8 flex items-center justify-between">
        {course.isFree ? (
          <span className="inline-flex items-center gap-1.5 text-tag font-semibold uppercase tracking-[0.18em] text-moss">
            <span className="w-1.5 h-1.5 bg-moss rounded-full" />
            Gratuit · Lire maintenant
          </span>
        ) : accessible ? (
          <span className="text-tag font-semibold uppercase tracking-[0.18em] text-ink-3">
            Accessible
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-tag font-semibold uppercase tracking-[0.18em] text-ink-3">
            <LockIcon />
            Compte gratuit requis
          </span>
        )}
        <span className="text-xs text-ink-3 group-hover:text-gold transition-colors">Lire →</span>
      </div>
    </Link>
  );
}

function LockIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="5" y="11" width="14" height="10" rx="1" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}
