import { useTranslation, Trans } from "react-i18next";
import {
  Sun,
  Leaf,
  HandHeart,
  Scale,
  BrainCircuit,
  Recycle,
  Fuel,
  Ban,
  Cigarette,
  Dices,
  Rabbit,
  Shirt,
  Palmtree,
  Home,
  Target,
  PiggyBank,
  type LucideIcon,
} from "lucide-react";
import { useLang } from "@/hooks/useLang";
import { formatCurrency, formatPercent } from "@/lib/format";
import { EASE_REVEAL } from "@/lib/motion";
import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { joinWaitlist } from "@/lib/beta/beta.functions";
import { useBetaCapacity } from "@/hooks/useBetaCapacity";
import { generatePortfolio, simulatePortfolio } from "@/lib/portfolio/server.functions";
import { callAuthed } from "@/lib/authedServerFn";
import { trackPreference, type PreferenceStep } from "@/lib/preferences/tracking";
import type { CauseTag, ExclusionTag, PortfolioParams } from "@/lib/portfolio/types";

export const Route = createFileRoute("/onboarding")({
  validateSearch: (s: Record<string, unknown>): { new?: 1 } => ({
    new: s.new === 1 || s.new === "1" ? 1 : undefined,
  }),
  // Pas de guard auth : on laisse l'utilisateur répondre aux questions sans compte,
  // et on lui montre son allocation simulée (phase "preview", non persistée) avant
  // tout mur d'inscription. Le compte n'est demandé qu'au moment de sauvegarder
  // (phase "account", juste avant la persistance en phase "saving").
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
      { id: "climat", icon: Sun },
      { id: "biodiversite", icon: Leaf },
      { id: "humain", icon: HandHeart },
      { id: "egalite", icon: Scale },
      { id: "tech", icon: BrainCircuit },
      { id: "circulaire", icon: Recycle },
    ],
  },
  {
    id: "exclusions" as const,
    multi: true,
    options: [
      { id: "fossiles", icon: Fuel },
      { id: "armes", icon: Ban },
      { id: "tabac", icon: Cigarette },
      { id: "jeux", icon: Dices },
      { id: "animaux", icon: Rabbit },
      { id: "fast-fashion", icon: Shirt },
    ],
  },
  {
    id: "objective" as const,
    multi: false,
    options: [
      { id: "retraite", icon: Palmtree },
      { id: "maison", icon: Home },
      { id: "court", icon: Target },
      { id: "epargne", icon: PiggyBank },
    ],
  },
  {
    id: "amount" as const,
    multi: false,
    options: [
      { id: "10", icon: "€" },
      { id: "50", icon: "€€" },
      { id: "100", icon: "€€€" },
      { id: "500", icon: "€€€€" },
    ],
  },
];

function StepOptionIcon({ icon }: { icon: string | LucideIcon }) {
  if (typeof icon === "string") return <>{icon}</>;
  const Icon = icon;
  return <Icon className="w-[18px] h-[18px]" strokeWidth={1.8} aria-hidden="true" />;
}

type StepId = (typeof STEPS)[number]["id"];
type Phase = "intro" | "steps" | "preview" | "account" | "naming" | "building" | "saving";
type Answers = Partial<Record<StepId, string[]>>;

// ─────────────────────────────────────────────────────────
// Persistance du brouillon d'onboarding.
//
// localStorage (et non sessionStorage) : la confirmation d'email s'ouvre
// presque toujours dans un NOUVEL onglet/appareil — une nouvelle session
// navigateur où sessionStorage est vide. Avec sessionStorage, l'utilisateur
// qui revient via le lien email reperdait toute sa progression et repartait
// du questionnaire à zéro (le pire point d'abandon). localStorage survit à ce
// round-trip et au flux OAuth.
//
// Contrepartie (un brouillon qui traînerait indéfiniment) : on horodate et on
// expire au bout de DRAFT_MAX_AGE_MS, et on nettoie à la fin de l'onboarding.
// ─────────────────────────────────────────────────────────
const DRAFT_KEY = "seedow_onboarding_draft";
const DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 h

interface OnboardingDraft {
  phase: Phase;
  stepIndex: number;
  answers: Answers;
  portfolioName: string;
  isAdditive: boolean;
}

