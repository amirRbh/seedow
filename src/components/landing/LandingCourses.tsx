import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { COURSES } from "@/content/courses";
import { getReadingState } from "@/lib/courses/reading";
import { CoursePreviewDialog } from "@/components/landing/CoursePreviewDialog";
import type { Course } from "@/content/courses";
import { trackAppEvent } from "@/lib/analytics/appEvents";

/**
 * Section « Apprends d'abord » de la landing : les cours en accès libre comme
 * porte d'entrée sans compte. Pour un visiteur qui revient, un rappel « reprends
 * où tu t'es arrêté » (état de lecture en localStorage) — le vrai levier de
 * rétention. Scope `.apple-landing` pour rester cohérent avec la page.
 */
export function LandingCourses() {
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
    <section style={{ background: "var(--apple-surface)" }} className="px-6 py-24 md:py-32">
      <div className="max-w-[980px] mx-auto">
        <div className="text-center mb-14">
          <p className="apple-eyebrow" style={{ color: "var(--ice)" }}>
            {t("landing.learn.eyebrow")}
          </p>
          <h2 className="apple-title mx-auto max-w-[720px] mt-3">{t("landing.learn.title")}</h2>
          <p className="apple-subtitle mx-auto max-w-[560px] mt-5">{t("landing.learn.subtitle")}</p>
        </div>

        {resume ? (
          <div
            className="mx-auto max-w-[620px] apple-card p-6 md:p-8 flex flex-col sm:flex-row sm:items-center gap-4"
            style={{ background: "var(--apple-bg)", border: "1px solid #d2d2d7" }}
          >
            <div className="flex-1">
              <p className="text-caption font-mono uppercase tracking-[0.16em] text-[color:var(--apple-text-2)]">
                {t("landing.learn.resume_prefix")}
              </p>
              <p className="apple-eyebrow mt-1" style={{ color: "var(--apple-text)" }}>
                {resume.title}
              </p>
            </div>
            <Link
              to="/cours/$slug"
              params={{ slug: resume.slug }}
              className="apple-btn-primary flex-shrink-0"
            >
              {t("landing.learn.resume_cta")}
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-3 gap-4">
            {starters.map((c) => (
              <button
                key={c.slug}
                type="button"
                onClick={() => {
                  setPreviewed(c);
                  void trackAppEvent("course_preview_opened", { slug: c.slug });
                }}
                className="apple-card p-6 flex flex-col gap-3 text-left hover:opacity-95 transition-opacity"
                style={{ background: "var(--apple-bg)", border: "1px solid #d2d2d7" }}
              >
                <span className="text-caption font-mono tabular-nums text-[color:var(--apple-text-2)]">
                  N° {String(c.number).padStart(2, "0")} · {c.readingMinutes} min
                </span>
                <span className="apple-eyebrow" style={{ color: "var(--apple-text)" }}>
                  {c.title}
                </span>
                <span className="text-body-sm text-[color:var(--apple-text-2)] line-clamp-2">
                  {c.description}
                </span>
                <span className="apple-link text-body-sm mt-1">
                  {t("landing.learn.preview_cta")} <span aria-hidden>›</span>
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="text-center mt-10">
          <Link to="/cours" className="apple-link">
            {t("landing.learn.see_all", { count: COURSES.length })} <span aria-hidden>›</span>
          </Link>
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
