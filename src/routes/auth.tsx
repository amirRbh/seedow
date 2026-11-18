import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { Trans, useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useBetaCapacity } from "@/hooks/useBetaCapacity";
import { joinWaitlist } from "@/lib/beta/beta.functions";
import { trackAppEvent } from "@/lib/analytics/appEvents";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Wordmark } from "@/components/brand/Wordmark";
import { Aurora } from "@/components/motion/Aurora";
import { Check, MailCheck } from "lucide-react";
import { EASE_SIGNATURE } from "@/lib/motion";
import { Button } from "@/components/ui/button";

// Only accept same-origin relative paths: must start with "/" then a non-"/" path char,
// and must not contain protocol-like chars. Anything else falls back to undefined.
const isSafeRedirect = (v: unknown): v is string =>
  typeof v === "string" && /^\/[A-Za-z0-9_\-/.~?=&%#]*$/.test(v) && !v.startsWith("//");

export const Route = createFileRoute("/auth")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { redirect?: string; mode?: "login" | "signup" } => ({
    redirect: isSafeRedirect(search.redirect) ? search.redirect : undefined,
    mode: search.mode === "signup" ? "signup" : search.mode === "login" ? "login" : undefined,
  }),
  beforeLoad: async ({ search }) => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      throw redirect({ to: search.redirect ?? "/le-fil" });
    }
  },
  component: AuthPage,
});