function loadDraft(isAdditive: boolean): OnboardingDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<OnboardingDraft> & { savedAt?: number };
    // Brouillon expiré : on le purge et on repart proprement.
    if (typeof parsed.savedAt === "number" && Date.now() - parsed.savedAt > DRAFT_MAX_AGE_MS) {
      clearDraft();
      return null;
    }
    // Un brouillon "nouveau portefeuille" ne doit pas être repris par le flux
    // du premier portefeuille, et inversement.
    if (!parsed.phase || Boolean(parsed.isAdditive) !== isAdditive) return null;
    return {
      phase: parsed.phase,
      stepIndex: parsed.stepIndex ?? 0,
      answers: parsed.answers ?? {},
      portfolioName: parsed.portfolioName ?? "",
      isAdditive,
    };
  } catch {
    return null;
  }
}

function saveDraft(draft: OnboardingDraft) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, savedAt: Date.now() }));
  } catch {
    // Stockage indisponible (mode privé strict, quota) : on continue sans persister.
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}

/** Dérive les paramètres du moteur de portefeuille depuis les réponses de l'onboarding. */
function answersToParams(answers: Answers): PortfolioParams {
  const causes = ((answers.values ?? []) as CauseTag[]).slice(0, 6);
  const exclusions = ((answers.exclusions ?? []) as ExclusionTag[]).slice(0, 6);
  const { risk, horizon } = objectiveToRiskHorizon(answers.objective?.[0]);
  const amount = Number(answers.amount?.[0] ?? "10") || 10;
  const cause_intensity: Record<string, number> = {};
  for (const c of causes) cause_intensity[c] = 0.7;
  return {
    causes,
    cause_intensity,
    exclusions,
    risk_target: risk,
    horizon_years: horizon,
    initial_amount: amount,
  };
}

