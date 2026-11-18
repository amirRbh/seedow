import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { Course } from "@/content/courses";
import { Button } from "@/components/ui/button";
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
      <DialogContent className="accent-volt max-w-[560px] gap-0 overflow-hidden rounded-[28px] border-0 bg-paper p-0">
        {course && (
          <div className="p-7 md:p-8">
            <p className="flex flex-wrap items-center gap-2">
              <span className="chip chip--accent">{t("landing.course_preview.label")}</span>
              <span className="mono-meta">
                N° {String(course.number).padStart(2, "0")} · {course.readingMinutes} min
              </span>
            </p>

            <h2 className="mt-4 text-[clamp(24px,3.2vw,32px)]">{course.title}</h2>

            {excerpt && (
              <p className="mt-4 text-body leading-[1.6] text-ink-2">{excerpt}</p>
            )}

            {takeaways.length > 0 && (
              <div className="tile-accent mt-6 p-5">
                <p className="stamp">{t("landing.course_preview.takeaways")}</p>
                <ul className="mt-3 flex flex-col gap-2.5">
                  {takeaways.map((item) => (
                    <li key={item} className="flex gap-2.5 text-body-sm leading-[1.5] text-ink">
                      <span
                        aria-hidden
                        className="mt-[7px] inline-block h-[6px] w-[6px] flex-shrink-0 rounded-full bg-volt"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button asChild>
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
                >
                  {t("landing.course_preview.cta_simulate")}
                </Link>
              </Button>
              <Button asChild variant="ghost">
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
                >
                  {t("landing.course_preview.cta_read")} <span aria-hidden>→</span>
                </Link>
              </Button>
            </div>

            <p className="mt-4 text-caption text-ink-3">{t("landing.course_preview.note")}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
