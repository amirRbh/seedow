import { useEffect } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { trackAppEvent } from "@/lib/analytics/appEvents";
import { getCourse, getNextCourse } from "@/content/courses";
import { CourseArticle } from "@/components/courses/CourseArticle";
import { CourseQuiz } from "@/components/courses/CourseQuiz";
import { CourseQuizGate } from "@/components/courses/CourseQuizGate";
import { markCourseOpened } from "@/lib/courses/reading";
import { LanguageToggle } from "@/components/LanguageToggle";
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
    <div className="bg-paper text-ink min-h-screen paper-grain">
      {/* Header simple */}
      <header className="border-b border-ink/8 sticky top-0 z-30 bg-paper/95 backdrop-blur-xl">
        <nav className="max-w-7xl mx-auto flex justify-between items-center px-6 md:px-12 py-4">
          <div className="flex items-center gap-6">
            <Link to="/" className="font-display font-bold text-xl tracking-tight uppercase">
              seedow<span className="text-gold gold-pulse">.</span>
            </Link>
            <LanguageToggle />
          </div>
          <div className="flex items-center gap-5 md:gap-8 text-tag font-semibold uppercase tracking-[0.22em]">
            <Link to="/cours" className="hover:text-gold transition-colors">
              ← Tous les cours
            </Link>
            {!isAuthed && (
              <Link
                to="/auth"
                search={{ redirect: `/cours/${course.slug}`, mode: "signup" }}
                className="hidden sm:inline-block bg-ink text-paper px-5 py-3 hover:bg-ink-2 transition-colors"
              >
                Compte gratuit
              </Link>
            )}
          </div>
        </nav>
      </header>

      <main className="px-6 md:px-12 py-12 md:py-20">
        <CourseArticle course={course} sections={course.sections} truncated={false} />

        {isAuthed ? (
          <CourseQuiz slug={course.slug} quiz={course.quiz} />
        ) : (
          <CourseQuizGate slug={course.slug} />
        )}

        {next && (
          <section className="max-w-2xl mx-auto mt-20 pt-10 border-t border-ink/10">
            <p className="eyebrow mb-4">Cours suivant</p>
            <Link
              to="/cours/$slug"
              params={{ slug: next.slug }}
              className="group block bg-paper-2/60 hover:bg-paper-2 transition-colors p-6 border border-ink/8 hover:border-gold/60"
            >
              <p className="font-display text-xs tracking-[0.25em] text-gold tabular-nums mb-2">
                N° {String(next.number).padStart(2, "0")}
              </p>
              <h3 className="font-display text-xl text-ink group-hover:text-gold transition-colors leading-tight">
                {next.title}
              </h3>
              <p className="text-sm text-ink-3 mt-2">{next.readingMinutes} min · Continuer →</p>
            </Link>
          </section>
        )}
      </main>

      <footer className="border-t border-ink/10 py-10 mt-20">
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex flex-col md:flex-row justify-between gap-4 text-xs text-ink-3">
          <p>© Seedow — Édition éducative</p>
          <div className="flex gap-6">
            <Link to="/cours" className="hover:text-ink transition-colors">
              Tous les cours
            </Link>
            <Link to="/methodologie" className="hover:text-ink transition-colors">
              Méthodologie
            </Link>
            <Link to="/mentions-legales" className="hover:text-ink transition-colors">
              Mentions légales
            </Link>
            <Link to="/confidentialite" className="hover:text-ink transition-colors">
              Confidentialité
            </Link>
            <Link to="/cgu" className="hover:text-ink transition-colors">
              CGU
            </Link>
            <a href="mailto:hello@seedow.life" className="hover:text-ink transition-colors">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