// Map onboarding objective → (risk_target, horizon_years)
function objectiveToRiskHorizon(obj: string | undefined): { risk: number; horizon: number } {
  switch (obj) {
    case "retraite":
      return { risk: 0.13, horizon: 25 };
    case "maison":
      return { risk: 0.1, horizon: 8 };
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
  // Ne restaure que le brouillon correspondant au même contexte (premier
  // portefeuille vs. portefeuille additionnel) — jamais l'un à la place de l'autre.
  const draft = loadDraft(isAdditive);
  const [phase, setPhase] = useState<Phase>(draft?.phase ?? (isAdditive ? "steps" : "intro"));
  const [stepIndex, setStepIndex] = useState(draft?.stepIndex ?? 0);
  const [answers, setAnswers] = useState<Answers>(draft?.answers ?? {});
  const [portfolioName, setPortfolioName] = useState(draft?.portfolioName ?? "");

  const portfolioParams = useMemo(() => answersToParams(answers), [answers]);

  useEffect(() => {
    if (phase === "intro") return; // rien à restaurer tant que l'utilisateur n'a pas démarré
    saveDraft({ phase, stepIndex, answers, portfolioName, isAdditive });
  }, [phase, stepIndex, answers, portfolioName, isAdditive]);

  // Retour authentifié : après confirmation d'email (le plus souvent dans un
  // nouvel onglet) ou après OAuth, l'utilisateur revient sur /onboarding déjà
  // connecté, avec un brouillon restauré au mur "account". On saute alors ce
  // mur et on reprend exactement là où il en était, au lieu de le re-présenter.
  // onAuthStateChange couvre le cas où la session n'est établie qu'APRÈS le
  // montage (traitement asynchrone du token présent dans l'URL de retour).
  useEffect(() => {
    if (phase !== "account") return;
    let cancelled = false;
    const advanceIfAuthed = (hasSession: boolean) => {
      if (!cancelled && hasSession) setPhase(isAdditive ? "naming" : "saving");
    };
    void supabase.auth.getSession().then(({ data }) => advanceIfAuthed(Boolean(data.session)));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) =>
      advanceIfAuthed(Boolean(session)),
    );
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [phase, isAdditive]);

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
      return;
    }
    // Dernière question terminée
    if (isAdditive) {
      // Mode "nouveau portefeuille" : utilisateur déjà connecté, on demande le nom puis on génère.
      const { data } = await supabase.auth.getSession();
      if (data.session) setPhase("naming");
      else setPhase("account");
    } else {
      // Premier portefeuille : on montre l'allocation simulée tout de suite,
      // sans compte — la création de compte n'arrive qu'au moment de sauvegarder.
      setPhase("preview");
    }
  };

  // Appelé depuis l'écran de preview quand l'utilisateur veut sauvegarder son portefeuille.
  const handleSave = async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) setPhase("saving");
    else setPhase("account");
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
            onBack={() =>
              stepIndex > 0
                ? setStepIndex(stepIndex - 1)
                : isAdditive
                  ? navigate({ to: "/dashboard" })
                  : setPhase("intro")
            }
          />
        )}
        {phase === "preview" && (
          <PreviewScene key="preview" params={portfolioParams} onSave={handleSave} />
        )}
        {phase === "naming" && (
          <NamePortfolioStep
            key="naming"
            initialName={portfolioName}
            onConfirm={(name) => {
              setPortfolioName(name);
              setPhase("building");
            }}
            onBack={() => {
              setStepIndex(STEPS.length - 1);
              setPhase("steps");
            }}
          />
        )}
        {phase === "account" && (
          <AccountStep
            key="account"
            onAuthed={() => setPhase(isAdditive ? "naming" : "saving")}
            onBack={() => {
              if (isAdditive) {
                setStepIndex(STEPS.length - 1);
                setPhase("steps");
              } else {
                setPhase("preview");
              }
            }}
          />
        )}
        {phase === "building" && (
          <BuildingScene
            key="building"
            onEnter={async () => {
              clearDraft();
              await router.invalidate();
              navigate({ to: "/dashboard" });
            }}
            answers={answers}
            mode={isAdditive ? "create" : "replace"}
            name={portfolioName || undefined}
          />
        )}
        {phase === "saving" && (
          <SavingScene
            key="saving"
            params={portfolioParams}
            onEnter={async () => {
              clearDraft();
              await router.invalidate();
              navigate({ to: "/dashboard" });
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function NamePortfolioStep({
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
          className="w-11 h-11 rounded-full flex items-center justify-center text-paper/50 hover:text-paper transition-colors"
          aria-label={t("onboarding.step.back")}
        >
          <svg
            viewBox="0 0 24 24"
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
        <span className="text-caption text-paper/40 font-semibold">
          {t("onboarding.naming.title")}
        </span>
      </div>
      <div className="px-6 pt-12 pb-12 max-w-md mx-auto w-full flex-1">
        <h2 className="font-value text-3xl text-paper">{t("onboarding.naming.question")}</h2>
        <p className="text-body-sm text-paper/60 mt-2">
          <Trans i18nKey="onboarding.naming.description">
            Donne-lui un nom qui te parle — par exemple <em>Climat</em>, <em>Retraite</em>,{" "}
            <em>Tech responsable</em>…
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
        <p className="mt-2 text-tag text-paper/40 text-right">{name.length}/40</p>

        <button
          onClick={() => onConfirm(name.trim() || t("onboarding.naming.default_name"))}
          className="mt-8 w-full py-4 rounded-full bg-paper text-ink font-semibold text-sm hover:bg-highlight-5 hover:text-highlight-1 transition-colors"
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
  const { capacity } = useBetaCapacity();
  const [waitlistDone, setWaitlistDone] = useState<number | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const betaFull = mode === "signup" && capacity?.full === true;

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
        if (betaFull) {
          const res = await joinWaitlist({ data: { email, source: "onboarding_signup_full" } });
          setWaitlistDone(res.position);
          return;
        }
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
          // Confirmation d'email requise : ce n'est pas une erreur. On montre un
          // état calme et rassurant. La progression est gardée (localStorage) et
          // le lien de l'email ramène l'utilisateur exactement ici (voir l'effet
          // de reprise authentifiée dans Onboarding).
          setPendingEmail(email);
          return;
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
          className="w-11 h-11 rounded-full flex items-center justify-center text-paper/50 hover:text-paper transition-colors"
          aria-label={t("onboarding.step.back")}
        >
          <svg
            viewBox="0 0 24 24"
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
        <span className="text-caption text-paper/40 font-semibold">
          {t("onboarding.account.eyebrow")}
        </span>
      </div>

      <div className="px-6 pt-10 pb-12 max-w-md mx-auto w-full flex-1">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-3 items-start"
        >
          <div className="w-9 h-9 rounded-full bg-highlight-2 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg
              viewBox="0 0 24 24"
              className="w-4 h-4 text-paper"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 12a8 8 0 0 1-11.5 7.2L4 21l1.8-5.5A8 8 0 1 1 21 12Z" />
            </svg>
          </div>
          <div className="flex-1 bg-paper/10 text-paper text-body-sm rounded-2xl rounded-bl-sm px-4 py-3 leading-relaxed">
            {t("onboarding.account.ethi_message")}
          </div>
        </motion.div>

        {pendingEmail ? (
          <div className="mt-8 flex items-start gap-3 rounded-2xl border border-paper/15 bg-paper/5 px-4 py-4">
            <div className="w-9 h-9 rounded-full bg-highlight-2 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg
                viewBox="0 0 24 24"
                className="w-4 h-4 text-paper"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <path d="M22 6l-10 7L2 6" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-body-sm text-paper leading-relaxed">
                {t("onboarding.account.verify_email")}
              </p>
              <p className="mt-1.5 text-label text-paper/60 break-all">{pendingEmail}</p>
            </div>
          </div>
        ) : (
          <>
            <h2 className="font-value text-2xl text-paper pt-8">
          {waitlistDone !== null
            ? t("onboarding.account.title_waitlisted")
            : mode === "login"
              ? t("onboarding.account.title_login")
              : betaFull
                ? t("onboarding.account.title_beta_full")
                : t("onboarding.account.title_signup")}
        </h2>
        <p className="text-label text-paper/60 mt-1.5">
          {waitlistDone !== null
            ? t("onboarding.account.desc_waitlisted", { position: waitlistDone })
            : betaFull
              ? t("onboarding.account.desc_beta_full")
              : t("onboarding.account.description")}
        </p>

        {waitlistDone === null && !betaFull && (
          <>
            <button
              onClick={onGoogle}
              className="mt-6 w-full py-2.5 rounded-xl border border-paper/20 hover:border-paper/40 hover:bg-paper/5 transition-colors text-body-sm font-medium text-paper flex items-center justify-center gap-2"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              {t("onboarding.account.continue_google")}
            </button>

            <div className="my-4 flex items-center gap-3">
              <div className="flex-1 h-px bg-paper/15" />
              <span className="text-tag uppercase tracking-[0.15em] text-paper/40">ou</span>
              <div className="flex-1 h-px bg-paper/15" />
            </div>
          </>
        )}

        {waitlistDone === null && (
          <form onSubmit={onSubmit} className="space-y-2.5">
            {mode === "signup" && !betaFull && (
              <input
                type="text"
                placeholder={t("onboarding.account.firstname_placeholder")}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3.5 py-3 rounded-xl border border-paper/15 bg-paper/5 text-body-sm text-paper placeholder-paper/40 focus:border-paper/40 focus:outline-none transition-colors"
              />
            )}
            <input
              type="email"
              placeholder={t("onboarding.account.email_placeholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-3.5 py-3 rounded-xl border border-paper/15 bg-paper/5 text-body-sm text-paper placeholder-paper/40 focus:border-paper/40 focus:outline-none transition-colors"
            />
            {!betaFull && (
              <input
                type="password"
                placeholder={t("onboarding.account.password_placeholder")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                className="w-full px-3.5 py-3 rounded-xl border border-paper/15 bg-paper/5 text-body-sm text-paper placeholder-paper/40 focus:border-paper/40 focus:outline-none transition-colors"
              />
            )}

            {error && <p className="text-label text-rust">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-full bg-paper text-ink font-semibold text-body-sm hover:bg-highlight-5 hover:text-highlight-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed mt-2"
            >
              {loading
                ? t("onboarding.account.waiting")
                : mode === "login"
                  ? t("onboarding.account.btn_login")
                  : betaFull
                    ? t("onboarding.account.btn_waitlist")
                    : t("onboarding.account.btn_signup")}
            </button>
          </form>
        )}

        {waitlistDone === null && (
          <p className="mt-5 text-label text-paper/50 text-center">
            {mode === "signup"
              ? t("onboarding.account.already_account") + " "
              : t("onboarding.account.no_account") + " "}
            <button
              type="button"
              onClick={() => setMode(mode === "signup" ? "login" : "signup")}
              className="text-paper underline-offset-4 hover:underline font-medium"
            >
              {mode === "signup"
                ? t("onboarding.account.link_login")
                : t("onboarding.account.link_signup")}
            </button>
          </p>
        )}
          </>
        )}
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
          <line
            x1="0"
            y1="59"
            x2="240"
            y2="59"
            stroke="var(--paper)"
            strokeOpacity="0.15"
            strokeWidth="0.5"
          />
          <motion.path
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.6, ease: EASE_REVEAL, delay: 0.3 }}
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
        className="text-tag uppercase tracking-[0.18em] text-paper/50 font-medium"
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
        className="text-body-sm text-paper/60 text-center mt-5 max-w-sm leading-relaxed"
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
          <li key={s.n} className={`border-t pt-2 ${i === 0 ? "border-paper" : "border-paper/15"}`}>
            <p className="font-value text-tag tabular-nums tracking-widest text-paper/40">{s.n}</p>
            <p
              className={`text-caption uppercase tracking-[0.16em] mt-1 ${
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
        className="mt-12 px-7 py-3 rounded bg-paper text-ink font-medium text-body-sm tracking-wide hover:bg-paper-2 transition-colors flex items-center gap-2"
      >
        {t("onboarding.intro.start")}
        <svg
          viewBox="0 0 24 24"
          className="w-3.5 h-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M5 12h14M13 5l7 7-7 7" />
        </svg>
      </motion.button>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6 }}
        className="mt-4 text-caption uppercase tracking-[0.16em] text-paper/40"
      >
        Sans compte · 2 min · aucun engagement
      </motion.p>
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
  const isAmount = step.id === "amount";
  const [customAmount, setCustomAmount] = useState("");

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
    if (isAmount) setCustomAmount(""); // taper un préréglage remplace la saisie libre

    // Tracking : log chaque choix granulaire (best-effort).
    // Mapping étape → step enum :
    let trackStep: PreferenceStep | null = null;
    if (step.id === "values") trackStep = wasSelected ? "cause_dropped" : "cause_picked";
    else if (step.id === "exclusions")
      trackStep = wasSelected ? "exclusion_removed" : "exclusion_added";
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

  // Saisie libre du montant (step "amount") : on n'accepte que des chiffres,
  // on retire les zéros en tête et on borne à 7 chiffres. Un montant valide
  // devient la sélection ; un champ vide/nul désélectionne (bouton désactivé).
  const onCustomAmount = (raw: string) => {
    const digits = raw.replace(/\D/g, "").replace(/^0+/, "").slice(0, 7);
    setCustomAmount(digits);
    const n = Number(digits);
    setSelected(n > 0 ? [String(n)] : []);
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
          className="w-11 h-11 rounded-full flex items-center justify-center text-paper/50 hover:text-paper transition-colors"
          aria-label={t("onboarding.step.back")}
        >
          <svg
            viewBox="0 0 24 24"
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
        <div className="flex gap-1.5 flex-1 max-w-[180px] mx-auto">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all ${
                i < stepIndex ? "bg-highlight-3" : i === stepIndex ? "bg-paper" : "bg-paper/15"
              }`}
            />
          ))}
        </div>
        <span className="text-caption text-paper/40 font-semibold min-w-[28px] text-right">
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
          <div className="w-9 h-9 rounded-full bg-highlight-2 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg
              viewBox="0 0 24 24"
              className="w-4 h-4 text-paper"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 12a8 8 0 0 1-11.5 7.2L4 21l1.8-5.5A8 8 0 1 1 21 12Z" />
            </svg>
          </div>
          <div className="flex-1 bg-paper/10 text-paper text-body-sm rounded-2xl rounded-bl-sm px-4 py-3 leading-relaxed">
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
                  isSel
                    ? "bg-paper text-ink border-paper"
                    : "border-white/25 hover:bg-white/10 text-paper"
                }`}
                style={!isSel ? { backgroundColor: "rgba(255,255,255,0.06)" } : undefined}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${isSel ? "bg-ink/10" : ""}`}
                  style={!isSel ? { backgroundColor: "rgba(255,255,255,0.12)" } : undefined}
                >
                  <StepOptionIcon icon={option.icon} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${isSel ? "text-ink" : "text-paper"}`}>
                    {t(`onboarding.steps.${step.id}.${option.id}`)}
                  </p>
                  {step.id !== "exclusions" && (
                    <p className={`text-caption mt-0.5 ${isSel ? "text-ink/60" : "text-paper/70"}`}>
                      {t(`onboarding.steps.${step.id}.${option.id}_desc`)}
                    </p>
                  )}
                </div>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    isSel ? "bg-ink border-ink" : "border-white/50"
                  }`}
                >
                  {isSel && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path
                        d="M1 4l3 3 5-6"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
              </motion.button>
            );
          })}

          {isAmount && (
            <div className="pt-1">
              <label
                htmlFor="onboarding-custom-amount"
                className="block text-caption text-paper/50 mb-2"
              >
                {t("onboarding.steps.amount.custom_label")}
              </label>
              <div
                className="flex items-center gap-2 p-3.5 rounded-2xl border border-white/25"
                style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
              >
                <span className="text-paper/60 text-lg" aria-hidden="true">
                  €
                </span>
                <input
                  id="onboarding-custom-amount"
                  inputMode="numeric"
                  value={customAmount}
                  onChange={(e) => onCustomAmount(e.target.value)}
                  placeholder={t("onboarding.steps.amount.custom_placeholder")}
                  className="flex-1 bg-transparent outline-none text-paper text-[16px] placeholder-paper/30"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-ink via-ink to-transparent">
        <div className="max-w-lg mx-auto">
          <button
            disabled={selected.length === 0}
            onClick={() => onComplete(selected)}
            className="w-full py-4 rounded-full bg-paper text-ink font-semibold text-sm hover:bg-highlight-5 hover:text-highlight-1 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {t("onboarding.step.continue")}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

interface SelectedAsset {
  id: string;
  ticker: string;
  name: string;
}

// ─────────────────────────────────────────────────────────
// Preview — simule l'allocation sans compte ni persistance
// (mur d'inscription repoussé après la preview, pas avant)
// ─────────────────────────────────────────────────────────

function PreviewScene({ params, onSave }: { params: PortfolioParams; onSave: () => void }) {
  const { t } = useTranslation();
  const { lang } = useLang();
  const simulate = useServerFn(simulatePortfolio);
  const [phase, setPhase] = useState<"loading" | "reveal" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selected, setSelected] = useState<SelectedAsset[]>([]);
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setPhase("loading");
    setErrorMsg(null);
    (async () => {
      try {
        const result = await simulate({ data: params });
        if (cancelled) return;
        setSelected(result.selected.map((s) => ({ id: s.id, ticker: s.ticker, name: s.name })));
        setWeights(result.weights as Record<string, number>);
        setPhase("reveal");
        void trackPreference({
          step: "allocation_seen",
          payload: {
            position_count: result.selected.length,
            causes: params.causes,
            exclusions: params.exclusions,
            risk_target: params.risk_target,
            horizon_years: params.horizon_years,
            initial_amount: params.initial_amount,
          },
        });
      } catch (err) {
        if (cancelled) return;
        console.error("[onboarding] simulate:", err);
        setErrorMsg(err instanceof Error ? err.message : t("onboarding.building.error_fallback"));
        setPhase("error");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-paper text-ink"
    >
      <AnimatePresence mode="wait">
        {phase === "loading" && (
          <motion.div
            key="l"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center"
          >
            <div className="w-32 h-px bg-paper-3 relative mb-8 overflow-hidden">
              <motion.div
                animate={{ x: ["-100%", "100%"] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-y-0 w-1/2 bg-ink"
              />
            </div>
            <p className="text-tag uppercase tracking-[0.18em] text-ink-3 font-medium">
              {t("onboarding.building.loading_eyebrow")}
            </p>
            <p className="font-value text-2xl text-ink mt-3">
              {t("onboarding.building.loading_title")}
            </p>
            <p className="text-label text-ink-3 mt-2">{t("onboarding.building.loading_desc")}</p>
          </motion.div>
        )}

        {phase === "error" && (
          <motion.div
            key="e"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full max-w-md text-center"
          >
            <p className="text-tag uppercase tracking-[0.18em] text-rust font-medium">
              {t("onboarding.building.error_eyebrow")}
            </p>
            <h2 className="font-value text-2xl text-ink mt-3">
              {t("onboarding.building.error_title")}
            </h2>
            <p className="text-label text-ink-3 mt-3 break-words">{errorMsg}</p>
            <button
              onClick={() => setAttempt((a) => a + 1)}
              className="mt-6 px-5 py-2.5 text-body-sm font-medium border border-ink rounded hover:bg-ink hover:text-paper transition-colors"
            >
              {t("common.retry")}
            </button>
          </motion.div>
        )}

        {phase === "reveal" && (
          <motion.div
            key="r"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md"
          >
            <div className="mb-5 rounded-md border border-paper-3 bg-paper-2 px-3 py-2 text-center">
              <p className="text-caption uppercase tracking-[0.16em] text-ink-3 font-medium">
                Aperçu · pas encore sauvegardé
              </p>
            </div>
            <p className="text-tag uppercase tracking-[0.18em] text-ink-3 font-medium text-center">
              {t("onboarding.building.reveal_eyebrow")}
            </p>
            <p className="font-value text-2xl text-ink text-center mt-2 mb-6">
              {t("onboarding.building.reveal_title")}
            </p>
            <p className="text-caption text-ink-3 text-center mb-6">
              {t("onboarding.building.reveal_summary", {
                count: selected.length,
                amount: formatCurrency(params.initial_amount, lang),
              })}
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
                      <span className="font-value text-body-sm text-ink truncate">{a.ticker}</span>
                      <span className="text-label text-ink tabular-nums font-medium">
                        {formatPercent(a.w / 100, lang, 1)}
                      </span>
                    </div>
                    <div className="h-px bg-paper-3 relative">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, a.w * 2.5)}%` }}
                        transition={{ delay: i * 0.08 + 0.15, duration: 0.6, ease: EASE_REVEAL }}
                        className="absolute inset-y-0 left-0 bg-ink"
                      />
                    </div>
                    <p className="text-tag text-ink-3 mt-1 truncate">{a.name}</p>
                  </motion.li>
                ))}
            </ul>
            <button
              onClick={() => {
                void trackPreference({
                  step: "allocation_accepted",
                  payload: { position_count: selected.length },
                });
                onSave();
              }}
              className="mt-8 w-full py-3 rounded-full bg-ink text-paper font-semibold text-body-sm hover:bg-highlight-2 transition-colors flex items-center justify-center gap-2"
            >
              {t("onboarding.building.save_cta")}
              <svg
                viewBox="0 0 24 24"
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </button>
            <p className="mt-3 text-center text-caption text-ink-3">
              {t("onboarding.building.save_hint")}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────
// Saving — persiste le portefeuille une fois le compte créé
// (ou immédiatement si l'utilisateur était déjà connecté)
// ─────────────────────────────────────────────────────────

function SavingScene({ params, onEnter }: { params: PortfolioParams; onEnter: () => void }) {
  const { t } = useTranslation();
  const generate = useServerFn(generatePortfolio);
  const [phase, setPhase] = useState<"loading" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setPhase("loading");
    setErrorMsg(null);
    (async () => {
      try {
        await callAuthed(generate, { ...params, mode: "replace" });
        if (cancelled) return;
        onEnter();
      } catch (err) {
        if (cancelled) return;
        console.error("[onboarding] save:", err);
        setErrorMsg(err instanceof Error ? err.message : t("onboarding.building.error_fallback"));
        setPhase("error");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-paper text-ink"
    >
      <AnimatePresence mode="wait">
        {phase === "loading" && (
          <motion.div
            key="l"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center"
          >
            <div className="w-32 h-px bg-paper-3 relative mb-8 overflow-hidden">
              <motion.div
                animate={{ x: ["-100%", "100%"] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-y-0 w-1/2 bg-ink"
              />
            </div>
            <p className="text-tag uppercase tracking-[0.18em] text-ink-3 font-medium">
              {t("onboarding.saving.title")}
            </p>
          </motion.div>
        )}

        {phase === "error" && (
          <motion.div
            key="e"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full max-w-md text-center"
          >
            <p className="text-tag uppercase tracking-[0.18em] text-rust font-medium">
              {t("onboarding.building.error_eyebrow")}
            </p>
            <h2 className="font-value text-2xl text-ink mt-3">
              {t("onboarding.building.error_title")}
            </h2>
            <p className="text-label text-ink-3 mt-3 break-words">{errorMsg}</p>
            <button
              onClick={() => setAttempt((a) => a + 1)}
              className="mt-6 px-5 py-2.5 text-body-sm font-medium border border-ink rounded hover:bg-ink hover:text-paper transition-colors"
            >
              {t("common.retry")}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────
// Building scene — flux additif (nouveau portefeuille, déjà connecté) :
// simule ET persiste en une passe, inchangé pour ce cas.
// ─────────────────────────────────────────────────────────

function BuildingScene({
  onEnter,
  answers,
  mode = "replace",
  name,
}: {
  onEnter: () => void;
  answers: Answers;
  mode?: "replace" | "create";
  name?: string;
}) {
  const { t } = useTranslation();
  const { lang } = useLang();
  const generate = useServerFn(generatePortfolio);
  const [phase, setPhase] = useState<"loading" | "reveal" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selected, setSelected] = useState<SelectedAsset[]>([]);
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [initialAmount, setInitialAmount] = useState(0);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setPhase("loading");
    setErrorMsg(null);
    (async () => {
      try {
        const params = answersToParams(answers);

        const result = await callAuthed(generate, {
          ...params,
          mode,
          name,
        });

        if (cancelled) return;
        setSelected(result.selected.map((s) => ({ id: s.id, ticker: s.ticker, name: s.name })));
        setWeights(result.weights as Record<string, number>);
        setInitialAmount(params.initial_amount);
        setPhase("reveal");
        // Tracking : allocation présentée à l'utilisateur
        void trackPreference({
          step: "allocation_seen",
          portfolioId: result.portfolio_id,
          payload: {
            position_count: result.selected.length,
            causes: params.causes,
            exclusions: params.exclusions,
            risk_target: params.risk_target,
            horizon_years: params.horizon_years,
            initial_amount: params.initial_amount,
          },
        });
      } catch (err) {
        if (cancelled) return;
        console.error("[onboarding] generate:", err);
        setErrorMsg(err instanceof Error ? err.message : t("onboarding.building.error_fallback"));
        setPhase("error");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-paper text-ink"
    >
      <AnimatePresence mode="wait">
        {phase === "loading" && (
          <motion.div
            key="l"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center"
          >
            <div className="w-32 h-px bg-paper-3 relative mb-8 overflow-hidden">
              <motion.div
                animate={{ x: ["-100%", "100%"] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-y-0 w-1/2 bg-ink"
              />
            </div>
            <p className="text-tag uppercase tracking-[0.18em] text-ink-3 font-medium">
              {t("onboarding.building.loading_eyebrow")}
            </p>
            <p className="font-value text-2xl text-ink mt-3">
              {t("onboarding.building.loading_title")}
            </p>
            <p className="text-label text-ink-3 mt-2">{t("onboarding.building.loading_desc")}</p>
          </motion.div>
        )}

        {phase === "error" && (
          <motion.div
            key="e"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full max-w-md text-center"
          >
            <p className="text-tag uppercase tracking-[0.18em] text-rust font-medium">
              {t("onboarding.building.error_eyebrow")}
            </p>
            <h2 className="font-value text-2xl text-ink mt-3">
              {t("onboarding.building.error_title")}
            </h2>
            <p className="text-label text-ink-3 mt-3 break-words">{errorMsg}</p>
            <button
              onClick={() => setAttempt((a) => a + 1)}
              className="mt-6 px-5 py-2.5 text-body-sm font-medium border border-ink rounded hover:bg-ink hover:text-paper transition-colors"
            >
              {t("common.retry")}
            </button>
          </motion.div>
        )}

        {phase === "reveal" && (
          <motion.div
            key="r"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md"
          >
            <p className="text-tag uppercase tracking-[0.18em] text-ink-3 font-medium text-center">
              {t("onboarding.building.reveal_eyebrow")}
            </p>
            <p className="font-value text-2xl text-ink text-center mt-2 mb-6">
              {t("onboarding.building.reveal_title")}
            </p>
            <p className="text-caption text-ink-3 text-center mb-6">
              {t("onboarding.building.reveal_summary", {
                count: selected.length,
                amount: formatCurrency(initialAmount, lang),
              })}
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
                      <span className="font-value text-body-sm text-ink truncate">{a.ticker}</span>
                      <span className="text-label text-ink tabular-nums font-medium">
                        {formatPercent(a.w / 100, lang, 1)}
                      </span>
                    </div>
                    <div className="h-px bg-paper-3 relative">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, a.w * 2.5)}%` }}
                        transition={{ delay: i * 0.08 + 0.15, duration: 0.6, ease: EASE_REVEAL }}
                        className="absolute inset-y-0 left-0 bg-ink"
                      />
                    </div>
                    <p className="text-tag text-ink-3 mt-1 truncate">{a.name}</p>
                  </motion.li>
                ))}
            </ul>
            <button
              onClick={() => {
                void trackPreference({
                  step: "allocation_accepted",
                  payload: { position_count: selected.length },
                });
                onEnter();
              }}
              className="mt-8 w-full py-3 rounded-full bg-ink text-paper font-semibold text-body-sm hover:bg-highlight-2 transition-colors flex items-center justify-center gap-2"
            >
              {t("onboarding.building.dashboard_cta")}
              <svg
                viewBox="0 0 24 24"
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
