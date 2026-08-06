import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { Course } from "@/content/courses";
import { trackAppEvent } from "@/lib/analytics/appEvents";

/**
 * Aperçu d'un cours sans compte : le contenu clé (analogie + points à retenir)
 * est montré directement dans la modale, puis l'action principale renvoie vers
 * l'aperçu du simulateur (mode invité, sans compte).
 */
export function CoursePreviewDialog({
  course,
  onOpenChange,
}: {
  course: Course | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const open = !!course;

  const excerpt = course?.eli5?.trim() || course?.intro?.trim() || "";
  const takeaways = course?.keyTakeaways?.slice(0, 3) ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="apple-landing max-w-[560px] p-0 gap-0 overflow-hidden"
        style={{ background: "var(--apple-bg)", borderRadius: 18, border: "1px solid #d2d2d7" }}
      >
        {course && (
          <div className="p-7 md:p-8">
            <p className="text-caption font-mono uppercase tracking-[0.16em] text-[color:var(--apple-text-2)]">
              {t("landing.course_preview.label")} · N° {String(course.number).padStart(2, "0")} ·{" "}
              {course.readingMinutes} min
            </p>

            <h2
              className="apple-title mt-3"
              style={{ fontSize: "clamp(24px, 3.2vw, 32px)", letterSpacing: "-0.03em" }}
            >
              {course.title}
            </h2>

            {excerpt && (
              <p className="mt-4 text-body leading-[1.55] text-[color:var(--apple-text-2)]">
                {excerpt}
              </p>
            )}

            {takeaways.length > 0 && (
              <div
                className="mt-6 p-5"
                style={{
                  background: "var(--apple-surface)",
                  border: "1px solid #d2d2d7",
                  borderRadius: 14,
                }}
              >
                <p className="text-caption font-mono uppercase tracking-[0.16em] text-[color:var(--apple-text-2)]">
                  {t("landing.course_preview.takeaways")}
                </p>
                <ul className="mt-3 flex flex-col gap-2">
                  {takeaways.map((item) => (
                    <li
                      key={item}
                      className="flex gap-2.5 text-body-sm leading-[1.5] text-[color:var(--apple-text)]"
                    >
                      <span
                        aria-hidden
                        className="mt-[7px] inline-block w-[6px] h-[6px] rounded-full flex-shrink-0"
                        style={{ background: "var(--mint)" }}
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-7 flex flex-col sm:flex-row sm:items-center gap-3">
              <Link
                to="/onboarding"
                search={{ guest: true }}
                onClick={() => {
                  void trackAppEvent("landing_cta_clicked", {
                    placement: "course_preview",
                    destination: "preview",
                    course: course.slug,
                  });
                }}
                className="apple-btn-primary text-center"
              >
                {t("landing.course_preview.cta_simulate")}
              </Link>
              <Link
                to="/cours/$slug"
                params={{ slug: course.slug }}
                onClick={() => {
                  void trackAppEvent("landing_cta_clicked", {
                    placement: "course_preview",
                    destination: "course",
                    course: course.slug,
                  });
                }}
                className="apple-link text-body"
              >
                {t("landing.course_preview.cta_read")} <span aria-hidden>›</span>
              </Link>
            </div>

            <p className="mt-4 text-caption text-[color:var(--apple-text-2)]">
              {t("landing.course_preview.note")}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
