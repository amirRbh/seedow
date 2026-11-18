import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { RelatedCourse } from "@/components/courses/RelatedCourse";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Wordmark } from "@/components/brand/Wordmark";
import { Aurora } from "@/components/motion/Aurora";
import { Button } from "@/components/ui/button";
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
  const destination = user ? "/le-fil" : "/discover";

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
    <div className="accent-volt relative flex min-h-screen flex-col overflow-hidden text-ink">
      <Aurora />
      <header className="relative z-10 px-3 pt-3">
        <nav className="glass mx-auto flex h-[60px] max-w-3xl items-center justify-between rounded-full pr-2 pl-5">
          <Wordmark />
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <Button type="button" variant="ghost" size="sm" onClick={finish}>
              Passer
            </Button>
          </div>
        </nav>
      </header>

      <div className="relative z-10 flex flex-1 items-center">
        <div className="mx-auto w-full max-w-2xl px-6 py-12 md:py-20">
          {/* Progression — chaque étape est une barre qui se remplit. */}
          <div className="mb-10 flex items-center gap-2" aria-hidden="true">
            {STEPS.map((_, i) => (
              <span key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper-inset">
                <span
                  className="block h-full rounded-full bg-section-accent transition-[width] duration-700 ease-brand motion-reduce:transition-none"
                  style={{ width: i <= step ? "100%" : "0%" }}
                />
              </span>
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
              <span className="chip chip--accent mb-5">
                {current.eyebrow} · {step + 1}/{STEPS.length}
              </span>
              <h1 className="display-lg mb-6">{current.title}</h1>
              <p className="text-body-xl leading-relaxed text-ink-2">{current.body}</p>

              {current.courseSlug && (
                <div className="mt-7 max-w-md">
                  <RelatedCourse slug={current.courseSlug} reason={current.courseReason} />
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Contrôles */}
          <div className="mt-12 flex items-center justify-between gap-4">
            <Button
              type="button"
              variant="ghost"
              onClick={goPrev}
              disabled={step === 0}
              className="disabled:pointer-events-none disabled:opacity-0"
            >
              ← Retour
            </Button>

            {isLast ? (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Button asChild variant="ghost">
                  <Link to="/cours" onClick={markIntroDone}>
                    Voir les cours
                  </Link>
                </Button>
                <Button type="button" size="lg" onClick={finish}>
                  {user ? "Aller au tableau de bord" : "Explorer les fonds"}{" "}
                  <span aria-hidden>→</span>
                </Button>
              </div>
            ) : (
              <Button type="button" size="lg" onClick={goNext}>
                Continuer <span aria-hidden>→</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
