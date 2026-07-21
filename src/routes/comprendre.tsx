import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { RelatedCourse } from "@/components/courses/RelatedCourse";
import { LanguageToggle } from "@/components/LanguageToggle";
import { DURATION, EASE_REVEAL } from "@/lib/motion";
import { isIntroDone, markIntroDone, readIntroStep, saveIntroStep } from "@/lib/intro";

export const Route = createFileRoute("/comprendre")({
  head: () => ({
    meta: [
      { title: "Comprendre Seedow — Premiers pas" },
      {
        name: "description",
        content:
          "Deux minutes pour comprendre l'essentiel : transparence des chiffres, mode simple, risque de greenwashing et cours sans jargon.",
      },
    ],
  }),
  component: ComprendrePage,
});

interface IntroStep {
  eyebrow: string;
  title: string;
  body: string;
  /** Cours à proposer sous le texte. */
  courseSlug?: string;
  courseReason?: string;
}

const STEPS: IntroStep[] = [
  {
    eyebrow: "Premiers pas",
    title: "Ton argent, tes convictions.",
    body: "Seedow t'aide à investir selon ce qui compte pour toi — climat, biodiversité, droits humains — avec des données de marché réelles. On n'a rien à te vendre : notre rôle, c'est de t'expliquer chaque choix, pas de te pousser à en faire un.",
  },
  {
    eyebrow: "Comprendre, pas subir",
    title: "Chaque chiffre est expliqué.",
    body: "Ici, aucun chiffre ne tombe du ciel : tu peux toujours voir d'où il vient. Et si un terme te bloque, le mode Simple traduit le jargon en langage clair. Tu bascules entre Simple et Expert quand tu veux, depuis tes Réglages.",
  },
  {
    eyebrow: "Rester lucide",
    title: "Tous les fonds « verts » ne le sont pas.",
    body: "Certains fonds se disent durables sans vraiment l'être. Seedow te signale ce risque de greenwashing — toujours avec ses raisons en clair, jamais un verdict opaque que tu devrais croire sur parole.",
    courseSlug: "greenwashing-6-signaux",
    courseReason: "Pour aller plus loin",
  },
  {
    eyebrow: "À ton rythme",
    title: "Douze cours courts, sans jargon.",
    body: "Envie de comprendre la finance et l'ESG en profondeur ? Douze cours de quelques minutes, avec un quiz à la fin. À suivre quand tu veux, dans l'ordre que tu veux — ta progression est gardée.",
    courseSlug: "esg-cest-quoi",
    courseReason: "Commence par celui-ci",
  },
];

function ComprendrePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  // Reprise : on repart de l'étape sauvegardée (lecture après montage, SSR-safe).
  // Si l'intro était déjà terminée, on repart de zéro pour une relecture propre.
  useEffect(() => {
    if (isIntroDone()) return;
    const saved = readIntroStep();
    if (saved > 0 && saved < STEPS.length) setStep(saved);
  }, []);

  useEffect(() => {
    saveIntroStep(step);
  }, [step]);

  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];
  const destination = user ? "/dashboard" : "/discover";

  const finish = () => {
    markIntroDone();
    navigate({ to: destination });
  };

  const goNext = () => {
    setDirection(1);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const goPrev = () => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
  };

  return (
    <div className="bg-paper text-ink min-h-screen paper-grain flex flex-col">
      <header className="border-b border-ink/8">
        <nav className="max-w-3xl mx-auto flex justify-between items-center px-6 py-5">
          <div className="flex items-center gap-6">
            <Link to="/" className="font-display font-bold text-xl tracking-tight uppercase">
              seedow<span className="text-gold gold-pulse">.</span>
            </Link>
            <LanguageToggle />
          </div>
          <button
            type="button"
            onClick={finish}
            className="text-tag font-semibold uppercase tracking-[0.22em] text-ink-3 hover:text-ink transition-colors"
          >
            Passer
          </button>
        </nav>
      </header>

      <main className="flex-1 flex items-center">
        <div className="max-w-2xl mx-auto w-full px-6 py-12 md:py-20">
          {/* Progression */}
          <div className="flex items-center gap-2 mb-10" aria-hidden="true">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1 rounded-full transition-all duration-500 ${
                  i === step ? "w-8 bg-gold" : i < step ? "w-4 bg-ink/40" : "w-4 bg-ink/12"
                }`}
              />
            ))}
          </div>

          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              initial={{ opacity: 0, x: direction * 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -24 }}
              transition={{ duration: DURATION.base, ease: EASE_REVEAL }}
            >
              <p className="eyebrow mb-4">
                {current.eyebrow} · {step + 1}/{STEPS.length}
              </p>
              <h1 className="font-display text-3xl md:text-5xl leading-[1.05] text-ink mb-5">
                {current.title}
              </h1>
              <div className="gold-rule mb-6" />
              <p className="text-lg md:text-xl text-ink-2 leading-relaxed">{current.body}</p>

              {current.courseSlug && (
                <div className="mt-7 max-w-md">
                  <RelatedCourse slug={current.courseSlug} reason={current.courseReason} />
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Contrôles */}
          <div className="mt-12 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={goPrev}
              disabled={step === 0}
              className="text-tag font-semibold uppercase tracking-[0.22em] text-ink-3 hover:text-ink transition-colors disabled:opacity-0 disabled:pointer-events-none"
            >
              ← Retour
            </button>

            {isLast ? (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Link
                  to="/cours"
                  onClick={markIntroDone}
                  className="text-center text-xs font-semibold uppercase tracking-[0.22em] text-ink-3 hover:text-gold transition-colors px-3 py-3"
                >
                  Voir les cours
                </Link>
                <button
                  type="button"
                  onClick={finish}
                  className="bg-ink text-paper px-7 py-3.5 text-xs font-semibold uppercase tracking-[0.22em] hover:bg-ink-2 transition-colors"
                >
                  {user ? "Aller au tableau de bord →" : "Explorer les fonds →"}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={goNext}
                className="bg-ink text-paper px-7 py-3.5 text-xs font-semibold uppercase tracking-[0.22em] hover:bg-ink-2 transition-colors"
              >
                Continuer →
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
