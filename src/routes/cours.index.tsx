import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { PageHero, PublicPage } from "@/components/layout/PublicPage";
import { Aurora } from "@/components/motion/Aurora";
import { Reveal } from "@/components/motion/Reveal";
import { Button } from "@/components/ui/button";
import { EASE_SIGNATURE } from "@/lib/motion";
import { useAuth } from "@/hooks/useAuth";
import { COURSES } from "@/content/courses";
import { CourseCard } from "@/components/courses/CourseCard";
import { CourseProgressBanner } from "@/components/courses/CourseProgressBanner";
import { CourseCertificate } from "@/components/courses/CourseCertificate";
import { useCourseProgress } from "@/hooks/useCourseProgress";
import { LearnTabs } from "@/components/courses/LearnTabs";
import { getReadingState } from "@/lib/courses/reading";
import { computeCourseStatuses } from "@/lib/courses/status";
import { cn } from "@/lib/utils";
import { siteUrl, socialMeta } from "@/lib/seo/socialMeta";

export const Route = createFileRoute("/cours/")({
  head: () => ({
    meta: socialMeta({
      title: "Cours — Finance & Finance ESG pour débutants | Seedow",
      description:
        "Apprends la finance et l'investissement ESG sans jargon. 12 cours en accès libre — quiz et certificat avec un compte gratuit.",
      cardTitle: "Cours — Seedow",
      cardDescription:
        "12 cours pour comprendre la finance et l'ESG sans jargon, en accès libre. Quiz et certificat avec un compte gratuit, sans engagement.",
      path: "/cours",
    }),
    links: [{ rel: "canonical", href: siteUrl("/cours") }],
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

  const filters: { id: Filter; label: string; count: number }[] = [
    { id: "all", label: "Tous", count: COURSES.length },
    { id: "finance", label: "Finance", count: financeCourses.length },
    { id: "esg", label: "Finance ESG", count: esgCourses.length },
  ];

  return (
    <PublicPage accent="volt">
      <PageHero
        eyebrow="Apprendre"
        title="Apprendre la finance et l'ESG,"
        accentTitle="sans jargon."
        subtitle="Douze cours courts pour comprendre comment fonctionne ton argent et ce que veut vraiment dire « investir responsable ». Tous en accès libre — le quiz et le certificat de progression demandent un compte gratuit, sans engagement."
      >
        <LearnTabs active="courses" />
      </PageHero>

      <div className="mx-auto max-w-[1160px] px-5 pb-8 sm:px-7">
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

        {/* Filtre par piste : la pastille active glisse d'une piste à l'autre. */}
        <div
          role="group"
          aria-label="Filtrer les cours par piste"
          className="scrollbar-hide mb-8 inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-full bg-paper-inset p-1"
        >
          {filters.map((f) => {
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "relative shrink-0 rounded-full px-5 py-2.5 text-label font-bold whitespace-nowrap outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-mint",
                  active ? "text-ink" : "text-ink-3 hover:text-ink",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="course-filter"
                    aria-hidden
                    className="absolute inset-0 rounded-full bg-paper shadow-card"
                    transition={{ duration: 0.32, ease: EASE_SIGNATURE }}
                  />
                )}
                <span className="relative">
                  {f.label} <span className="tabular-nums text-ink-3">· {f.count}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3">
          <AnimatePresence mode="popLayout" initial={false}>
            {filtered.map((course) => (
              <motion.div
                key={course.slug}
                layout
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94 }}
                transition={{ duration: 0.32, ease: EASE_SIGNATURE }}
              >
                <CourseCard
                  course={course}
                  isAuthed={isAuthed}
                  completed={progress.isCompleted(course.slug)}
                  score={progress.scoreOf(course.slug)}
                  status={statusBySlug.get(course.slug)?.status}
                  isStartHere={statusBySlug.get(course.slug)?.isStartHere}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {!isAuthed && (
          <Reveal>
            <section className="ink-section relative mt-20 overflow-hidden px-7 py-14 md:mt-28 md:px-14 md:py-20">
              <Aurora />
              <div className="relative z-10">
                <span className="chip">Compte gratuit</span>
                <h2 className="display-lg mt-5 max-w-[16ch]">
                  Accède aux 12 cours, sans engagement.
                </h2>
                <p className="mt-5 max-w-[52ch] text-body-lg leading-relaxed text-ink-2">
                  Pas de carte bancaire, pas de newsletter forcée, suppression du compte en un clic
                  depuis tes réglages.
                </p>
                <Button asChild size="lg" variant="on-dark" className="mt-8">
                  <Link to="/auth" search={{ redirect: "/cours", mode: "signup" }}>
                    Créer mon compte
                    <ArrowRight aria-hidden />
                  </Link>
                </Button>
              </div>
            </section>
          </Reveal>
        )}
      </div>
    </PublicPage>
  );
}
