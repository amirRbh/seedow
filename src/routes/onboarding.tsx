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
  ArrowRight,
  Check,
  X,
  type LucideIcon,
} from "lucide-react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { joinWaitlist } from "@/lib/beta/beta.functions";
import { useBetaCapacity } from "@/hooks/useBetaCapacity";
import { screenAssetPool } from "@/lib/portfolio/server.functions";
import { poolReasons } from "@/lib/portfolio/poolReasons";
import { PoolReasonList } from "@/components/discover/PoolReasonList";
import { WhyThis } from "@/components/common/WhyThis";
import { AgencyReveal } from "@/components/onboarding/AgencyReveal";
import { writePoolHandoff } from "@/lib/onboarding/poolHandoff";
import { SimulationBadge } from "@/components/common/SimulationBadge";
import { trackPreference, type PreferenceStep } from "@/lib/preferences/tracking";
import { trackAppEvent } from "@/lib/analytics/appEvents";
import { Aurora } from "@/components/motion/Aurora";
import { Button } from "@/components/ui/button";
import { EASE_SIGNATURE } from "@/lib/motion";
import type { PortfolioParams } from "@/lib/portfolio/types";
import {
  answersToParams,
  loadDraft,
  saveDraft,
  type Answers,
  type Phase,
} from "@/lib/onboarding/params";