function AuthPage() {
  const { t } = useTranslation();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { capacity } = useBetaCapacity();
  const [mode, setMode] = useState<"login" | "signup">(search.mode ?? "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [waitlistDone, setWaitlistDone] = useState<number | null>(null);
  // Passwordless : moins de friction qu'un mot de passe à inventer/retenir.
  const [magic, setMagic] = useState(false);
  const [magicSent, setMagicSent] = useState(false);

  const safeRedirect = search.redirect ?? "/le-fil";
  const betaFull = mode === "signup" && capacity?.full === true;

  useEffect(() => {
    if (mode === "signup" && capacity?.full) {
      // affichage formulaire waitlist
    }
  }, [mode, capacity?.full]);

  const onGoogle = async () => {
    setError(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}${safeRedirect}`,
    });
    if (result.error) setError(result.error.message);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "signup" && betaFull) {
        const res = await joinWaitlist({ data: { email, source: "auth_signup_full" } });
        setWaitlistDone(res.position);
        return;
      }
      if (magic) {
        const { error: err } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}${safeRedirect}`,
            // En connexion, ne jamais créer de compte par ce chemin : la
            // capacité bêta est contrôlée au signup explicite.
            shouldCreateUser: mode === "signup",
            ...(mode === "signup"
              ? { data: { display_name: displayName || email.split("@")[0] } }
              : {}),
          },
        });
        if (err) throw err;
        setMagicSent(true);
        return;
      }
      if (mode === "signup") {
        const { error: err } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${safeRedirect}`,
            data: { display_name: displayName || email.split("@")[0] },
          },
        });
        if (err) throw err;
        void trackAppEvent("account_created", { method: "password" });
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
      }
      navigate({ to: search.redirect ?? "/le-fil" });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.auth_error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* ── Panneau de marque (grand écran) ─────────────────────────
          La signature, et ce que Seedow garantit — écrit, pas suggéré.
          Décor : une aurore lente sur la bande sombre. */}
      <aside className="on-deep relative m-3 hidden overflow-hidden rounded-[32px] lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Aurora />
        <div className="relative z-10">
          <Wordmark size="lg" className="text-on-deep" />
        </div>
        <div className="relative z-10">
          <p className="display-lg max-w-[14ch]">
            {t("site.signature_1")}
            <br />
            <span className="text-gradient">{t("site.signature_2")}</span>
          </p>
          <ul className="mt-10 flex flex-col gap-3">
            {(["no_advice", "sources", "free"] as const).map((key, i) => (
              <li
                key={key}
                className="flex animate-fade-in-up items-center gap-3 text-body-lg text-ink-2 [&_b]:font-bold [&_b]:text-ink"
                style={{ animationDelay: `${300 + i * 120}ms` }}
              >
                <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-mint/20 text-mint-ink">
                  <Check aria-hidden className="size-4" strokeWidth={3} />
                </span>
                <span>
                  <Trans i18nKey={`landing.rv.proof.${key}`} components={{ b: <b /> }} />
                </span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative z-10 text-body-sm text-ink-3">{t("landing.badge_simulation")}</p>
      </aside>

      {/* ── Formulaire ──────────────────────────────────────────── */}
      <div className="relative flex items-center justify-center overflow-hidden px-5 py-12">
        <div className="lg:hidden">
          <Aurora />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE_SIGNATURE }}
          className="relative z-10 w-full max-w-[420px]"
        >
          <div className="mb-8 flex items-center justify-between">
            <Link to="/" className="link-u text-body-sm font-semibold text-ink-2 hover:text-ink">
              ← {t("common.back")}
            </Link>
            <LanguageToggle />
          </div>
          <div className="mb-6 lg:hidden">
            <Wordmark size="lg" />
          </div>
          <h1 className="text-[clamp(30px,4vw,40px)] leading-tight">
            {waitlistDone !== null
              ? t("auth.title_waitlisted")
              : mode === "login"
                ? t("auth.title_login")
                : betaFull
                  ? t("auth.title_beta_full")
                  : t("auth.title_signup")}
          </h1>
          <p className="mt-3 text-body leading-relaxed text-ink-2">
            {waitlistDone !== null
              ? t("auth.desc_waitlisted", { position: waitlistDone })
              : mode === "login"
                ? t("auth.desc_login")
                : betaFull
                  ? t("auth.desc_beta_full")
                  : t("auth.desc_signup")}
          </p>

          {mode === "signup" && capacity && !betaFull && waitlistDone === null && (
            <p className="chip chip--verified mt-4">
              <span aria-hidden className="live-dot" />
              {t("auth.slots_remaining")} :{" "}
              <span className="font-bold tabular-nums">{capacity.slotsLeft}</span> / {capacity.cap}
            </p>
          )}

          <button
            onClick={onGoogle}
            type="button"
            className="mt-8 flex h-14 w-full items-center justify-center gap-2.5 rounded-full bg-paper text-body font-semibold text-ink shadow-card ring-1 ring-inset ring-paper-3 outline-none transition-[box-shadow,transform] duration-200 ease-brand hover:shadow-soft hover:ring-ink-3 focus-visible:ring-2 focus-visible:ring-mint active:scale-[0.98] motion-reduce:transform-none"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
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
            {t("auth.continue_google")}
          </button>

          <div className="my-5 flex items-center gap-3">
            <div className="flex-1 h-px bg-paper-3" />
            <span className="text-caption font-semibold text-ink-3">{t("common.or")}</span>
            <div className="flex-1 h-px bg-paper-3" />
          </div>

          <form onSubmit={onSubmit} className="space-y-3">
            {mode === "signup" && (
              <input
                type="text"
                placeholder={t("auth.name_placeholder")}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="field"
              />
            )}
            <input
              type="email"
              placeholder={t("auth.email_placeholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="field"
            />
            {!magic && (
              <input
                type="password"
                placeholder={t("auth.password_placeholder")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                className="field"
              />
            )}

            {magicSent && (
              <p
                role="status"
                className="flex animate-pop items-center gap-2.5 rounded-2xl bg-mint-tint px-4 py-3 text-body-sm text-ink ring-1 ring-inset ring-mint-tint-border"
              >
                <MailCheck aria-hidden className="size-5 flex-none text-mint-ink" />
                {t("auth.magic_sent")}
              </p>
            )}
            {error && (
              <p
                role="alert"
                className="rounded-2xl bg-alert-tint px-4 py-3 text-body-sm text-alert-ink"
              >
                {error}
              </p>
            )}

            <Button
              type="submit"
              size="lg"
              disabled={loading || magicSent}
              className="w-full justify-center"
            >
              {loading
                ? t("common.please_wait")
                : betaFull
                  ? t("auth.btn_waitlist")
                  : magic
                    ? t("auth.btn_magic")
                    : mode === "login"
                      ? t("auth.btn_login")
                      : t("auth.btn_signup")}
            </Button>

            {!betaFull && (
              <button
                type="button"
                onClick={() => {
                  setMagic((m) => !m);
                  setMagicSent(false);
                  setError(null);
                }}
                className="min-h-[44px] w-full rounded-full text-center text-body-sm font-semibold text-ink-2 outline-none transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-mint"
              >
                {magic ? t("auth.magic_use_password") : t("auth.magic_toggle")}
              </button>
            )}
          </form>

          <p className="mt-6 text-center text-body-sm text-ink-2">
            {mode === "login" ? t("auth.no_account") : t("auth.have_account")}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login");
                setWaitlistDone(null);
              }}
              className="ml-1 font-bold text-mint-ink underline-offset-4 hover:underline"
            >
              {mode === "login" ? t("auth.to_signup") : t("auth.to_login")}
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
