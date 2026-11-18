import { useEffect } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { PublicPage } from "@/components/layout/PublicPage";
import { SiteHeaderSpacer } from "@/components/layout/SiteHeader";
import { Reveal } from "@/components/motion/Reveal";
import { useAuth } from "@/hooks/useAuth";
import { trackAppEvent } from "@/lib/analytics/appEvents";
import { getCourse, getNextCourse } from "@/content/courses";
import { CourseArticle } from "@/components/courses/CourseArticle";
import { CourseQuiz } from "@/components/courses/CourseQuiz";
import { CourseQuizGate } from "@/components/courses/CourseQuizGate";
import { markCourseOpened } from "@/lib/courses/reading";
import { siteUrl, socialMeta } from "@/lib/seo/socialMeta";

export const Route = createFileRoute("/cours/$slug")({
  loader: ({ params }) => {
    const course = getCourse(params.slug);
    if (!course) throw notFound();
    return { course };
  },
  head: ({ params, loaderData }) => {
    const course = loaderData?.course;
    if (!course) {
      return { meta: [{ title: "Cours — Seedow" }] };
    }
    const path = `/cours/${params.slug}`;
    const url = siteUrl(path);
    return {
      meta: socialMeta({
        title: `${course.title} — Cours Seedow`,
        description: course.description,
        cardTitle: course.title,
        path,
        type: "article",
      }),
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: course.title,
            description: course.description,
            author: { "@type": "Organization", name: "Seedow" },
            publisher: { "@type": "Organization", name: "Seedow" },
            url,
          }),
        },
      ],
    };
  },
  component: CoursePage,
});

function CoursePage() {
  const { course } = Route.useLoaderData();
  const { user } = useAuth();
  const isAuthed = !!user;
  const next = getNextCourse(course.slug);

  // Modèle « contenu libre, quiz/certificat gatés » : la lecture est toujours
  // complète pour tout le monde ; seul le quiz de validation demande un compte.
  useEffect(() => {
    void trackAppEvent("course_started", { slug: course.slug });
    // Suivi de lecture anonyme : permet de reprendre là où l'on s'est arrêté.
    markCourseOpened(course.slug);
  }, [course.slug]);

  return (
    <PublicPage accent="volt" progress>
      <SiteHeaderSpacer />
      <div className="px-5 pb-8 md:px-12">
        <div className="mx-auto mb-8 max-w-2xl">
          <Link
            to="/cours"
            className="link-u inline-flex items-center gap-2 text-body-sm font-bold text-ink-2 hover:text-ink"
          >
            <span aria-hidden>←</span> Tous les cours
          </Link>
        </div>

        <CourseArticle course={course} sections={course.sections} truncated={false} />

        {isAuthed ? (
          <CourseQuiz slug={course.slug} quiz={course.quiz} />
        ) : (
          <CourseQuizGate slug={course.slug} />
        )}

        {next && (
          <Reveal as="section" className="mx-auto mt-20 max-w-2xl">
            <p className="stamp mb-3">Cours suivant</p>
            <Link
              to="/cours/$slug"
              params={{ slug: next.slug }}
              className="paper-card spot lift group flex items-center gap-5 p-6 outline-none focus-visible:ring-2 focus-visible:ring-mint"
            >
              <span className="icon-badge h-14 w-14 rounded-[18px] font-value text-body-xl">
                {String(next.number).padStart(2, "0")}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-[20px] font-bold leading-tight tracking-[-0.02em] text-ink">
                  {next.title}
                </span>
                <span className="mt-1 block text-body-sm text-ink-3">
                  {next.readingMinutes} min
                </span>
              </span>
              <span
                aria-hidden
                className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-paper-2 text-ink transition-[background-color,color,transform] duration-300 ease-brand group-hover:translate-x-1 group-hover:bg-ink group-hover:text-paper motion-reduce:transition-none"
              >
                →
              </span>
            </Link>
          </Reveal>
        )}
      </div>
    </PublicPage>
  );
}
