import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/onboarding")({ component: Onboarding });

const STEPS = [
  {
    id: "values",
    multi: true,
    ethiMessage: "Salut, moi c'est Ethi 🌱 Je vais t'aider à créer ton jardin aujourd'hui. Dis-moi d'abord : qu'est-ce qui compte vraiment pour toi ?",
    question: "Choisis tes causes — tu peux en prendre plusieurs.",
    options: [
      { id: "climat", label: "Climat", icon: "☀️", desc: "Transition énergétique" },
      { id: "biodiversite", label: "Biodiversité", icon: "🌿", desc: "Forêts, océans, espèces" },
      { id: "humain", label: "Droits humains", icon: "🤝", desc: "Travail digne, égalité" },
      { id: "egalite", label: "Égalité F/H", icon: "⚖️", desc: "Parité, équité salariale" },
      { id: "tech", label: "Tech éthique", icon: "🧠", desc: "IA responsable" },
      { id: "circulaire", label: "Économie circulaire", icon: "♻️", desc: "Zéro déchet" },
    ],
  },
  {
    id: "exclusions",
    multi: true,
    ethiMessage: "Parfait 💚 Et à l'inverse, qu'est-ce que tu refuses absolument de financer ?",
    question: "Ces secteurs seront totalement exclus.",
    options: [
      { id: "fossiles", label: "Énergies fossiles", icon: "🛢️" },
      { id: "armes", label: "Armement", icon: "🔫" },
      { id: "tabac", label: "Tabac", icon: "🚬" },
      { id: "jeux", label: "Jeux d'argent", icon: "🎰" },
      { id: "animaux", label: "Tests animaux", icon: "🐇" },
      { id: "fast-fashion", label: "Fast fashion", icon: "👗" },
    ],
  },
  {
    id: "objective",
    multi: false,
    ethiMessage: "Bien noté. Maintenant : tu veux faire pousser ton jardin pour quoi ?",
    question: "Ton objectif principal",
    options: [
      { id: "retraite", label: "Préparer ma retraite", icon: "🏖️", desc: "20+ ans" },
      { id: "maison", label: "Acheter une maison", icon: "🏠", desc: "5-10 ans" },
      { id: "court", label: "Un projet bientôt", icon: "🎯", desc: "1-3 ans" },
      { id: "epargne", label: "Juste épargner", icon: "💰", desc: "Sans échéance" },
    ],
  },
  {
    id: "amount",
    multi: false,
    ethiMessage: "Combien veux-tu planter pour commencer ? On peut commencer petit.",
    question: "Ton premier dépôt",
    options: [
      { id: "10", label: "10 €", icon: "🌱", desc: "Je teste tranquille" },
      { id: "50", label: "50 €", icon: "🌿", desc: "Un engagement sérieux" },
      { id: "100", label: "100 €", icon: "🌳", desc: "Un vrai démarrage" },
      { id: "500", label: "500 €", icon: "🍃", desc: "Un jardin ambitieux" },
    ],
  },
];

type Phase = "intro" | "steps" | "planting";

function Onboarding() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("intro");
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});

  const completeStep = (selected: string[]) => {
    const step = STEPS[stepIndex];
    setAnswers((a) => ({ ...a, [step.id]: selected }));
    if (stepIndex < STEPS.length - 1) setStepIndex((i) => i + 1);
    else setPhase("planting");
  };

  return (
    <div className="min-h-screen bg-ink text-paper">
      <AnimatePresence mode="wait">
        {phase === "intro" && <Intro key="intro" onStart={() => setPhase("steps")} />}
        {phase === "steps" && (
          <Step
            key={`s-${stepIndex}`}
            step={STEPS[stepIndex]}
            stepIndex={stepIndex}
            totalSteps={STEPS.length}
            onComplete={completeStep}
            onBack={() => stepIndex > 0 ? setStepIndex(stepIndex - 1) : setPhase("intro")}
          />
        )}
        {phase === "planting" && <PlantingScene key="planting" onEnter={() => navigate({ to: "/dashboard" })} answers={answers} />}
      </AnimatePresence>
    </div>
  );
}

