import { useTranslation, Trans } from "react-i18next";
import { useLang } from "@/hooks/useLang";
import { formatCurrency } from "@/lib/format";
import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { generatePortfolio } from "@/lib/portfolio/server.functions";
import { callAuthed } from "@/lib/authedServerFn";
import { trackPreference, type PreferenceStep } from "@/lib/preferences/tracking";
import type { CauseTag, ExclusionTag } from "@/lib/portfolio/types";

export const Route = createFileRoute("/onboarding")({
  validateSearch: (s: Record<string, unknown>): { new?: 1 } => ({
    new: s.new === 1 || s.new === "1" ? 1 : undefined,
  }),
  // Pas de guard auth : on laisse l'utilisateur répondre aux questions sans compte.
  // La création de compte arrive juste avant la génération du portefeuille (phase "account").
  component: Onboarding,
});

// ─────────────────────────────────────────────────────────
// Steps definition — IDs map directly to DB enums
// ─────────────────────────────────────────────────────────

const STEPS = [
  {
    id: "values" as const,
    multi: true,
    options: [
      { id: "climat", icon: "☀️" },
      { id: "biodiversite", icon: "🌿" },
      { id: "humain", icon: "🤝" },
      { id: "egalite", icon: "⚖️" },
      { id: "tech", icon: "🧠" },
      { id: "circulaire", icon: "♻️" },
    ],
  },
  {
    id: "exclusions" as const,
    multi: true,
    options: [
      { id: "fossiles", icon: "🛢️" },
      { id: "armes", icon: "🔫" },
      { id: "tabac", icon: "🚬" },
      { id: "jeux", icon: "🎰" },
      { id: "animaux", icon: "🐇" },
      { id: "fast-fashion", icon: "👗" },
    ],
  },
  {
    id: "objective" as const,
    multi: false,
    options: [
      { id: "retraite", icon: "🏖️" },
      { id: "maison", icon: "🏠" },
      { id: "court", icon: "🎯" },
      { id: "epargne", icon: "💰" },
    ],
  },
  {
    id: "amount" as const,
    multi: false,
    options: [
      { id: "10", icon: "🌱" },
      { id: "50", icon: "🌿" },
      { id: "100", icon: "🌳" },
      { id: "500", icon: "🍃" },
    ],
  },
];

type StepId = (typeof STEPS)[number]["id"];
type Phase = "intro" | "steps" | "account" | "naming" | "planting";
type Answers = Partial<Record<StepId, string[]>>;

// Map onboarding objective → (risk_target, horizon_years)
function objectiveToRiskHorizon(obj: string | undefined): { risk: number; horizon: number } {
  switch (obj) {
    case "retraite":
      return { risk: 0.13, horizon: 25 };
    case "maison":
      return { risk: 0.10, horizon: 8 };
    case "court":
      return { risk: 0.06, horizon: 2 };
    case "epargne":
    default:
      return { risk: 0.09, horizon: 10 };
  }
}

