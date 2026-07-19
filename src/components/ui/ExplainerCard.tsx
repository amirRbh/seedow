import { useEffect, useState } from "react";

interface Props {
  title?: string;
  children: React.ReactNode;
  tone?: "highlight" | "bloom" | "peach" | "sky";
  /** Si fourni, l'encart peut être dismissé et l'état stocké en localStorage. */
  dismissKey?: string;
}

const TONE_BG: Record<NonNullable<Props["tone"]>, string> = {
  highlight: "bg-highlight-5 border-highlight-4",
  bloom: "bg-bloom-tint border-bloom-tint-border",
  peach: "bg-alert-tint border-alert-tint-border",
  sky: "bg-sky-tint border-sky-tint-border",
};

const TONE_DOT: Record<NonNullable<Props["tone"]>, string> = {
  highlight: "bg-highlight-1",
  bloom: "bg-bloom",
  peach: "bg-rust",
  sky: "bg-sky",
};

const STORAGE_PREFIX = "seedow:explainers-dismissed:";

/**
 * Petit encart pédagogique pour expliquer un concept en une phrase.
 * Si `dismissKey` est fourni, un bouton ✕ permet de masquer définitivement.
 */
export function ExplainerCard({ title, children, tone = "highlight", dismissKey }: Props) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!dismissKey) return;
    try {
      setDismissed(localStorage.getItem(STORAGE_PREFIX + dismissKey) === "1");
    } catch {
      // ignore
    }
  }, [dismissKey]);

  if (dismissed) return null;

  const onDismiss = () => {
    if (!dismissKey) return;
    setDismissed(true);
    try {
      localStorage.setItem(STORAGE_PREFIX + dismissKey, "1");
    } catch {
      // ignore
    }
  };

  return (
    <div className={`rounded-xl border p-3 relative ${TONE_BG[tone]}`}>
      <div className="flex items-start gap-2 pr-5">
        <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${TONE_DOT[tone]}`} />
        <div className="text-label text-ink-2 leading-relaxed">
          {title && <span className="font-semibold text-ink">{title} </span>}
          {children}
        </div>
      </div>
      {dismissKey && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Masquer cette aide"
          className="absolute top-1.5 right-1.5 w-6 h-6 flex items-center justify-center text-ink-3 hover:text-ink rounded-full hover:bg-paper/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight-1"
        >
          <svg
            viewBox="0 0 16 16"
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>
      )}
    </div>
  );
}
