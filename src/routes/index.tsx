import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";

export const Route = createFileRoute("/")({ component: Index });

function Index() {
  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center max-w-lg mx-auto">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", damping: 14 }}
          className="w-28 h-28 relative mb-10"
        >
          <div className="absolute inset-0 -m-6 rounded-full bg-moss-3/25 blur-2xl" />
          <svg viewBox="0 0 80 80" className="w-full h-full relative animate-breathe">
            <path d="M 40 22 C 30 22, 24 34, 28 50 C 32 62, 48 62, 52 50 C 56 34, 50 22, 40 22 Z" fill="var(--moss-2)" />
            <path d="M 40 22 Q 40 12, 46 10" stroke="var(--moss-3)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <ellipse cx="47" cy="8" rx="3.5" ry="2.5" fill="var(--moss-3)" transform="rotate(30 47 8)" />
          </svg>
        </motion.div>

        <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-[11px] uppercase tracking-[0.25em] text-moss-1 font-semibold">
          Seedow
        </motion.p>

        <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="font-value text-5xl text-ink mt-4 leading-tight">
          Plante, cultive,
          <br />
          récolte.
        </motion.h1>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="text-sm text-ink-3 mt-6 max-w-sm leading-relaxed">
          L'investissement éthique comme un jardin qui pousse. Aucun jargon, juste du sens — et Ethi à tes côtés.
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1 }} className="mt-12 flex flex-col items-center gap-3">
          <Link to="/onboarding" className="btn-plant">
            Planter ma première graine
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </Link>
          <Link to="/dashboard" className="text-xs text-ink-3 hover:text-moss-1 transition-colors">
            Voir une démo du jardin →
          </Link>
        </motion.div>
      </main>
    </div>
  );
}
