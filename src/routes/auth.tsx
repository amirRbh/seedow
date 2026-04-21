import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string; mode?: "login" | "signup" } => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
    mode: search.mode === "signup" ? "signup" : search.mode === "login" ? "login" : undefined,
  }),
  beforeLoad: async ({ search }) => {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      throw redirect({ to: search.redirect ?? "/dashboard" });
    }
  },
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">(search.mode ?? "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onGoogle = async () => {
    setError(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}${search.redirect}`,
    });
    if (result.error) setError(result.error.message);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        const { error: err } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${search.redirect}`,
            data: { display_name: displayName || email.split("@")[0] },
          },
        });
        if (err) throw err;
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
      }
      navigate({ to: search.redirect });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur d'authentification");
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
        <Link to="/" className="text-[10px] uppercase tracking-[0.18em] text-ink-3 font-medium hover:text-ink transition-colors">
          ← Retour
        </Link>
        <h1 className="font-value text-3xl text-ink mt-6 leading-tight">
          {mode === "login" ? "Connexion" : "Créer un compte"}
        </h1>
        <p className="text-[13px] text-ink-2 mt-2">
          {mode === "login"
            ? "Accédez à votre espace de gestion."
            : "Quelques secondes pour commencer."}
        </p>

        <button
          onClick={onGoogle}
          className="mt-8 w-full py-2.5 rounded border border-paper-3 hover:border-ink transition-colors text-[13px] font-medium flex items-center justify-center gap-2"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continuer avec Google
        </button>

        <div className="my-5 flex items-center gap-3">
          <div className="flex-1 h-px bg-paper-3" />
          <span className="text-[10px] uppercase tracking-[0.15em] text-ink-3">ou</span>
          <div className="flex-1 h-px bg-paper-3" />
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          {mode === "signup" && (
            <input
              type="text"
              placeholder="Nom"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2.5 rounded border border-paper-3 bg-paper text-[13px] text-ink placeholder-ink-3 focus:border-ink focus:outline-none transition-colors"
            />
          )}
          <input
            type="email"
            placeholder="Adresse email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full px-3 py-2.5 rounded border border-paper-3 bg-paper text-[13px] text-ink placeholder-ink-3 focus:border-ink focus:outline-none transition-colors"
          />
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            className="w-full px-3 py-2.5 rounded border border-paper-3 bg-paper text-[13px] text-ink placeholder-ink-3 focus:border-ink focus:outline-none transition-colors"
          />

          {error && (
            <p className="text-[12px] text-rust">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-plant w-full justify-center disabled:opacity-50"
          >
            {loading ? "Veuillez patienter…" : mode === "login" ? "Se connecter" : "Créer le compte"}
          </button>
        </form>

        <p className="mt-6 text-[12px] text-ink-3 text-center">
          {mode === "login" ? "Pas encore de compte ? " : "Déjà inscrit ? "}
          <button
            type="button"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="text-ink underline-offset-4 hover:underline font-medium"
          >
            {mode === "login" ? "Créer un compte" : "Se connecter"}
          </button>
        </p>
      </motion.div>
    </div>
  );
}
