import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";

interface AppHeaderProps {
  /** Petit éyebrow au-dessus du titre */
  eyebrow?: string;
  /** Titre principal */
  title: string;
  /** Sous-titre optionnel */
  subtitle?: string;
  /** Si vrai, masque le bouton réglages (utile sur la page réglages elle-même) */
  hideSettings?: boolean;
}

/**
 * Header institutionnel commun aux pages principales.
 * Affiche un titre et une icône engrenage menant aux réglages.
 */
export function AppHeader({ eyebrow, title, subtitle, hideSettings = false }: AppHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-4 px-5 pt-6 pb-4">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[11px] uppercase tracking-wider text-ink-3 font-medium">{eyebrow}</p>
        )}
        <h1 className="font-value text-3xl text-ink mt-0.5 truncate">{title}</h1>
        {subtitle && <p className="text-sm text-ink-3 mt-1.5">{subtitle}</p>}
      </div>

      {!hideSettings && (
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", damping: 22, stiffness: 280 }}
        >
          <Link
            to="/reglages"
            aria-label="Réglages"
            className="flex items-center justify-center w-9 h-9 rounded-full border border-paper-3 text-ink-2 hover:text-ink hover:border-ink-3 transition-colors"
          >
            <SettingsIcon />
          </Link>
        </motion.div>
      )}
    </header>
  );
}

function SettingsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-[18px] h-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  );
}
