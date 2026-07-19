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
          <p className="text-tag text-paper/40 font-semibold mb-1.5 ml-1">
            {t("ethi.your_advisor")}
          </p>
        )}

        <div
          className={`rounded-2xl px-4 py-3 text-body-sm leading-relaxed ${
            isUser
              ? "bg-highlight-2 text-paper rounded-br-sm"
              : "bg-paper/10 text-paper border border-paper/10 rounded-bl-sm"
          }`}
        >
          {typing ? (
            <TypingDots />
          ) : isUser ? (
            <p className="whitespace-pre-wrap">{content}</p>
          ) : (
            <div className="space-y-1.5 [&_strong]:text-highlight-3 [&_p]:my-1 [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4">
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
          className="w-1.5 h-1.5 bg-paper/60 rounded-full"
        />
      ))}
    </div>
  );
}
