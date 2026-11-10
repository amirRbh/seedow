import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { RevealGroup } from "@/components/motion/Reveal";
import { Button } from "@/components/ui/button";
import { COURSES } from "@/content/courses";
import { getReadingState } from "@/lib/courses/reading";
import { CoursePreviewDialog } from "@/components/landing/CoursePreviewDialog";
import type { Course } from "@/content/courses";
import { trackAppEvent } from "@/lib/analytics/appEvents";

/**
 * Section « Apprends d'abord » de la landing : les cours en accès libre comme
 * porte d'entrée sans compte. Pour un visiteur qui revient, un rappel « reprends
 * où tu t'es arrêté » (état de lecture en localStorage) — le vrai levier de
 * rétention. DA V4 : cartes à reflet, numéro en pastille, cascade à l'apparition.
 */
export function LandingCourses({ embedded = false }: { embedded?: boolean } = {}) {
  const { t } = useTranslation();
  const [resume, setResume] = useState<{ slug: string; title: string } | null>(null);

  // Lecture client-only (localStorage indisponible en SSR).
  useEffect(() => {
    const last = getReadingState().lastOpened;
    if (!last) return;
    const course = COURSES.find((c) => c.slug === last);
    if (course) setResume({ slug: course.slug, title: course.title });
  }, []);

  const starters = COURSES.slice(0, 3);
  const [previewed, setPreviewed] = useState<Course | null>(null);

  return (
    <section
      className={embedded ? "accent-volt" : "accent-volt px-6 py-24 md:py-32"}
    >
      <div className={embedded ? "" : "max-w-[980px] mx-auto"}>
        {!embedded && (
          <div className="text-center mb-14">
            <span className="chip chip--accent">{t("landing.learn.eyebrow")}</span>
            <h2 className="display-lg mx-auto mt-4 max-w-[720px]">{t("landing.learn.title")}</h2>
            <p className="mx-auto mt-5 max-w-[560px] text-body-lg text-ink-2">
              {t("landing.learn.subtitle")}
            </p>
          </div>
        )}

        {resume && (
          <div
            className={`${embedded ? "" : "mx-auto max-w-[620px] "}tile-accent flex flex-col gap-4 p-6 sm:flex-row sm:items-center md:p-8`}
          >
            <div className="flex-1">
              <p className="stamp">{t("landing.learn.resume_prefix")}</p>
              <p className="mt-1 text-body-lg font-semibold text-ink">{resume.title}</p>
            </div>
            <Button asChild className="flex-shrink-0">
              <Link to="/cours/$slug" params={{ slug: resume.slug }}>
                {t("landing.learn.resume_cta")}
                <ArrowRight aria-hidden />
              </Link>
            </Button>
          </div>
        )}

        <RevealGroup className={resume ? "mt-4 grid gap-4 sm:grid-cols-3" : "grid gap-4 sm:grid-cols-3"}>
          {starters.map((c) => (
            <button
              key={c.slug}
              type="button"
              onClick={() => {
                setPreviewed(c);
                void trackAppEvent("course_preview_opened", { slug: c.slug });
              }}
              className="paper-card spot lift group flex flex-col gap-3 p-6 text-left outline-none focus-visible:ring-2 focus-visible:ring-mint sm:p-7"
            >
              <span className="flex items-center justify-between gap-2">
                <span className="icon-badge font-value text-body-lg">
                  {String(c.number).padStart(2, "0")}
                </span>
                <span className="mono-meta">{c.readingMinutes} min</span>
              </span>
              <span className="mt-3 font-display text-[20px] font-bold leading-snug tracking-[-0.02em] text-ink">
                {c.title}
              </span>
              <span className="line-clamp-2 text-body-sm leading-relaxed text-ink-2">
                {c.description}
              </span>
              <span className="mt-auto inline-flex items-center gap-2 pt-4 text-body-sm font-bold text-section-accent-ink">
                {t("landing.learn.preview_cta")}
                <ArrowRight
                  aria-hidden
                  className="size-4 transition-transform duration-300 ease-brand group-hover:translate-x-1.5"
                />
              </span>
            </button>
          ))}
        </RevealGroup>

        <div className={embedded ? "mt-8" : "mt-10 text-center"}>
          <Button asChild variant="outline">
            <Link to="/cours">
              {t("landing.learn.see_all", { count: COURSES.length })}
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>
      </div>

      <CoursePreviewDialog
        course={previewed}
        onOpenChange={(open) => {
          if (!open) setPreviewed(null);
        }}
      />
    </section>
  );
}
