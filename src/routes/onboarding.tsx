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
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }} className="w-full max-w-xs mb-14">
        <svg viewBox="0 0 240 60" className="w-full h-14" preserveAspectRatio="none">
          <line x1="0" y1="59" x2="240" y2="59" stroke="var(--paper)" strokeOpacity="0.15" strokeWidth="0.5" />
          <motion.path
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.6, ease: "easeOut", delay: 0.3 }}
            d="M 0 50 L 60 44 L 120 32 L 180 18 L 240 6"
            stroke="var(--paper)"
            strokeWidth="1"
            fill="none"
          />
        </svg>
      </motion.div>

      <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="text-[10px] uppercase tracking-[0.18em] text-paper/50 font-medium">
        Conseiller en allocation
      </motion.p>
      <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="font-value text-4xl text-paper text-center mt-3 leading-tight max-w-md">
        Composons votre portefeuille.
      </motion.h1>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }} className="text-[13px] text-paper/60 text-center mt-5 max-w-sm leading-relaxed">
        Quatre questions, deux minutes. Ethi structure une allocation alignée sur vos convictions et vos exclusions.
      </motion.p>
      <motion.button initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.4 }} onClick={onStart} className="mt-12 px-7 py-3 rounded bg-paper text-ink font-medium text-[13px] tracking-wide hover:bg-paper-2 transition-colors flex items-center gap-2">
        Commencer
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M13 5l7 7-7 7" /></svg>
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
            <div className="w-32 h-px bg-paper-3 relative mb-8 overflow-hidden">
              <motion.div
                animate={{ x: ["-100%", "100%"] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-y-0 w-1/2 bg-ink"
              />
            </div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-ink-3 font-medium">Composition en cours</p>
            <p className="font-value text-2xl text-ink mt-3">Structuration du portefeuille</p>
            <p className="text-[12px] text-ink-3 mt-2">{Object.keys(answers).length} préférences appliquées</p>
          </motion.div>
        )}

        {phase === "reveal" && (
          <motion.div key="r" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-md">
            <p className="text-[10px] uppercase tracking-[0.18em] text-ink-3 font-medium text-center">Allocation cible</p>
            <p className="font-value text-2xl text-ink text-center mt-2 mb-8">Votre portefeuille</p>
            <ul className="divide-y divide-paper-3 border-t border-b border-paper-3">
              {allocations.map((alloc, i) => (
                <motion.li
                  key={alloc.ticker}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.18, duration: 0.4 }}
                  className="py-3"
                >
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="font-value text-[14px] text-ink">{alloc.ticker}</span>
                    <span className="text-[12px] text-ink tabular-nums font-medium">{alloc.percentage}%</span>
                  </div>
                  <div className="h-px bg-paper-3 relative">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${alloc.percentage * 2.5}%` }}
                      transition={{ delay: i * 0.18 + 0.2, duration: 0.7, ease: "easeOut" }}
                      className="absolute inset-y-0 left-0 bg-ink"
                    />
                  </div>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}

        {phase === "done" && (
          <motion.div key="d" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md text-center">
            <p className="text-[10px] uppercase tracking-[0.18em] text-ink-3 font-medium">Confirmation</p>
            <h2 className="font-value text-3xl text-ink mt-3 leading-tight">Portefeuille structuré.</h2>
            <p className="text-[13px] text-ink-2 mt-5 leading-relaxed max-w-sm mx-auto">
              {allocations.length} positions sélectionnées selon vos critères. Le suivi est désormais actif.
            </p>
            <button onClick={onEnter} className="btn-plant mt-10">
              Accéder au tableau de bord
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M13 5l7 7-7 7" /></svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
