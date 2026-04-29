import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import seedowLogo from "@/assets/seedow-logo.png";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      // Logged-in users : si déjà un portefeuille → dashboard, sinon onboarding
      const { data: pf } = await supabase
        .from("portfolios")
        .select("id")
        .eq("user_id", data.session.user.id)
        .eq("is_active", true)
        .maybeSingle();
      throw redirect({ to: pf ? "/dashboard" : "/onboarding" });
    }
  },
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center max-w-lg mx-auto">
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 16 }}
          className="relative mb-8"
        >
          <div className="absolute inset-0 -m-8 rounded-full bg-moss-3/25 blur-2xl" />
          <img src={seedowLogo} alt="Seedow" className="relative h-24 w-auto animate-breathe" />
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="font-value text-5xl text-ink mt-4 leading-tight">
          Investis,
          <br />
          avec impact.
        </motion.h1>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="text-sm text-ink-3 mt-6 max-w-sm leading-relaxed">
          Investissement responsable, sans jargon. Suis ta performance et ton impact — Ethi t'accompagne à chaque étape.
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1 }} className="mt-12 flex flex-col items-center gap-3">
          <Link to="/auth" search={{ redirect: "/onboarding", mode: "signup" }} className="btn-plant">
            Commencer maintenant
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </Link>
          <Link to="/auth" search={{ redirect: "/dashboard", mode: "login" }} className="text-xs text-ink-3 hover:text-moss-1 transition-colors">
            Déjà un compte ? Se connecter →
          </Link>
        </motion.div>
      </main>
    </div>
  );
}