function Intro({ onStart }: { onStart: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen flex flex-col items-center justify-center px-8 py-12">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 1.2, ease: [0.34, 1.56, 0.64, 1] }} className="relative mb-12">
        <motion.div animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.8, 0.5] }} transition={{ duration: 3, repeat: Infinity }} className="absolute inset-0 -m-8 rounded-full bg-moss-3/20 blur-2xl" />
        <svg viewBox="0 0 80 80" className="w-24 h-24 relative">
          <path d="M 40 22 C 30 22, 24 34, 28 50 C 32 62, 48 62, 52 50 C 56 34, 50 22, 40 22 Z" fill="var(--moss-3)" />
          <path d="M 40 22 Q 40 12, 46 10" stroke="var(--moss-3)" strokeWidth="2" fill="none" strokeLinecap="round" />
          <ellipse cx="47" cy="8" rx="3" ry="2" fill="var(--moss-3)" transform="rotate(30 47 8)" />
        </svg>
      </motion.div>

      <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="text-[11px] uppercase tracking-[0.2em] text-moss-3 font-semibold">
        Ethi, ton conseiller jardin
      </motion.p>
      <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }} className="font-value text-5xl text-paper text-center mt-4 leading-tight">
        Plantons<br />ta première graine.
      </motion.h1>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }} className="text-sm text-paper/60 text-center mt-6 max-w-xs leading-relaxed">
        4 questions, 2 minutes. Je vais cultiver avec toi un portefeuille aligné sur tes valeurs.
      </motion.p>
      <motion.button initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.8 }} onClick={onStart} className="mt-12 px-8 py-4 rounded-full bg-paper text-ink font-semibold text-sm hover:bg-moss-5 hover:text-moss-1 transition-colors flex items-center gap-2">
        Commencer
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M13 5l7 7-7 7" /></svg>
      </motion.button>
    </motion.div>
  );
}