export const Route = createFileRoute("/onboarding")({
  validateSearch: (s: Record<string, unknown>): { new?: 1; guest?: true } => ({
    new: s.new === 1 || s.new === "1" ? 1 : undefined,
    guest: s.guest === true || s.guest === "true" ? true : undefined,
  }),
  // Pas de guard auth : on laisse l'utilisateur répondre aux questions sans compte,
  // et on lui montre le pool à composer (phase "preview") avant tout mur
  // d'inscription. Le compte n'est demandé qu'au moment de composer/sauvegarder
  // (le builder /construire exige un compte).
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

// La logique pure (mapping réponses → paramètres, persistance du brouillon) vit
// dans `@/lib/onboarding/params` — extraite et couverte par des tests.

function Onboarding() {
  const navigate = useNavigate();
  const { new: isNew, guest } = Route.useSearch();
  const isAdditive = isNew === 1;
  const isGuest = guest === true;
  // Ne restaure que le brouillon correspondant au même contexte (premier
  // portefeuille vs. portefeuille additionnel) — jamais l'un à la place de l'autre.
  const draft = loadDraft(isAdditive);
  const [phase, setPhase] = useState<Phase>(draft?.phase ?? "steps");
  const [stepIndex, setStepIndex] = useState(draft?.stepIndex ?? 0);
  const [answers, setAnswers] = useState<Answers>(draft?.answers ?? {});
  const [portfolioName, setPortfolioName] = useState(draft?.portfolioName ?? "");

  // Entrée dans l'aperçu : mesuré même sans compte (session anonyme).
  useEffect(() => {
    void trackAppEvent("preview_started", { guest: isGuest, additive: isAdditive });
    // Au montage uniquement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const portfolioParams = useMemo(() => answersToParams(answers), [answers]);

  useEffect(() => {
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
      if (!cancelled && hasSession) setPhase(isAdditive ? "naming" : "preview");
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
      // Mode "nouveau portefeuille" : utilisateur déjà connecté, on demande le
      // nom puis on lui montre le pool à composer (plus aucune génération).
      const { data } = await supabase.auth.getSession();
      if (data.session) setPhase("naming");
      else setPhase("account");
    } else {
      // Premier portefeuille : avant l'aperçu du pool, le moment « Ta voix »
      // relie ses convictions à un vrai vote d'AG (jamais en première scène — il
      // arrive après le questionnaire). La scène s'auto-saute si aucune résolution
      // n'est ouverte. La création de compte reste repoussée au moment de sauvegarder.
      setPhase("agency");
    }
  };

  return (
    <main className="min-h-screen text-ink">
      <AnimatePresence mode="wait">
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
                : navigate({ to: isAdditive ? "/le-fil" : "/" })
            }
          />
        )}
        {phase === "agency" && (
          <AgencyReveal
            key="agency"
            causes={portfolioParams.causes}
            onContinue={() => setPhase("preview")}
            onBack={() => {
              setStepIndex(STEPS.length - 1);
              setPhase("steps");
            }}
          />
        )}
        {phase === "preview" && (
          <PreviewScene
            key="preview"
            params={portfolioParams}
            mode={isAdditive ? "create" : "replace"}
            name={portfolioName || undefined}
          />
        )}
        {phase === "naming" && (
          <NamePortfolioStep
            key="naming"
            initialName={portfolioName}
            onConfirm={(name) => {
              setPortfolioName(name);
              // Plus de génération Markowitz : on montre le pool à composer.
              setPhase("preview");
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
            onAuthed={() => setPhase(isAdditive ? "naming" : "preview")}
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
      </AnimatePresence>
    </main>
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
          className="flex h-11 w-11 items-center justify-center rounded-full bg-paper text-ink-2 shadow-card outline-none transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-mint"
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
        <span className="text-caption text-ink-3 font-semibold">
          {t("onboarding.naming.title")}
        </span>
      </div>
      <div className="px-6 pt-12 pb-12 max-w-md mx-auto w-full flex-1">
        <h1 className="text-[clamp(28px,4vw,38px)]">{t("onboarding.naming.question")}</h1>
        <p className="text-body-sm text-ink-2 mt-2">
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
          className="field mt-8"
        />
        <p className="mt-2 text-tag text-ink-3 text-right">{name.length}/40</p>

        <button
          onClick={() => onConfirm(name.trim() || t("onboarding.naming.default_name"))}
          className="shine mt-8 flex h-14 w-full items-center justify-center rounded-full bg-ink text-body-lg font-semibold text-paper outline-none transition-[opacity,transform] duration-200 ease-brand hover:opacity-90 focus-visible:ring-2 focus-visible:ring-mint focus-visible:ring-offset-2 active:scale-[0.98] disabled:opacity-40"
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
          className="flex h-11 w-11 items-center justify-center rounded-full bg-paper text-ink-2 shadow-card outline-none transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-mint"
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
        <span className="text-caption text-ink-3 font-semibold">
          {t("onboarding.account.eyebrow")}
        </span>
      </div>

      <div className="px-6 pt-10 pb-12 max-w-md mx-auto w-full flex-1">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-3 items-start"
        >
          <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-ink text-paper">
            <svg
              viewBox="0 0 24 24"
              className="h-[18px] w-[18px]"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 12a8 8 0 0 1-11.5 7.2L4 21l1.8-5.5A8 8 0 1 1 21 12Z" />
            </svg>
          </div>
          <div className="flex-1 rounded-[20px] rounded-tl-md bg-paper px-4 py-3 text-body leading-relaxed text-ink shadow-card">
            {t("onboarding.account.ethi_message")}
          </div>
        </motion.div>

        {pendingEmail ? (
          <div className="tile-accent mt-8 flex items-start gap-3 px-4 py-4">
            <div className="w-9 h-9 rounded-full bg-highlight-2 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg
                viewBox="0 0 24 24"
                className="w-4 h-4 text-ink"
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
              <p className="text-body-sm text-ink leading-relaxed">
                {t("onboarding.account.verify_email")}
              </p>
              <p className="mt-1.5 text-label text-ink-2 break-all">{pendingEmail}</p>
            </div>
          </div>
        ) : (
          <>
            <h1 className="font-value text-2xl text-ink pt-8">
              {waitlistDone !== null
                ? t("onboarding.account.title_waitlisted")
                : mode === "login"
                  ? t("onboarding.account.title_login")
                  : betaFull
                    ? t("onboarding.account.title_beta_full")
                    : t("onboarding.account.title_signup")}
            </h1>
            <p className="text-label text-ink-2 mt-1.5">
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
                  className="mt-6 flex h-14 w-full items-center justify-center gap-2.5 rounded-full bg-paper text-body font-semibold text-ink shadow-card ring-1 ring-inset ring-paper-3 outline-none transition-shadow hover:shadow-soft focus-visible:ring-2 focus-visible:ring-mint"
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
                  <div className="flex-1 h-px bg-paper-3" />
                  <span className="text-caption font-semibold text-ink-3">ou</span>
                  <div className="flex-1 h-px bg-paper-3" />
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
                    className="field"
                  />
                )}
                <input
                  type="email"
                  placeholder={t("onboarding.account.email_placeholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="field"
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
                    className="field"
                  />
                )}

                {error && <p className="text-label text-alert-ink">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-14 flex items-center justify-center rounded-full bg-ink text-paper font-semibold text-body-sm hover:opacity-90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed mt-2"
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
              <p className="mt-5 text-label text-ink-3 text-center">
                {mode === "signup"
                  ? t("onboarding.account.already_account") + " "
                  : t("onboarding.account.no_account") + " "}
                <button
                  type="button"
                  onClick={() => setMode(mode === "signup" ? "login" : "signup")}
                  className="text-ink underline-offset-4 hover:underline font-medium"
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

// Micro-explicatif « Pourquoi ça compte ? » par étape — repliable, répond au
// doute en contexte sans rallonger le flux (persona Inès : décroche si c'est
// long). Le cours s'ouvre dans un nouvel onglet pour ne jamais perdre la
// progression de l'onboarding.
const EXPLAINER_COURSE: Record<(typeof STEPS)[number]["id"], string> = {
  values: "esg-cest-quoi",
  exclusions: "exclusions-sectorielles",
  objective: "risque-volatilite-drawdown",
  amount: "interets-composes",
};

function StepExplainer({ stepId }: { stepId: (typeof STEPS)[number]["id"] }) {
  const { t } = useTranslation();
  const slug = EXPLAINER_COURSE[stepId];
  return (
    <details className="faq paper-card group mt-4 rounded-[20px] px-4 py-3">
      <summary className="flex items-center justify-between gap-3 cursor-pointer list-none text-caption font-semibold text-ink-2 hover:text-ink transition-colors">
        <span>{t("onboarding.explainer.summary")}</span>
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          width={16}
          height={16}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="flex-shrink-0 transition-transform duration-300 group-open:rotate-180"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>
      <p className="mt-3 text-body-sm leading-relaxed text-ink-2">
        {t(`onboarding.explainer.${stepId}`)}
      </p>
      <a
        href={`/cours/${slug}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex items-center gap-1 text-caption font-semibold text-mint-ink hover:opacity-80 transition-opacity"
      >
        {t("onboarding.explainer.link")} <span aria-hidden>↗</span>
      </a>
    </details>
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
  const isValues = step.id === "values";
  // « Ce que je refuse » : l'accent passe en --alert (refus), jamais seul —
  // l'option cochée porte aussi une croix au lieu d'une coche.
  const isExclusions = step.id === "exclusions";
  const MAX_VALUES = 3;
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
    if (step.multi)
      setSelected((p) => {
        if (p.includes(id)) return p.filter((x) => x !== id);
        if (isValues && p.length >= MAX_VALUES) return p; // limite de causes atteinte
        return [...p, id];
      });
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
      transition={{ duration: 0.35, ease: EASE_SIGNATURE }}
      className={`${isExclusions ? "accent-alert" : "accent-mint"} relative flex min-h-screen flex-col`}
    >
      <Aurora />
      {/* Barre de pilotage : retour, progression qui se remplit, compteur écrit. */}
      <div className="sticky top-0 z-20 px-3 pt-3">
        <div className="glass mx-auto flex h-[60px] max-w-2xl items-center gap-4 rounded-full px-2">
        <button
          onClick={onBack}
          className="flex h-11 w-11 flex-none items-center justify-center rounded-full text-ink-2 outline-none transition-colors hover:bg-paper-inset hover:text-ink focus-visible:ring-2 focus-visible:ring-mint"
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
        <div className="flex flex-1 gap-1.5" aria-hidden>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper-inset">
              <div
                className="h-full rounded-full bg-ink transition-[width] duration-700 ease-brand motion-reduce:transition-none"
                style={{ width: i <= stepIndex ? "100%" : "0%" }}
              />
            </div>
          ))}
        </div>
        <span className="min-w-[44px] pr-3 text-right font-value text-label text-ink-2">
          {t("onboarding.step.progress", { current: stepIndex + 1, total: totalSteps })}
        </span>
        </div>
      </div>

      <div className="relative z-10 mx-auto w-full max-w-2xl px-5 pt-8 sm:px-6">
        {stepIndex === 0 && (
          <div className="mb-8 text-center">
            <p className="font-display text-[clamp(28px,4vw,40px)] font-extrabold leading-tight tracking-[-0.03em] text-ink">
              {t("onboarding.header.title")}
            </p>
            <p className="mt-2 text-body-sm font-semibold text-ink-3">
              {t("onboarding.header.meta")}
            </p>
          </div>
        )}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex gap-3 items-start"
        >
          <div className="w-9 h-9 rounded-full bg-highlight-2 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg
              viewBox="0 0 24 24"
              className="w-4 h-4 text-ink"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 12a8 8 0 0 1-11.5 7.2L4 21l1.8-5.5A8 8 0 1 1 21 12Z" />
            </svg>
          </div>
          <div className="flex-1 bg-paper-2 text-ink text-body-sm rounded-2xl rounded-bl-sm px-4 py-3 leading-relaxed">
            {t(`onboarding.steps.${step.id}.ethiMessage`)}
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          id="onboarding-step-question"
          className="pt-8 text-[clamp(26px,3.4vw,34px)]"
        >
          {t(`onboarding.steps.${step.id}.question`)}
        </motion.h1>

        {isValues && (
          <p
            role="status"
            className={`mt-2 text-caption font-semibold ${
              selected.length >= MAX_VALUES ? "text-ink" : "text-ink-3"
            }`}
          >
            {t("onboarding.steps.values.selected_count", {
              count: selected.length,
              max: MAX_VALUES,
            })}
            {selected.length >= MAX_VALUES && (
              <span className="block mt-0.5 text-ink-2 font-normal">
                {t("onboarding.steps.values.limit_reached")}
              </span>
            )}
          </p>
        )}

        <StepExplainer stepId={step.id} />

        <div
          role={step.multi ? "group" : "radiogroup"}
          aria-labelledby="onboarding-step-question"
          className="grid gap-2.5 pt-5 pb-36 sm:grid-cols-2"
        >
          {step.options.map((option, i) => {
            const isSel = selected.includes(option.id);
            const isLocked = isValues && !isSel && selected.length >= MAX_VALUES;
            return (
              <motion.button
                key={option.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.04, duration: 0.4, ease: EASE_SIGNATURE }}
                whileTap={isLocked ? undefined : { scale: 0.97 }}
                onClick={() => toggle(option.id)}
                disabled={isLocked}
                aria-disabled={isLocked}
                role={step.multi ? "checkbox" : "radio"}
                aria-checked={isSel}
                className={`group flex w-full items-center gap-3 rounded-[20px] p-3.5 text-left outline-none transition-[background-color,box-shadow,opacity] duration-200 ease-brand focus-visible:ring-2 focus-visible:ring-mint ${
                  isSel
                    ? "bg-paper shadow-soft ring-2 ring-section-accent"
                    : isLocked
                      ? "cursor-not-allowed bg-paper/60 text-ink-3 opacity-50"
                      : "bg-paper shadow-card hover:shadow-soft"
                }`}
              >
                <div
                  className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[14px] text-lg transition-[background-color,color,transform] duration-300 ease-brand ${
                    isSel
                      ? "bg-section-accent text-paper"
                      : "bg-paper-2 text-ink-2 group-hover:-rotate-6 group-hover:scale-105 motion-reduce:transform-none"
                  }`}
                >
                  <StepOptionIcon icon={option.icon} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-body font-bold text-ink">
                    {t(`onboarding.steps.${step.id}.${option.id}`)}
                  </p>
                  {step.id !== "exclusions" && (
                    <p className="mt-0.5 text-label text-ink-2">
                      {t(`onboarding.steps.${step.id}.${option.id}_desc`)}
                    </p>
                  )}
                </div>
                {/* Coché / pas coché se lit à la FORME (coche pleine contre cercle
                    vide), pas seulement à la couleur (CLAUDE.md §4). */}
                <div
                  className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full transition-[background-color,box-shadow,transform] duration-300 ease-brand ${
                    isSel ? "scale-100 bg-section-accent text-paper" : "ring-2 ring-inset ring-paper-3"
                  }`}
                >
                  {isSel &&
                    (isExclusions ? (
                      <X aria-hidden className="size-3.5" strokeWidth={3} />
                    ) : (
                      <Check aria-hidden className="size-3.5" strokeWidth={3} />
                    ))}
                </div>
              </motion.button>
            );
          })}

          {isAmount && (
            <div className="pt-1 sm:col-span-2">
              {/* Recadrage « curseur de jeu » (analyse UX §10 — P2) : dédramatise
                  le montant, réaffirme le statut simulation avant toute somme. */}
              <p className="mb-3 text-caption text-ink-2 leading-relaxed">
                {t("onboarding.steps.amount.sim_hint")}
              </p>
              <label
                htmlFor="onboarding-custom-amount"
                className="block text-caption text-ink-3 mb-2"
              >
                {t("onboarding.steps.amount.custom_label")}
              </label>
              <div className="flex items-center gap-2 rounded-[20px] bg-paper p-3.5 shadow-card ring-1 ring-inset ring-paper-3 focus-within:ring-2 focus-within:ring-mint">
                <span className="text-ink-2 text-lg" aria-hidden="true">
                  €
                </span>
                <input
                  id="onboarding-custom-amount"
                  inputMode="numeric"
                  value={customAmount}
                  onChange={(e) => onCustomAmount(e.target.value)}
                  placeholder={t("onboarding.steps.amount.custom_placeholder")}
                  className="flex-1 bg-transparent outline-none text-ink text-[16px] placeholder-ink-3"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="fixed right-0 bottom-0 left-0 z-20 bg-gradient-to-t from-paper-2 via-paper-2/90 to-transparent p-5 pt-10 sm:p-6 sm:pt-12">
        <div className="mx-auto max-w-2xl">
          <Button
            size="lg"
            disabled={selected.length === 0}
            onClick={() => onComplete(selected)}
            className="h-14 w-full"
          >
            {t("onboarding.step.continue")}
            <ArrowRight aria-hidden />
          </Button>
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
// Preview — présente un POOL d'actifs classé (SANS proposer d'allocation).
// Seedow ne propose plus de poids : il classe un pool selon les préférences et
// l'utilisateur compose ses montants lui-même dans le builder (/construire).
// ─────────────────────────────────────────────────────────

/** Une ligne du pool telle que renvoyée par `screenAssetPool` (payload UI). */
interface PoolEntry {
  id: string;
  ticker: string;
  name: string;
  esg_score: number;
  esg_score_source: string | null;
  ter: number;
  relevance: number | null;
  sharpe: number | null;
  seedow_esg_score: number | null;
  cause_exposure: Record<string, number>;
  data_tier: "full" | "partial" | "insufficient";
}

/** Nombre de lignes affichées dans l'aperçu et seedées dans le builder. */
const POOL_PREVIEW_LIMIT = 12;

function PreviewScene({
  params,
  mode,
  name,
}: {
  params: PortfolioParams;
  /** "replace" (premier portefeuille) ou "create" (ajout depuis le dashboard). */
  mode: "replace" | "create";
  /** Nom éventuel (parcours « ajouter un portefeuille »). */
  name?: string;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const screen = useServerFn(screenAssetPool);
  const [phase, setPhase] = useState<"loading" | "reveal" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pool, setPool] = useState<PoolEntry[]>([]);
  const [excludedCount, setExcludedCount] = useState(0);
  const [universeSize, setUniverseSize] = useState(0);
  const [attempt, setAttempt] = useState(0);

  // Passe au builder : on amorce la composition avec le haut du pool classé
  // (l'utilisateur ajuste les montants). Pour un invité, /construire exige un
  // compte — la création de compte arrive donc au moment de composer/sauvegarder,
  // conformément à « il compose lui-même avant de sauvegarder ».
  // Intention transmise au builder : mode (replace/create), convictions, nom et
  // le cadre chiffré du questionnaire (montant saisi, risque/horizon dérivés de
  // l'objectif) — indépendante des actifs seedés (le parcours « page blanche »
  // la réutilise avec zéro actif pour garder le bon mode). Sans ce transport,
  // le montant que l'utilisateur vient de saisir était perdu au profit d'une
  // valeur en dur côté serveur.
  const handoffIntent = {
    mode,
    causes: params.causes,
    exclusions: params.exclusions,
    initialAmount: params.initial_amount,
    riskTarget: params.risk_target,
    horizonYears: params.horizon_years,
    ...(name ? { name } : {}),
  };

  const compose = () => {
    const seed = pool.slice(0, POOL_PREVIEW_LIMIT).map((p) => ({
      id: p.id,
      ticker: p.ticker,
      name: p.name,
      esgScore: p.esg_score,
    }));
    writePoolHandoff(seed, handoffIntent);
    void trackPreference({ step: "pool_compose", payload: { count: seed.length } });
    void navigate({ to: "/construire" });
  };

  useEffect(() => {
    let cancelled = false;
    setPhase("loading");
    setErrorMsg(null);
    (async () => {
      try {
        // Seules les convictions et les exclusions classent le pool — le reste
        // du paramétrage (montant, risque, horizon) suit le portefeuille, pas
        // le screening.
        const result = await screen({
          data: { causes: params.causes, exclusions: params.exclusions },
        });
        if (cancelled) return;
        setPool(result.pool as PoolEntry[]);
        setExcludedCount(result.excluded_count ?? 0);
        setUniverseSize(result.universe_size ?? 0);
        setPhase("reveal");
        void trackPreference({
          step: "pool_seen",
          payload: {
            pool_size: result.pool.length,
            causes: params.causes,
            exclusions: params.exclusions,
            risk_target: params.risk_target,
            horizon_years: params.horizon_years,
            initial_amount: params.initial_amount,
          },
        });
      } catch (err) {
        if (cancelled) return;
        console.error("[onboarding] screen:", err);
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
      className="accent-mint relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-5 py-12 text-ink"
    >
      <Aurora />
      <AnimatePresence mode="wait">
        {phase === "loading" && (
          <motion.div
            key="l"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="status"
            className="relative z-10 flex flex-col items-center text-center"
          >
            {/* Le tri en cours : trois points qui gravitent autour d'une graine.
                Décoratif — l'état est dit en toutes lettres dessous. */}
            <div aria-hidden className="relative mb-10 h-28 w-28">
              <span className="absolute inset-0 rounded-full ring-1 ring-paper-3" />
              <span className="absolute inset-5 rounded-full ring-1 ring-paper-3" />
              <span className="absolute top-1/2 left-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 animate-breathe rounded-full bg-mint" />
              {["bg-mint", "bg-ice", "bg-volt"].map((color, i) => (
                <motion.span
                  key={color}
                  className="absolute inset-0"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2.4 + i * 0.8, repeat: Infinity, ease: "linear" }}
                >
                  <span
                    className={`absolute left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full ${color}`}
                    style={{ top: i === 1 ? 20 : -5 }}
                  />
                </motion.span>
              ))}
            </div>
            <span className="chip chip--accent">{t("onboarding.pool.loading_eyebrow")}</span>
            <p className="mt-4 font-display text-[clamp(26px,3.4vw,34px)] font-extrabold tracking-[-0.03em] text-ink">
              {t("onboarding.pool.loading_title")}
            </p>
            <p className="mt-2 text-body text-ink-2">{t("onboarding.pool.loading_desc")}</p>
          </motion.div>
        )}

        {phase === "error" && (
          <motion.div
            key="e"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            role="alert"
            className="paper-card relative z-10 w-full max-w-md p-8 text-center"
          >
            <span className="chip chip--disputed">{t("onboarding.building.error_eyebrow")}</span>
            <h1 className="mt-4 text-[clamp(24px,3vw,30px)]">
              {t("onboarding.building.error_title")}
            </h1>
            <p className="text-label text-ink-3 mt-3 break-words">{errorMsg}</p>
            <Button className="mt-6" onClick={() => setAttempt((a) => a + 1)}>
              {t("common.retry")}
            </Button>
          </motion.div>
        )}

        {phase === "reveal" && (
          <motion.div
            key="r"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            role="status"
            className="relative z-10 w-full max-w-xl"
          >
            <SimulationBadge center withTagline className="mb-5" />
            <p className="text-center">
              <span className="chip chip--accent">{t("onboarding.pool.eyebrow")}</span>
            </p>
            <h1 className="mt-4 mb-3 text-center text-[clamp(28px,4vw,40px)]">
              {t("onboarding.pool.title")}
            </h1>
            {/* Explication simple et claire du choix (aucune allocation imposée) :
                on montre des actifs qui collent aux filtres, classés par pertinence,
                et c'est l'utilisateur qui compose — il ne doit jamais se sentir perdu. */}
            <p className="mb-7 text-center text-body leading-relaxed text-ink-2">
              {t("onboarding.pool.explainer", {
                count: pool.length,
                excluded: excludedCount,
                universe: universeSize,
              })}
            </p>
            <ul className="flex flex-col gap-2">
              {pool.slice(0, POOL_PREVIEW_LIMIT).map((a, i) => (
                <motion.li
                  key={a.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.4, ease: EASE_SIGNATURE }}
                  className="paper-card spot p-4"
                >
                  {/* Nom lisible d'abord ; le ticker devient une métadonnée.
                      La ligne est CLIQUABLE : l'aperçu affichait douze noms de
                      fonds sans aucune sortie, alors qu'on venait précisément
                      de promettre des alternatives. On peut maintenant ouvrir
                      chacune et voir ce qu'elle finance avant de composer quoi
                      que ce soit. */}
                  <Link
                    to="/fonds/$isin"
                    params={{ isin: a.ticker }}
                    className="group flex items-baseline justify-between gap-3 min-w-0 -my-1 py-1 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ink"
                  >
                    <span className="min-w-0">
                      <span className="font-value text-body-sm text-ink truncate block group-hover:underline underline-offset-4">
                        {a.name}
                      </span>
                      <span className="text-caption font-semibold text-ink-3">
                        {a.ticker}
                      </span>
                    </span>
                    <span className="shrink-0 flex items-baseline gap-2">
                      <span className="font-value text-body-sm tabular-nums text-ink-2">
                        {a.seedow_esg_score ?? "—"}
                        <span className="text-tag text-ink-3"> /100</span>
                      </span>
                      <span aria-hidden className="text-ink-3">
                        ›
                      </span>
                    </span>
                  </Link>
                  {/* Les RAISONS, pas le score. Un « 87/100 » trié par ordre
                      décroissant se lit comme un palmarès — Seedow classe un
                      pool, il ne désigne pas un gagnant (cf. `poolReasons`).
                      Elles passent SOUS le nom, sur toute la largeur : serrées
                      dans une colonne de droite, elles seraient illisibles sur
                      un téléphone, qui est l'écran de ce parcours. */}
                  <PoolReasonList
                    className="mt-1.5"
                    reasons={poolReasons({
                      causes: params.causes,
                      causeExposure: a.cause_exposure,
                      sustainability: a.seedow_esg_score,
                      esgSource: a.esg_score_source,
                      ter: a.ter,
                      sharpe: a.sharpe,
                    })}
                  />
                </motion.li>
              ))}
            </ul>
            {/* La méthode passe derrière « Pourquoi ces fonds ? » : les raisons
                sont désormais lisibles ligne par ligne au-dessus, et un pavé de
                petits caractères sous une liste n'est lu par personne. Repliée,
                pas supprimée — c'est la différence entre alléger et masquer. */}
            <WhyThis className="mt-3 flex justify-center" label={t("onboarding.pool.why_these")}>
              {t("onboarding.pool.method_note")}
            </WhyThis>
            <div className="mt-8 space-y-3">
              <button
                onClick={compose}
                className="shine h-14 w-full rounded-full bg-ink text-body-lg font-semibold text-paper outline-none transition-[opacity,transform] duration-200 ease-brand hover:opacity-90 focus-visible:ring-2 focus-visible:ring-mint focus-visible:ring-offset-2 active:scale-[0.98]"
              >
                {t("onboarding.pool.compose_cta")}
              </button>
              <button
                onClick={() => {
                  // Page blanche : builder vide mais on conserve le mode/nom
                  // (create ne doit jamais écraser un portefeuille existant).
                  writePoolHandoff([], handoffIntent);
                  void navigate({ to: "/construire" });
                }}
                className="min-h-[44px] w-full rounded-full text-body-sm font-semibold text-ink-2 outline-none transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-mint"
              >
                {t("onboarding.pool.blank_cta")}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
