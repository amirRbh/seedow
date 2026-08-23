import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { COURSES } from "@/content/courses";
import { CourseCard } from "@/components/courses/CourseCard";
import { CourseProgressBanner } from "@/components/courses/CourseProgressBanner";
import { CourseCertificate } from "@/components/courses/CourseCertificate";
import { useCourseProgress } from "@/hooks/useCourseProgress";
import { LanguageToggle } from "@/components/LanguageToggle";
import { LearnTabs } from "@/components/courses/LearnTabs";
import { getReadingState } from "@/lib/courses/reading";
import { computeCourseStatuses } from "@/lib/courses/status";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/cours/")({
  head: () => ({
    meta: [
      { title: "Cours — Finance & Finance ESG pour débutants | Seedow" },
      {
        name: "description",
        content:
          "Apprends la finance et l'investissement ESG sans jargon. 12 cours en accès libre — quiz et certificat avec un compte gratuit.",
      },
      { property: "og:title", content: "Cours — Seedow" },
      {
        property: "og:description",
        content:
          "12 cours pour comprendre la finance et l'ESG sans jargon, en accès libre. Quiz et certificat avec un compte gratuit, sans engagement.",
      },
      { property: "og:url", content: "https://seedow.life/cours" },
    ],
    links: [{ rel: "canonical", href: "https://seedow.life/cours" }],
  }),
  component: CoursesIndex,
});

type Filter = "all" | "finance" | "esg";