function Step({
  step, stepIndex, totalSteps, onComplete, onBack,
}: {
  step: typeof STEPS[number];
  stepIndex: number;
  totalSteps: number;
  onComplete: (ids: string[]) => void;
  onBack: () => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) => {
    if (step.multi) setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
    else setSelected([id]);
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.35 }} className="min-h-screen flex flex-col">
      <div className="flex items-center justify-between px-6 pt-6 gap-4">
        <button onClick={onBack} className="w-9 h-9 rounded-full flex items-center justify-center text-paper/50 hover:text-paper transition-colors" aria-label="Retour">
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 6l-6 6 6 6" /></svg>
        </button>
        <div className="flex gap-1.5 flex-1 max-w-[180px] mx-auto">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i < stepIndex ? "bg-moss-3" : i === stepIndex ? "bg-paper" : "bg-paper/15"}`} />
          ))}
        </div>
        <span className="text-[11px] text-paper/40 font-semibold min-w-[28px] text-right">{stepIndex + 1}/{totalSteps}</span>
      </div>

      <div className="px-6 pt-10 max-w-lg mx-auto w-full">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="flex gap-3 items-start">
          <div className="w-9 h-9 rounded-full bg-moss-2 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-paper" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a8 8 0 0 1-11.5 7.2L4 21l1.8-5.5A8 8 0 1 1 21 12Z" />
            </svg>
          </div>
          <div className="flex-1 bg-paper/10 text-paper text-[13px] rounded-2xl rounded-bl-sm px-4 py-3 leading-relaxed">{step.ethiMessage}</div>
        </motion.div>

        <motion.h2 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="font-value text-2xl text-paper pt-8">
          {step.question}
        </motion.h2>

        <div className="pt-5 pb-32 space-y-2.5">
          {step.options.map((option, i) => {
            const isSel = selected.includes(option.id);
            return (
              <motion.button
                key={option.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.04 }}
                onClick={() => toggle(option.id)}
                className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all ${
                  isSel ? "bg-moss-2/20 border-moss-3" : "bg-paper/5 border-paper/10 hover:bg-paper/10"
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-paper/10 flex items-center justify-center text-lg flex-shrink-0">{option.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-paper">{option.label}</p>
                  {"desc" in option && option.desc && <p className="text-[11px] text-paper/50 mt-0.5">{option.desc}</p>}
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isSel ? "bg-moss-2 border-moss-2" : "border-paper/20"}`}>
                  {isSel && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-ink via-ink to-transparent">
        <div className="max-w-lg mx-auto">
          <button
            disabled={selected.length === 0}
            onClick={() => onComplete(selected)}
            className="w-full py-4 rounded-full bg-paper text-ink font-semibold text-sm hover:bg-moss-5 hover:text-moss-1 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Continuer
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function PlantingScene({ onEnter, answers }: { onEnter: () => void; answers: Record<string, string[]> }) {
  const [phase, setPhase] = useState<"loading" | "reveal" | "done">("loading");
  const allocations = [
    { ticker: "IWRD", percentage: 40 },
    { ticker: "CLEAN", percentage: 25 },
    { ticker: "GRNB", percentage: 20 },
    { ticker: "WTEF", percentage: 15 },
  ];

  useState(() => {
    setTimeout(() => setPhase("reveal"), 1400);
    setTimeout(() => setPhase("done"), 4000);
    return 0;
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-paper text-ink">
      <AnimatePresence mode="wait">
        {phase === "loading" && (
          <motion.div key="l" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} className="w-16 h-16 mb-6">
              <svg viewBox="0 0 40 40" className="w-full h-full">
                <circle cx="20" cy="20" r="16" fill="none" stroke="var(--moss-5)" strokeWidth="3" />
                <path d="M 20 4 A 16 16 0 0 1 36 20" fill="none" stroke="var(--moss-1)" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </motion.div>
            <p className="font-value text-2xl">Ethi compose ton jardin…</p>
            <p className="text-xs text-ink-3 mt-2">{Object.keys(answers).length} préférences prises en compte</p>
          </motion.div>
        )}

        {phase === "reveal" && (
          <motion.div key="r" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-md">
            <p className="font-value text-3xl text-center mb-8">Ton jardin prend vie…</p>
            <svg viewBox="0 0 340 200" className="w-full">
              <rect x="0" y="160" width="340" height="40" fill="var(--paper-inset)" rx="8" />
              {allocations.map((alloc, i) => {
                const cx = (i + 0.5) * (340 / 4);
                const headSize = 32 + alloc.percentage * 0.4;
                const stemHeight = 20 + i * 8;
                return (
                  <motion.g
                    key={alloc.ticker}
                    initial={{ scaleY: 0, opacity: 0 }}
                    animate={{ scaleY: 1, opacity: 1 }}
                    transition={{ delay: i * 0.35, duration: 0.9, ease: [0.34, 1.56, 0.64, 1] }}
                    style={{ transformOrigin: `${cx}px 160px` }}
                  >
                    <line x1={cx} y1="160" x2={cx} y2={160 - stemHeight} stroke="var(--moss-2)" strokeWidth="3" strokeLinecap="round" />
                    <ellipse cx={cx} cy={160 - stemHeight - headSize / 2} rx={headSize / 2} ry={(headSize / 2) * 1.1} fill={i % 2 === 0 ? "var(--moss-1)" : "var(--moss-2)"} />
                    <text x={cx} y={160 - stemHeight - headSize / 2 + 3} textAnchor="middle" fill="var(--paper)" fontSize="9" fontWeight="700">
                      {alloc.ticker}
                    </text>
                  </motion.g>
                );
              })}
            </svg>
          </motion.div>
        )}

        {phase === "done" && (
          <motion.div key="d" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 14 }} className="w-20 h-20 mx-auto mb-6 rounded-full bg-moss-1 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-10 h-10 text-paper" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
            </motion.div>
            <h2 className="font-value text-4xl">Ton jardin est planté.</h2>
            <p className="text-sm text-ink-3 mt-4 leading-relaxed max-w-sm mx-auto">
              {allocations.length} graines cultivées, alignées sur tes valeurs. Ethi continuera à veiller sur elles.
            </p>
            <button onClick={onEnter} className="btn-plant mt-10">
              Entrer dans mon jardin
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M13 5l7 7-7 7" /></svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
