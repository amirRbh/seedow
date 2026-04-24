import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useViewMode } from "@/hooks/useViewMode";
import { PortfolioSelector } from "@/components/garden/PortfolioSelector";


interface AppHeaderProps {
  /** Petit éyebrow au-dessus du titre */
  eyebrow?: string;
  /** Titre principal */
  title: string;
  /** Sous-titre optionnel */
  subtitle?: string;
  /** Si vrai, masque le bouton réglages (utile sur la page réglages elle-même) */
  hideSettings?: boolean;
  /** Si vrai, masque le toggle Simple/Expert */
  hideViewToggle?: boolean;
  /** Si vrai, affiche le sélecteur de jardin (multi-portefeuilles). */
  showPortfolioSelector?: boolean;
}

/**
 * Header commun aux pages principales.
 * Affiche un titre, un toggle Simple/Expert et un bouton réglages.
 */
export function AppHeader({
  eyebrow,
  title,
  subtitle,
  hideSettings = false,
  hideViewToggle = false,
  showPortfolioSelector = false,
}: AppHeaderProps) {
  return (
    <header className="px-5 pt-6 pb-4">
      <Link to="/dashboard" aria-label="Seedow — Accueil" className="inline-flex items-center mb-3">
        <span className="font-value text-lg text-ink tracking-tight">seedow</span>
      </Link>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <p className="text-[11px] uppercase tracking-wider text-ink-3 font-medium">{eyebrow}</p>
          )}
          <h1 className="font-value text-3xl text-ink mt-0.5 truncate">{title}</h1>
          {subtitle && <p className="text-sm text-ink-3 mt-1.5">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 mt-1">
          {!hideViewToggle && <ViewModeToggle />}
          {!hideSettings && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", damping: 22, stiffness: 280 }}
            >
              <Link
                to="/reglages"
                aria-label="Réglages"
                className="flex items-center justify-center w-9 h-9 rounded-full border border-paper-3 text-ink-2 hover:text-ink hover:border-moss-2 transition-colors"
              >
                <SettingsIcon />
              </Link>
            </motion.div>
          )}
        </div>
      </div>

      {showPortfolioSelector && (
        <div className="mt-3">
          <PortfolioSelector />
        </div>
      )}
    </header>
  );
}

function ViewModeToggle() {
  const { mode, setMode } = useViewMode();
  return (
    <div
      role="group"
      aria-label="Niveau de détail"
      className="inline-flex items-center h-7 p-0.5 rounded-full border border-paper-3 bg-paper-2"
    >
      <button
        type="button"
        onClick={() => setMode("simple")}
        aria-pressed={mode === "simple"}
        className={`px-2.5 h-6 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
          mode === "simple"
            ? "bg-moss-1 text-paper shadow-leaf"
            : "text-ink-3 hover:text-ink"
        }`}
      >
        Simple
      </button>
      <button
        type="button"
        onClick={() => setMode("expert")}
        aria-pressed={mode === "expert"}
        className={`px-2.5 h-6 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
          mode === "expert"
            ? "bg-bloom text-paper shadow-leaf"
            : "text-ink-3 hover:text-ink"
        }`}
        style={mode === "expert" ? { backgroundColor: "var(--bloom)" } : undefined}
      >
        Expert
      </button>
    </div>
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