function CoursesIndex() {
  const { user } = useAuth();
  const isAuthed = !!user;
  const [filter, setFilter] = useState<Filter>("all");

  const allSlugs = useMemo(() => COURSES.map((c) => c.slug), []);
  const progress = useCourseProgress(allSlugs);

  const filtered = useMemo(() => {
    if (filter === "all") return COURSES;
    return COURSES.filter((c) => c.track === filter);
  }, [filter]);

  // Lecture locale (sans compte) : lue après montage pour rester SSR-safe.
  const [reading, setReading] = useState<{ opened: string[]; lastOpened: string | null }>({
    opened: [],
    lastOpened: null,
  });
  useEffect(() => {
    const state = getReadingState();
    setReading({ opened: state.opened, lastOpened: state.lastOpened });
  }, []);

  // Statuts par cours dans l'ordre pédagogique : terminé / commencé / à commencer,
  // + le premier non terminé marqué « Commence ici ».
  const statusBySlug = useMemo(() => {
    const completed = allSlugs.filter((slug) => progress.isCompleted(slug));
    const entries = computeCourseStatuses(allSlugs, completed, reading.opened);
    return new Map(entries.map((e) => [e.slug, e]));
  }, [allSlugs, progress, reading.opened]);

  // Point de reprise : le dernier cours ouvert s'il n'est pas terminé,
  // sinon le premier cours non terminé de l'ordre pédagogique.
  const lastOpenedCourse =
    reading.lastOpened && !progress.isCompleted(reading.lastOpened)
      ? COURSES.find((c) => c.slug === reading.lastOpened)
      : undefined;
  const resumeCourse = lastOpenedCourse ?? COURSES.find((c) => !progress.isCompleted(c.slug));
  const hasActivity = progress.completedCount > 0 || reading.opened.length > 0;

  // Certificat de progression (comptes uniquement) — chiffres réels par piste.
  const financeCourses = COURSES.filter((c) => c.track === "finance");
  const esgCourses = COURSES.filter((c) => c.track === "esg");
  const certificateTracks = [
    {
      label: "Finance",
      done: financeCourses.filter((c) => progress.isCompleted(c.slug)).length,
      total: financeCourses.length,
    },
    {
      label: "Finance ESG",
      done: esgCourses.filter((c) => progress.isCompleted(c.slug)).length,
      total: esgCourses.length,
    },
  ];
  const meta = user?.user_metadata as { display_name?: string; full_name?: string } | undefined;
  const learnerName =
    meta?.display_name?.trim() ||
    meta?.full_name?.trim() ||
    user?.email?.split("@")[0] ||
    "Apprenant·e Seedow";

  return (
    <div className="bg-paper text-ink min-h-screen paper-grain">
      <header className="border-b border-ink/8">
        <nav className="max-w-7xl mx-auto flex justify-between items-center px-6 md:px-12 py-5">
          <div className="flex items-center gap-6">
            <Link to="/" className="font-display font-bold text-xl tracking-tight uppercase">
              seedow<span className="text-gold gold-pulse">.</span>
            </Link>
            <LanguageToggle />
          </div>
          <div className="flex items-center gap-5 md:gap-8 text-tag font-semibold uppercase tracking-[0.22em]">
            <Link
              to="/methodologie"
              className="hidden sm:inline-block hover:text-gold transition-colors"
            >
              Méthodologie
            </Link>
            {isAuthed ? (
              <Link
                to="/le-fil"
                className="bg-ink text-paper px-5 py-3 hover:bg-ink-2 transition-colors"
              >
                Mon espace
              </Link>
            ) : (
              <>
                <Link
                  to="/auth"
                  search={{ redirect: "/cours", mode: "login" }}
                  className="hover:text-gold transition-colors"
                >
                  Connexion
                </Link>
                <Link
                  to="/auth"
                  search={{ redirect: "/cours", mode: "signup" }}
                  className="bg-ink text-paper px-5 py-3 hover:bg-ink-2 transition-colors"
                >
                  Compte gratuit
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-6 md:px-12 py-16 md:py-24">
        <div className="mb-8">
          <LearnTabs active="courses" />
        </div>
        <section className="max-w-3xl mb-16 md:mb-20">
          <p className="eyebrow mb-5">N° 00 — Apprendre</p>
          <h1 className="font-display text-4xl md:text-6xl leading-[1.02] text-ink mb-6">
            Apprendre la finance et l'ESG,
            <br />
            <span className="text-gold italic">sans jargon.</span>
          </h1>
          <div className="gold-rule mb-7" />
          <p className="text-lg md:text-xl text-ink-2 leading-relaxed">
            Douze cours courts pour comprendre comment fonctionne ton argent et ce que veut vraiment
            dire « investir responsable ». Tous en accès libre — le quiz et le certificat de
            progression demandent un compte gratuit, sans engagement.
          </p>
        </section>

        {progress.ready && hasActivity && (
          <CourseProgressBanner
            completedCount={progress.completedCount}
            total={COURSES.length}
            resumeSlug={resumeCourse?.slug}
            resumeTitle={resumeCourse?.title}
          />
        )}

        {isAuthed && progress.ready && progress.completedCount > 0 && (
          <section className="mb-14">
            <CourseCertificate
              name={learnerName}
              completed={progress.completedCount}
              total={COURSES.length}
              tracks={certificateTracks}
            />
          </section>
        )}

        <div className="flex flex-wrap items-center gap-3 mb-10">
          <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>
            Tous · {COURSES.length}
          </FilterButton>
          <FilterButton active={filter === "finance"} onClick={() => setFilter("finance")}>
            Finance · {COURSES.filter((c) => c.track === "finance").length}
          </FilterButton>
          <FilterButton active={filter === "esg"} onClick={() => setFilter("esg")}>
            Finance ESG · {COURSES.filter((c) => c.track === "esg").length}
          </FilterButton>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          {filtered.map((course) => (
            <CourseCard
              key={course.slug}
              course={course}
              isAuthed={isAuthed}
              completed={progress.isCompleted(course.slug)}
              score={progress.scoreOf(course.slug)}
              status={statusBySlug.get(course.slug)?.status}
              isStartHere={statusBySlug.get(course.slug)?.isStartHere}
            />
          ))}
        </div>

        {!isAuthed && (
          <section className="mt-20 md:mt-28 bg-ink text-paper p-10 md:p-14 ink-grain">
            <p className="eyebrow text-gold mb-4">Compte gratuit</p>
            <h2 className="font-display text-2xl md:text-4xl leading-tight mb-4 max-w-2xl">
              Accède aux 12 cours, sans engagement.
            </h2>
            <p className="text-paper/80 mb-7 max-w-xl text-sm md:text-base leading-relaxed">
              Pas de carte bancaire, pas de newsletter forcée, suppression du compte en un clic
              depuis tes réglages.
            </p>
            <Link
              to="/auth"
              search={{ redirect: "/cours", mode: "signup" }}
              className="inline-block bg-gold text-ink px-7 py-3.5 text-xs font-semibold uppercase tracking-[0.22em] hover:bg-gold/90 transition-colors"
            >
              Créer mon compte →
            </Link>
          </section>
        )}
      </main>

      <footer className="border-t border-ink/10 py-10">
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex flex-col md:flex-row justify-between gap-4 text-xs text-ink-3">
          <p>© Seedow — Édition éducative</p>
          <div className="flex gap-6">
            <Link to="/" className="hover:text-ink transition-colors">
              Accueil
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

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-4 py-2 text-tag font-semibold uppercase tracking-[0.2em] border transition-colors",
        active
          ? "border-ink bg-ink text-paper"
          : "border-ink/20 text-ink-2 hover:border-ink hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
