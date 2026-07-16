import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useBetaCapacity } from "@/hooks/useBetaCapacity";
import { joinWaitlist } from "@/lib/beta/beta.functions";
import { LanguageToggle } from "@/components/LanguageToggle";



// Only accept same-origin relative paths: must start with "/" then a non-"/" path char,
// and must not contain protocol-like chars. Anything else falls back to undefined.
const isSafeRedirect = (v: unknown): v is string =>
  typeof v === "string" && /^\/[A-Za-z0-9_\-/.~?=&%#]*$/.test(v) && !v.startsWith("//");

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string; mode?: "login" | "signup" } => ({
    redirect: isSafeRedirect(search.redirect) ? search.redirect : undefined,
    mode: search.mode === "signup" ? "signup" : search.mode === "login" ? "login" : undefined,
  }),
  beforeLoad: async ({ search }) => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      throw redirect({ to: search.redirect ?? "/dashboard" });
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

  const safeRedirect = search.redirect ?? "/dashboard";
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
      if (mode === "signup") {
        if (betaFull) {
          const res = await joinWaitlist({ data: { email, source: "auth_signup_full" } });
          setWaitlistDone(res.position);
          return;
        }
        const { error: err } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${safeRedirect}`,
            data: { display_name: displayName || email.split("@")[0] },
          },
        });
        if (err) throw err;
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
      }
      navigate({ to: search.redirect ?? "/dashboard" });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.auth_error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="flex items-center justify-between mb-6">
          <Link to="/" className="inline-flex items-center" aria-label="Seedow">
            <span className="font-value text-lg text-ink tracking-tight">seedow</span>
          </Link>
          <LanguageToggle />
        </div>
        <Link to="/" className="block text-tag uppercase tracking-[0.18em] text-ink-3 font-medium hover:text-ink transition-colors">
          ← {t("common.back")}
        </Link>
        <h1 className="font-value text-3xl text-ink mt-6 leading-tight">
          {waitlistDone !== null
            ? t("auth.title_waitlisted")
            : mode === "login"
              ? t("auth.title_login")
              : betaFull
                ? t("auth.title_beta_full")
                : t("auth.title_signup")}
        </h1>
        <p className="text-body-sm text-ink-2 mt-2">
          {waitlistDone !== null
            ? t("auth.desc_waitlisted", { position: waitlistDone })
            : mode === "login"
              ? t("auth.desc_login")
              : betaFull
                ? t("auth.desc_beta_full")
                : t("auth.desc_signup")}
        </p>

        {mode === "signup" && capacity && !betaFull && waitlistDone === null && (
          <p className="mt-4 text-tag uppercase tracking-[0.18em] text-ink-3">
            {t("auth.slots_remaining")} : <span className="text-ink font-semibold">{capacity.slotsLeft}</span> / {capacity.cap}
          </p>
        )}

        <button
          onClick={onGoogle}
          className="mt-8 w-full py-2.5 rounded border border-paper-3 hover:border-ink transition-colors text-body-sm font-medium flex items-center justify-center gap-2"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {t("auth.continue_google")}
        </button>

        <div className="my-5 flex items-center gap-3">
          <div className="flex-1 h-px bg-paper-3" />
          <span className="text-tag uppercase tracking-[0.15em] text-ink-3">{t("common.or")}</span>
          <div className="flex-1 h-px bg-paper-3" />
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          {mode === "signup" && (
            <input
              type="text"
              placeholder={t("auth.name_placeholder")}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2.5 rounded border border-paper-3 bg-paper text-body-sm text-ink placeholder-ink-3 focus:border-ink focus:outline-none transition-colors"
            />
          )}
          <input
            type="email"
            placeholder={t("auth.email_placeholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full px-3 py-2.5 rounded border border-paper-3 bg-paper text-body-sm text-ink placeholder-ink-3 focus:border-ink focus:outline-none transition-colors"
          />
          <input
            type="password"
            placeholder={t("auth.password_placeholder")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            className="w-full px-3 py-2.5 rounded border border-paper-3 bg-paper text-body-sm text-ink placeholder-ink-3 focus:border-ink focus:outline-none transition-colors"
          />

          {error && (
            <p className="text-label text-rust">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-plant w-full justify-center disabled:opacity-50"
          >
            {loading
              ? t("common.please_wait")
              : mode === "login"
                ? t("auth.btn_login")
                : betaFull
                  ? t("auth.btn_waitlist")
                  : t("auth.btn_signup")}
          </button>
        </form>

        <p className="mt-6 text-label text-ink-3 text-center">
          {mode === "login" ? t("auth.no_account") : t("auth.have_account")}
          <button
            type="button"
            onClick={() => { setMode(mode === "login" ? "signup" : "login"); setWaitlistDone(null); }}
            className="text-ink underline-offset-4 hover:underline font-medium"
          >
            {mode === "login" ? t("auth.to_signup") : t("auth.to_login")}
          </button>
        </p>
      </motion.div>
    </div>
  );
}
