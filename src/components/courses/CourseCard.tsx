import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { Course } from "@/content/courses";
import type { CourseScore } from "@/hooks/useCourseProgress";
import type { CourseStatus } from "@/lib/courses/status";
import { cn } from "@/lib/utils";

interface Props {
  course: Course;
  isAuthed: boolean;
  completed?: boolean;
  score?: CourseScore | null;
  status?: CourseStatus;
  isStartHere?: boolean;
}

export function CourseCard({
  course,
  completed = false,
  score,
  status = "not_started",
  isStartHere = false,
}: Props) {
  const { t } = useTranslation();
  const trackLabel = course.track === "esg" ? "Finance ESG" : "Finance";
  const levelLabel = course.level === "debutant" ? "Débutant" : "Intermédiaire";
  const statusLabel =
    status === "completed"
      ? t("courses.status_completed")
      : status === "in_progress"
        ? t("courses.status_in_progress")
        : t("courses.status_not_started");

  return (
    <Link
      to="/cours/$slug"
      params={{ slug: course.slug }}
      className={cn(
        "group relative flex flex-col gap-4 bg-paper p-6 md:p-7 border transition-all hover:border-gold/60 hover:shadow-sm",
        completed ? "border-mint/40" : "border-ink/8",
      )}
    >
      {completed && (
        <span className="absolute top-0 right-0 inline-flex items-center gap-1 bg-mint/15 text-mint text-tag font-semibold uppercase tracking-[0.18em] px-2.5 py-1">
          <CheckIcon />
          {t("courses.status_completed")}
        </span>
      )}
      {!completed && isStartHere && (
        <span className="absolute top-0 right-0 inline-flex items-center gap-1 bg-gold/15 text-gold text-tag font-semibold uppercase tracking-[0.18em] px-2.5 py-1">
          {t("courses.start_here")}
        </span>
      )}
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
        {completed ? (
          <span className="inline-flex items-center gap-1.5 text-tag font-semibold uppercase tracking-[0.18em] text-mint">
            <CheckIcon />
            {score ? `Quiz ${score.score}/${score.total}` : statusLabel}
          </span>
        ) : (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 text-tag font-semibold uppercase tracking-[0.18em]",
              status === "in_progress" ? "text-gold" : "text-mint",
            )}
          >
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                status === "in_progress" ? "bg-gold" : "bg-mint",
              )}
            />
            {statusLabel}
          </span>
        )}
        <span className="text-xs text-ink-3 group-hover:text-gold transition-colors">
          {completed ? "Revoir →" : "Lire →"}
        </span>
      </div>
    </Link>
  );
}

function CheckIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
