import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { parseEthiActions, EthiActions } from "./EthiActions";
import { useTranslation } from "react-i18next";
import { EASE_SIGNATURE } from "@/lib/motion";

interface EthiBubbleProps {
  role: "user" | "assistant";
  content: string;
  typing?: boolean;
}

export function EthiBubble({ role, content, typing }: EthiBubbleProps) {
  const { t } = useTranslation();
  const isUser = role === "user";
  const parsed = !isUser && !typing ? parseEthiActions(content) : null;
  const displayContent = parsed?.cleaned ?? content;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: EASE_SIGNATURE }}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div className={`max-w-[85%] ${isUser ? "ml-auto" : "w-full"}`}>
        {!isUser && (
          <p className="mb-1.5 ml-1 flex items-center gap-1.5 text-caption font-semibold text-ink-3">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-mint" />
            {t("ethi.your_advisor")}
          </p>
        )}

        <div
          className={`rounded-[22px] px-4 py-3 text-body leading-relaxed ${
            isUser
              ? "rounded-br-md bg-ink text-paper"
              : "rounded-bl-md bg-paper text-ink shadow-card"
          }`}
        >
          {typing ? (
            <TypingDots />
          ) : isUser ? (
            <p className="whitespace-pre-wrap">{content}</p>
          ) : (
            <div className="space-y-1.5 [&_strong]:font-bold [&_strong]:text-ink [&_p]:my-1 [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4">
              <ReactMarkdown>{displayContent}</ReactMarkdown>
            </div>
          )}
        </div>

        {parsed && parsed.actions.length > 0 && <EthiActions actions={parsed.actions} />}
      </div>
    </motion.div>
  );
}

function TypingDots() {
  return (
    <div className="flex gap-1 items-center py-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          animate={{ y: [0, -4, 0], opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
          className="w-1.5 h-1.5 bg-ink-3 rounded-full"
        />
      ))}
    </div>
  );
}
