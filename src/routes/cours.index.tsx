import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { COURSES } from "@/content/courses";
import { CourseCard } from "@/components/courses/CourseCard";
import { LanguageToggle } from "@/components/LanguageToggle";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/cours/")({
  head: () => ({
    meta: [
      { title: "Cours — Finance & Finance ESG pour débutants | Seedow" },
      {
        name: "description",
        content:
          "Apprends la finance et l'investissement ESG sans jargon. 3 cours gratuits, 9 cours accessibles avec un compte gratuit. Quiz inclus.",
      },
      { property: "og:title", content: "Cours — Seedow" },
      {
        property: "og:description",
        content:
          "12 cours pour comprendre la finance et l'ESG sans jargon. 3 gratuits, le reste avec un compte gratuit sans engagement.",
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

  const filtered = useMemo(() => {
    if (filter === "all") return COURSES;
    return COURSES.filter((c) => c.track === filter);
  }, [filter]);

  const freeCount = COURSES.filter((c) => c.isFree).length;

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
                to="/dashboard"
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
            dire « investir responsable ». {freeCount} cours sont gratuits, le reste est accessible
            avec un compte sans engagement.
          </p>
        </section>

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
            <CourseCard key={course.slug} course={course} isAuthed={isAuthed} />
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