function Onboarding() {
  const navigate = useNavigate();
  const router = useRouter();
  const { new: isNew } = Route.useSearch();
  const isAdditive = isNew === 1;
  const [phase, setPhase] = useState<Phase>(isAdditive ? "steps" : "intro");
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [gardenName, setGardenName] = useState("");

  const completeStep = async (selected: string[]) => {
    const step = STEPS[stepIndex];
    setAnswers((a) => ({ ...a, [step.id]: selected }));
    // Tracking : log la complétion de chaque étape (best-effort, ne bloque pas).
    void trackPreference({
      step: "step_completed",
      payload: { onboarding_step: step.id, selected, count: selected.length },
    });
    if (stepIndex < STEPS.length - 1) {
      setStepIndex((i) => i + 1);
    } else {
      // Dernière question terminée
      const { data } = await supabase.auth.getSession();
      if (isAdditive) {
        // Mode "nouveau portefeuille" : utilisateur déjà connecté, on demande le nom puis on génère.
        if (data.session) setPhase("naming");
        else setPhase("account");
      } else {
        if (data.session) setPhase("planting");
        else setPhase("account");
      }
    }
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
            onBack={() => (stepIndex > 0 ? setStepIndex(stepIndex - 1) : isAdditive ? navigate({ to: "/dashboard" }) : setPhase("intro"))}
          />
        )}
        {phase === "naming" && (
          <NameGardenStep
            key="naming"
            initialName={gardenName}
            onConfirm={(name) => { setGardenName(name); setPhase("planting"); }}
            onBack={() => { setStepIndex(STEPS.length - 1); setPhase("steps"); }}
          />
        )}
        {phase === "account" && (
          <AccountStep
            key="account"
            onAuthed={() => setPhase(isAdditive ? "naming" : "planting")}
            onBack={() => { setStepIndex(STEPS.length - 1); setPhase("steps"); }}
          />
        )}
        {phase === "planting" && (
          <PlantingScene
            key="planting"
            onEnter={async () => {
              await router.invalidate();
              navigate({ to: "/dashboard" });
            }}
            answers={answers}
            mode={isAdditive ? "create" : "replace"}
            name={gardenName || undefined}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function NameGardenStep({
  initialName,
  onConfirm,
  onBack,
}: {
  initialName: string;
  onConfirm: (name: string) => void;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState(initialName);
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.35 }}
      className="min-h-screen flex flex-col"
    >
      <div className="flex items-center justify-between px-6 pt-6">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full flex items-center justify-center text-paper/50 hover:text-paper transition-colors"
          aria-label={t("onboarding.step.back")}
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
        <span className="text-[11px] text-paper/40 font-semibold">{t("onboarding.naming.title")}</span>
      </div>
      <div className="px-6 pt-12 pb-12 max-w-md mx-auto w-full flex-1">
        <h2 className="font-value text-3xl text-paper">{t("onboarding.naming.question")}</h2>
        <p className="text-[13px] text-paper/60 mt-2">
          <Trans i18nKey="onboarding.naming.description">
            Donne-lui un nom qui te parle — par exemple <em>Climat</em>, <em>Retraite</em>, <em>Tech responsable</em>…
          </Trans>
        </p>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 40))}
          placeholder={t("onboarding.naming.placeholder")}
          autoFocus
          className="mt-8 w-full px-4 py-4 rounded-2xl border border-paper/15 bg-paper/5 text-paper text-[16px] placeholder-paper/30 focus:border-paper/40 focus:outline-none transition-colors"
        />
        <p className="mt-2 text-[10px] text-paper/40 text-right">{name.length}/40</p>

        <button
          onClick={() => onConfirm(name.trim() || t("onboarding.naming.default_name"))}
          className="mt-8 w-full py-4 rounded-full bg-paper text-ink font-semibold text-sm hover:bg-moss-5 hover:text-moss-1 transition-colors"
        >
          {t("onboarding.naming.validate")}
        </button>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────
