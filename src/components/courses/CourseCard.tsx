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
        course.track === "esg" ? "accent-mint" : "accent-volt",
        "paper-card spot lift group relative flex h-full flex-col p-6 outline-none focus-visible:ring-2 focus-visible:ring-mint md:p-7",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Le numéro du cours en pastille : la couleur distingue les deux
            pistes (Finance / Finance ESG), le nom de la piste est écrit dessous. */}
        <span className="icon-badge font-value text-body-lg transition-transform duration-500 ease-brand group-hover:-rotate-6 group-hover:scale-110 motion-reduce:transition-none">
          {String(course.number).padStart(2, "0")}
        </span>
        {completed ? (
          <span className="chip chip--verified">
            <CheckIcon />
            {t("courses.status_completed")}
          </span>
        ) : isStartHere ? (
          <span className="chip chip--accent">{t("courses.start_here")}</span>
        ) : null}
      </div>

      <p className="mt-5 text-caption font-semibold text-ink-3">
        {trackLabel} · {levelLabel} ·{" "}
        <span className="tabular-nums">{course.readingMinutes} min</span>
      </p>

      <h3 className="mt-2 text-[clamp(19px,2vw,22px)] leading-snug">{course.title}</h3>

      <p className="mt-3 line-clamp-3 text-body-sm leading-relaxed text-ink-2">
        {course.description}
      </p>

      <div className="mt-auto flex items-center justify-between pt-6">
        {completed ? (
          <span className="inline-flex items-center gap-1.5 text-label font-bold text-mint-ink">
            <CheckIcon />
            {score ? `Quiz ${score.score}/${score.total}` : statusLabel}
          </span>
        ) : (
          <span
            className={cn(
              "inline-flex items-center gap-2 text-label font-bold",
              status === "in_progress" ? "text-solar-ink" : "text-ink-3",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                status === "in_progress" ? "bg-solar" : "bg-paper-3",
              )}
            />
            {statusLabel}
          </span>
        )}
        <span
          aria-hidden
          className="flex h-10 w-10 items-center justify-center rounded-full bg-paper-2 text-ink transition-[background-color,color,transform] duration-300 ease-brand group-hover:translate-x-1 group-hover:bg-ink group-hover:text-paper motion-reduce:transition-none"
        >
          →
        </span>
        <span className="sr-only">{completed ? "Revoir" : "Lire"}</span>
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
