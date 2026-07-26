import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { getCourse } from "@/content/courses";
import { recommendCourseSlugs } from "@/lib/courses/recommend";

/**
 * Carte « Comprends ton portefeuille » : relie la cause choisie à 1–2 cours
 * pertinents, pour fermer la boucle faire → comprendre juste au moment de
 * valeur (dashboard invité et authentifié). La lecture est libre.
 */
export function UnderstandPortfolioCard({ cause }: { cause?: string | null }) {
  const { t } = useTranslation();
  const courses = recommendCourseSlugs(cause)
    .map((slug) => getCourse(slug))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  if (courses.length === 0) return null;

  return (
    <div className="rounded-[14px] bg-paper-2 border border-paper-3 p-5">
      <p className="text-tag uppercase tracking-[0.16em] text-ink-3 font-medium">
        {t("dashboard.understand.eyebrow")}
      </p>
      <p className="text-body-sm text-ink-2 mt-1">{t("dashboard.understand.subtitle")}</p>
      <ul className="mt-4 flex flex-col divide-y divide-paper-3 border-t border-paper-3">
        {courses.map((course) => (
          <li key={course.slug}>
            <Link
              to="/cours/$slug"
              params={{ slug: course.slug }}
              className="group flex items-center gap-3 py-3"
            >
              <span className="flex-1 text-body-sm font-medium text-ink group-hover:text-mint transition-colors">
                {course.title}
              </span>
              <span className="font-mono text-caption text-ink-3 tabular-nums flex-shrink-0">
                {course.readingMinutes} min
              </span>
              <span aria-hidden className="text-ink-3 group-hover:text-mint transition-colors">
                ›
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