// Account creation step — inline, after questions, before generation
// ─────────────────────────────────────────────────────────
function AccountStep({ onAuthed, onBack }: { onAuthed: () => void; onBack: () => void }) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onGoogle = async () => {
    setError(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/onboarding`,
    });
    if (result.error) setError(result.error.message);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/onboarding`,
            data: { display_name: displayName || email.split("@")[0] },
          },
        });
        if (err) throw err;
        if (!data.session) {
          throw new Error(t("onboarding.account.verify_email"));
        }
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
      }
      onAuthed();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("onboarding.account.auth_error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.35 }}
      className="min-h-screen flex flex-col"
    >
      <div className="flex items-center justify-between px-6 pt-6">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full flex items-center justify-center text-paper/50 hover:text-paper transition-colors"
          aria-label={t("onboarding.step.back")}
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
        <span className="text-[11px] text-paper/40 font-semibold">{t("onboarding.account.eyebrow")}</span>
      </div>

      <div className="px-6 pt-10 pb-12 max-w-md mx-auto w-full flex-1">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-3 items-start"
        >
          <div className="w-9 h-9 rounded-full bg-moss-2 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-paper" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a8 8 0 0 1-11.5 7.2L4 21l1.8-5.5A8 8 0 1 1 21 12Z" />
            </svg>
          </div>
          <div className="flex-1 bg-paper/10 text-paper text-[13px] rounded-2xl rounded-bl-sm px-4 py-3 leading-relaxed">
            {t("onboarding.account.ethi_message")}
          </div>
        </motion.div>

        <h2 className="font-value text-2xl text-paper pt-8">
          {mode === "signup" ? t("onboarding.account.title_signup") : t("onboarding.account.title_login")}
        </h2>
        <p className="text-[12px] text-paper/60 mt-1.5">
          {t("onboarding.account.description")}
        </p>

        <button
          onClick={onGoogle}
          className="mt-6 w-full py-2.5 rounded-xl border border-paper/20 hover:border-paper/40 hover:bg-paper/5 transition-colors text-[13px] font-medium text-paper flex items-center justify-center gap-2"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {t("onboarding.account.continue_google")}
        </button>

        <div className="my-4 flex items-center gap-3">
          <div className="flex-1 h-px bg-paper/15" />
          <span className="text-[10px] uppercase tracking-[0.15em] text-paper/40">ou</span>
          <div className="flex-1 h-px bg-paper/15" />
        </div>

        <form onSubmit={onSubmit} className="space-y-2.5">
          {mode === "signup" && (
            <input
              type="text"
              placeholder={t("onboarding.account.firstname_placeholder")}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3.5 py-3 rounded-xl border border-paper/15 bg-paper/5 text-[13px] text-paper placeholder-paper/40 focus:border-paper/40 focus:outline-none transition-colors"
            />
          )}
          <input
            type="email"
            placeholder={t("onboarding.account.email_placeholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full px-3.5 py-3 rounded-xl border border-paper/15 bg-paper/5 text-[13px] text-paper placeholder-paper/40 focus:border-paper/40 focus:outline-none transition-colors"
          />
          <input
            type="password"
            placeholder={t("onboarding.account.password_placeholder")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            className="w-full px-3.5 py-3 rounded-xl border border-paper/15 bg-paper/5 text-[13px] text-paper placeholder-paper/40 focus:border-paper/40 focus:outline-none transition-colors"
          />

          {error && <p className="text-[12px] text-rust">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-full bg-paper text-ink font-semibold text-[13px] hover:bg-moss-5 hover:text-moss-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed mt-2"
          >
            {loading
              ? t("onboarding.account.waiting")
              : mode === "signup"
                ? t("onboarding.account.btn_signup")
                : t("onboarding.account.btn_login")}
          </button>
        </form>

        <p className="mt-5 text-[12px] text-paper/50 text-center">
          {mode === "signup" ? t("onboarding.account.already_account") + " " : t("onboarding.account.no_account") + " "}
          <button
            type="button"
            onClick={() => setMode(mode === "signup" ? "login" : "signup")}
            className="text-paper underline-offset-4 hover:underline font-medium"
          >
            {mode === "signup" ? t("onboarding.account.link_login") : t("onboarding.account.link_signup")}
          </button>
        </p>
      </div>
    </motion.div>
  );
}

function Intro({ onStart }: { onStart: () => void }) {
  const { t } = useTranslation();
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex flex-col items-center justify-center px-8 py-12"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-xs mb-14"
      >
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

      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="text-[10px] uppercase tracking-[0.18em] text-paper/50 font-medium"
      >
        {t("onboarding.intro.eyebrow")}
      </motion.p>
      <motion.h1
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="font-value text-4xl text-paper text-center mt-3 leading-tight max-w-md"
      >
        {t("onboarding.intro.title")}
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1 }}
        className="text-[13px] text-paper/60 text-center mt-5 max-w-sm leading-relaxed"
      >
        {t("onboarding.intro.description")}
      </motion.p>

      {/* Récap du parcours en 3 temps */}
      <motion.ol
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.25 }}
        className="mt-10 grid grid-cols-3 gap-3 max-w-sm w-full"
      >
        {[
          { n: "01", l: t("onboarding.intro.step_01") },
          { n: "02", l: t("onboarding.intro.step_02") },
          { n: "03", l: t("onboarding.intro.step_03") },
        ].map((s, i) => (
          <li
            key={s.n}
            className={`border-t pt-2 ${i === 0 ? "border-paper" : "border-paper/15"}`}
          >
            <p className="font-value text-[10px] tabular-nums tracking-widest text-paper/40">
              {s.n}
            </p>
            <p
              className={`text-[11px] uppercase tracking-[0.16em] mt-1 ${
                i === 0 ? "text-paper font-semibold" : "text-paper/50 font-medium"
              }`}
            >
              {s.l}
            </p>
          </li>
        ))}
      </motion.ol>

      <motion.button
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.4 }}
        onClick={onStart}
        className="mt-12 px-7 py-3 rounded bg-paper text-ink font-medium text-[13px] tracking-wide hover:bg-paper-2 transition-colors flex items-center gap-2"
      >
        {t("onboarding.intro.start")}
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M5 12h14M13 5l7 7-7 7" />
        </svg>
      </motion.button>
    </motion.div>
  );
}

