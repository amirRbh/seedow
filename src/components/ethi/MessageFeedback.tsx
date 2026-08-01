import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

/**
 * Feedback discret 👍 / 👎 sous une réponse d'Ethi. Le retour est stocké
 * localement (pas de backend requis pour la bêta) sous `seedow_ethi_feedback`,
 * un tableau d'entrées horodatées, une par message noté.
 *
 * Rendu sur fond sombre (le chat Ethi) : tons `paper` translucides.
 */
const STORAGE_KEY = "seedow_ethi_feedback";

type Vote = 1 | -1;

interface FeedbackEntry {
  messageId: string;
  feedback: Vote;
  timestamp: number;
}

function readFeedback(): FeedbackEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as FeedbackEntry[]) : [];
  } catch {
    return [];
  }
}

function writeFeedback(entries: FeedbackEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Stockage indisponible (mode privé strict, quota) : on ignore silencieusement.
  }
}

export function MessageFeedback({ messageId }: { messageId: string }) {
  const { t } = useTranslation();
  const [vote, setVote] = useState<Vote | null>(null);

  // Restaure un vote déjà donné pour ce message (persistance entre refresh).
  useEffect(() => {
    const existing = readFeedback().find((e) => e.messageId === messageId);
    setVote(existing?.feedback ?? null);
  }, [messageId]);

  const cast = (next: Vote) => {
    const value = vote === next ? null : next; // re-cliquer retire le vote
    setVote(value);
    const others = readFeedback().filter((e) => e.messageId !== messageId);
    if (value !== null) {
      others.push({ messageId, feedback: value, timestamp: Date.now() });
    }
    writeFeedback(others);
  };

  return (
    <div className="mt-1.5 flex items-center gap-1.5">
      <FeedbackButton
        active={vote === 1}
        label={t("ethi.feedback_helpful")}
        onClick={() => cast(1)}
      >
        <svg
          viewBox="0 0 24 24"
          className="w-[18px] h-[18px]"
          fill={vote === 1 ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M7 10v11" />
          <path d="M18 21H7V10l5-8a2 2 0 0 1 3 2l-1 5h4a2 2 0 0 1 2 2.3l-1.4 7A2 2 0 0 1 18 21Z" />
        </svg>
      </FeedbackButton>
      <FeedbackButton
        active={vote === -1}
        label={t("ethi.feedback_not_helpful")}
        onClick={() => cast(-1)}
      >
        <svg
          viewBox="0 0 24 24"
          className="w-[18px] h-[18px]"
          fill={vote === -1 ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M17 14V3" />
          <path d="M6 3h11v11l-5 8a2 2 0 0 1-3-2l1-5H6a2 2 0 0 1-2-2.3l1.4-7A2 2 0 0 1 6 3Z" />
        </svg>
      </FeedbackButton>
      {vote !== null && (
        <span className="ml-1 text-caption text-ink-3">{t("ethi.feedback_thanks")}</span>
      )}
    </div>
  );
}

function FeedbackButton({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn(
        "flex items-center justify-center w-7 h-7 rounded-full transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-paper/40",
        active ? "text-ink" : "text-ink-3 hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
