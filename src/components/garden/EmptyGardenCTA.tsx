import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";

export function EmptyGardenCTA({ userName }: { userName: string }) {
  return (
    <div className="max-w-lg mx-auto px-6 pt-16 pb-32 text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", damping: 14 }}
        className="w-24 h-24 mx-auto mb-8 relative"
      >
        <div className="absolute inset-0 -m-4 rounded-full bg-moss-3/20 blur-2xl" />
        <svg viewBox="0 0 80 80" className="w-full h-full relative animate-breathe">
          <path d="M 40 22 C 30 22, 24 34, 28 50 C 32 62, 48 62, 52 50 C 56 34, 50 22, 40 22 Z" fill="var(--moss-2)" />
          <path d="M 40 22 Q 40 12, 46 10" stroke="var(--moss-3)" strokeWidth="2" fill="none" strokeLinecap="round" />
          <ellipse cx="47" cy="8" rx="3" ry="2" fill="var(--moss-3)" transform="rotate(30 47 8)" />
        </svg>
      </motion.div>

      <p className="text-[11px] uppercase tracking-[0.2em] text-moss-1 font-semibold">
        Bienvenue, {userName}
      </p>
      <h1 className="font-value text-4xl text-ink mt-3">Ton jardin t'attend.</h1>
      <p className="text-sm text-ink-3 mt-4 max-w-sm mx-auto leading-relaxed">
        Plante ta première graine et regarde-la pousser. Pas besoin d'être expert : Ethi te guide pas à pas.
      </p>

      <div className="mt-10 flex flex-col items-center gap-3">
        <Link to="/onboarding" className="btn-plant">
          Planter ma première graine
        </Link>
        <Link to="/discover" className="text-xs text-ink-3 hover:text-moss-1 transition-colors">
          Explorer d'abord les graines
        </Link>
      </div>
    </div>
  );
}