function Step({
  step,
  stepIndex,
  totalSteps,
  onComplete,
  onBack,
}: {
  step: (typeof STEPS)[number];
  stepIndex: number;
  totalSteps: number;
  onComplete: (ids: string[]) => void;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<string[]>([]);
  const [enteredAt] = useState(() => Date.now());

  // Tracking : entrée dans l'étape
  useEffect(() => {
    void trackPreference({
      step: "step_entered",
      payload: { onboarding_step: step.id, index: stepIndex },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.id]);

  const toggle = (id: string) => {
    const wasSelected = selected.includes(id);
    if (step.multi) setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
    else setSelected([id]);

    // Tracking : log chaque choix granulaire (best-effort).
    // Mapping étape → step enum :
    let trackStep: PreferenceStep | null = null;
    if (step.id === "values") trackStep = wasSelected ? "cause_dropped" : "cause_picked";
    else if (step.id === "exclusions") trackStep = wasSelected ? "exclusion_removed" : "exclusion_added";
    else if (step.id === "objective") trackStep = "objective_picked";
    else if (step.id === "amount") trackStep = "amount_set";
    if (trackStep) {
      void trackPreference({
        step: trackStep,
        payload: { value: id, onboarding_step: step.id },
        dwellMs: Date.now() - enteredAt,
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.35 }}
      className="min-h-screen flex flex-col"
    >
      <div className="flex items-center justify-between px-6 pt-6 gap-4">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full flex items-center justify-center text-paper/50 hover:text-paper transition-colors"
          aria-label={t("onboarding.step.back")}
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
        <div className="flex gap-1.5 flex-1 max-w-[180px] mx-auto">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all ${
                i < stepIndex ? "bg-moss-3" : i === stepIndex ? "bg-paper" : "bg-paper/15"
              }`}
            />
          ))}
        </div>
        <span className="text-[11px] text-paper/40 font-semibold min-w-[28px] text-right">
          {t("onboarding.step.progress", { current: stepIndex + 1, total: totalSteps })}
        </span>
      </div>

      <div className="px-6 pt-10 max-w-lg mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex gap-3 items-start"
        >
          <div className="w-9 h-9 rounded-full bg-moss-2 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-paper" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a8 8 0 0 1-11.5 7.2L4 21l1.8-5.5A8 8 0 1 1 21 12Z" />
            </svg>
          </div>
          <div className="flex-1 bg-paper/10 text-paper text-[13px] rounded-2xl rounded-bl-sm px-4 py-3 leading-relaxed">
            {t(`onboarding.steps.${step.id}.ethiMessage`)}
          </div>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="font-value text-2xl text-paper pt-8"
        >
          {t(`onboarding.steps.${step.id}.question`)}
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
                <div className="w-10 h-10 rounded-xl bg-paper/10 flex items-center justify-center text-lg flex-shrink-0">
                  {option.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-paper">{t(`onboarding.steps.${step.id}.${option.id}`)}</p>
                  {step.id !== "exclusions" && (
                    <p className="text-[11px] text-paper/50 mt-0.5">{t(`onboarding.steps.${step.id}.${option.id}_desc`)}</p>
                  )}
                </div>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    isSel ? "bg-moss-2 border-moss-2" : "border-paper/20"
                  }`}
                >
                  {isSel && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
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
            {t("onboarding.step.continue")}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────
// Planting scene — actually generates the portfolio
// ─────────────────────────────────────────────────────────

interface SelectedAsset {
  id: string;
  ticker: string;
  name: string;
}

function PlantingScene({ onEnter, answers, mode = "replace", name }: { onEnter: () => void; answers: Answers; mode?: "replace" | "create"; name?: string }) {
  const { t } = useTranslation();
  const { lang } = useLang();
  const generate = useServerFn(generatePortfolio);
  const [phase, setPhase] = useState<"loading" | "reveal" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selected, setSelected] = useState<SelectedAsset[]>([]);
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [initialAmount, setInitialAmount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const causes = ((answers.values ?? []) as CauseTag[]).slice(0, 6);
        const exclusions = ((answers.exclusions ?? []) as ExclusionTag[]).slice(0, 6);
        const { risk, horizon } = objectiveToRiskHorizon(answers.objective?.[0]);
        const amount = Number(answers.amount?.[0] ?? "10") || 10;

        const intensity: Record<string, number> = {};
        for (const c of causes) intensity[c] = 0.7;

        const result = await callAuthed(generate, {
          causes,
          cause_intensity: intensity,
          exclusions,
          risk_target: risk,
          horizon_years: horizon,
          initial_amount: amount,
          mode,
          name,
        });

        if (cancelled) return;
        setSelected(result.selected.map((s) => ({ id: s.id, ticker: s.ticker, name: s.name })));
        setWeights(result.weights as Record<string, number>);
        setInitialAmount(amount);
        setPhase("reveal");
        // Tracking : allocation présentée à l'utilisateur
        void trackPreference({
          step: "allocation_seen",
          portfolioId: result.portfolio_id,
          payload: {
            position_count: result.selected.length,
            causes,
            exclusions,
            risk_target: risk,
            horizon_years: horizon,
            initial_amount: amount,
          },
        });
      } catch (err) {
        if (cancelled) return;
        console.error("[onboarding] generate:", err);
        setErrorMsg(err instanceof Error ? err.message : t("onboarding.planting.error_fallback"));
        setPhase("error");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-paper text-ink"
    >
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
            <p className="text-[10px] uppercase tracking-[0.18em] text-ink-3 font-medium">{t("onboarding.planting.loading_eyebrow")}</p>
            <p className="font-value text-2xl text-ink mt-3">{t("onboarding.planting.loading_title")}</p>
            <p className="text-[12px] text-ink-3 mt-2">{t("onboarding.planting.loading_desc")}</p>
          </motion.div>
        )}

        {phase === "error" && (
          <motion.div key="e" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-md text-center">
            <p className="text-[10px] uppercase tracking-[0.18em] text-rust font-medium">{t("onboarding.planting.error_eyebrow")}</p>
            <h2 className="font-value text-2xl text-ink mt-3">{t("onboarding.planting.error_title")}</h2>
            <p className="text-[12px] text-ink-3 mt-3 break-words">{errorMsg}</p>
            <button
              onClick={() => {
                setErrorMsg(null);
                setPhase("loading");
                // re-run by reloading the planting scene — simplest path
                window.location.reload();
              }}
              className="mt-6 px-5 py-2.5 text-[13px] font-medium border border-ink rounded hover:bg-ink hover:text-paper transition-colors"
            >
              {t("common.retry")}
            </button>
          </motion.div>
        )}

        {phase === "reveal" && (
          <motion.div key="r" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
            <p className="text-[10px] uppercase tracking-[0.18em] text-ink-3 font-medium text-center">
              {t("onboarding.planting.reveal_eyebrow")}
            </p>
            <p className="font-value text-2xl text-ink text-center mt-2 mb-6">{t("onboarding.planting.reveal_title")}</p>
            <p className="text-[11px] text-ink-3 text-center mb-6">
              {t("onboarding.planting.reveal_summary", { count: selected.length, amount: formatCurrency(initialAmount, lang) })}
            </p>
            <ul className="divide-y divide-paper-3 border-t border-b border-paper-3">
              {selected
                .map((a) => ({ ...a, w: (weights[a.id] ?? 0) * 100 }))
                .filter((a) => a.w > 0.5)
                .sort((a, b) => b.w - a.w)
                .slice(0, 8)
                .map((a, i) => (
                  <motion.li
                    key={a.id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08, duration: 0.3 }}
                    className="py-3"
                  >
                    <div className="flex items-baseline justify-between mb-1.5 gap-3">
                      <span className="font-value text-[13px] text-ink truncate">{a.ticker}</span>
                      <span className="text-[12px] text-ink tabular-nums font-medium">{a.w.toFixed(1)}%</span>
                    </div>
                    <div className="h-px bg-paper-3 relative">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, a.w * 2.5)}%` }}
                        transition={{ delay: i * 0.08 + 0.15, duration: 0.6, ease: "easeOut" }}
                        className="absolute inset-y-0 left-0 bg-ink"
                      />
                    </div>
                    <p className="text-[10px] text-ink-3 mt-1 truncate">{a.name}</p>
                  </motion.li>
                ))}
            </ul>
            <button
              onClick={() => {
                void trackPreference({ step: "allocation_accepted", payload: { position_count: selected.length } });
                onEnter();
              }}
              className="mt-8 w-full py-3 rounded-full bg-ink text-paper font-semibold text-[13px] hover:bg-moss-2 transition-colors flex items-center justify-center gap-2"
            >
              {t("onboarding.planting.dashboard_cta")}
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
