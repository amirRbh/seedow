import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { getCourse, getNextCourse } from "@/content/courses";
import { CourseArticle } from "@/components/courses/CourseArticle";
import { CourseQuiz } from "@/components/courses/CourseQuiz";
import { CoursePaywall } from "@/components/courses/CoursePaywall";
import { LanguageToggle } from "@/components/LanguageToggle";

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
    const url = `https://seedow.life/cours/${params.slug}`;
    return {
      meta: [
        { title: `${course.title} — Cours Seedow` },
        { name: "description", content: course.description },
        { property: "og:title", content: course.title },
        { property: "og:description", content: course.description },
        { property: "og:url", content: url },
        { property: "og:type", content: "article" },
      ],
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
  const isAuthed = course.isFree || !!user;
  const accessible = course.isFree || isAuthed;
  const next = getNextCourse(course.slug);

  const truncated = !course.isFree && !isAuthed;
  const visibleSections = truncated ? course.sections.slice(0, 3) : course.sections;

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
          <div className="flex items-center gap-5 md:gap-8 text-[10px] font-semibold uppercase tracking-[0.22em]">
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
        <CourseArticle course={course} sections={visibleSections} truncated={truncated} />

        {truncated ? (
          <CoursePaywall redirectTo={`/cours/${course.slug}`} />
        ) : accessible ? (
          <CourseQuiz slug={course.slug} quiz={course.quiz} />
        ) : null}

        {accessible && next && (
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
            <Link to="/cours" className="hover:text-ink transition-colors">Tous les cours</Link>
            <Link to="/methodologie" className="hover:text-ink transition-colors">Méthodologie</Link>
            <a href="mailto:hello@seedow.life" className="hover:text-ink transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
