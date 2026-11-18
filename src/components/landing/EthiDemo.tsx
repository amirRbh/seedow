import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useInView } from "@/hooks/useInView";
import { cn } from "@/lib/utils";

/**
 * Démonstration d'un échange avec Ethi — la conversation se joue quand elle
 * entre à l'écran : la question arrive, Ethi « écrit », la réponse se pose.
 *
 * ── Ce que dit l'exemple (CLAUDE.md §5) ────────────────────────────────────
 *
 * L'ancien exemple faisait dire à Ethi « je peux te proposer 3 alternatives,
 * avec un score climat supérieur » : une recommandation individualisée, sur la
 * page d'accueil d'un assistant dont la promesse est de ne jamais en faire —
 * et adossée à un score que le produit ne publie plus. L'échange montre
 * maintenant ce qu'Ethi fait réellement : expliquer un mécanisme, dire où lire
 * la donnée, et laisser la décision à la personne.
 *
 * Accessibilité : les quatre messages sont dans le DOM dès le départ pour les
 * lecteurs d'écran ; seule leur apparition visuelle est différée. En mouvement
 * réduit, tout est affiché d'emblée.
 */
type Turn = { who: "user" | "ethi"; text: string };

export function EthiDemo() {
  const { t } = useTranslation();
  const { ref, inView } = useInView<HTMLDivElement>("0px 0px -20% 0px");

  const turns: Turn[] = [
    { who: "user", text: t("landing.v5.ethi.q1") },
    { who: "ethi", text: t("landing.v5.ethi.a1") },
    { who: "user", text: t("landing.v5.ethi.q2") },
    { who: "ethi", text: t("landing.v5.ethi.a2") },
  ];

  // `shown` = nombre de messages posés ; `typing` = Ethi écrit le suivant.
  const [shown, setShown] = useState(0);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    if (!inView) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(4);
      return;
    }
    const timers: number[] = [];
    const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
    at(250, () => setShown(1));
    at(900, () => setTyping(true));
    at(2100, () => {
      setTyping(false);
      setShown(2);
    });
    at(3300, () => setShown(3));
    at(3950, () => setTyping(true));
    at(5300, () => {
      setTyping(false);
      setShown(4);
    });
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [inView]);

  return (
    <div ref={ref} className="paper-card overflow-hidden">
      <div className="flex items-center gap-3 border-b border-paper-3 px-6 py-4">
        <span className="icon-badge">
          <MessageCircle aria-hidden />
        </span>
        <div>
          <p className="text-body font-bold text-ink">Ethi</p>
          <p className="text-caption text-ink-3">{t("landing.ethi.example_label")}</p>
        </div>
        <span className="chip chip--verified ml-auto">
          <span aria-hidden className="live-dot" />
          {t("landing.v5.ethi.badge")}
        </span>
      </div>

      <div className="flex min-h-[380px] flex-col gap-3 px-5 py-6 sm:px-6">
        {turns.map((turn, i) => {
          const visible = i < shown;
          const isUser = turn.who === "user";
          return (
            <div
              key={i}
              className={cn(
                "flex flex-col transition-[opacity,transform] duration-500 ease-brand motion-reduce:transition-none",
                isUser ? "items-end" : "items-start",
                visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
              )}
            >
              <span className="sr-only">{isUser ? t("landing.ethi.speaker_you") : "Ethi"} :</span>
              <p
                className={cn(
                  "max-w-[88%] px-4 py-3 text-body leading-relaxed",
                  isUser
                    ? "rounded-[20px] rounded-br-md bg-ink text-paper"
                    : "rounded-[20px] rounded-bl-md bg-paper-2 text-ink",
                )}
              >
                {turn.text}
              </p>
            </div>
          );
        })}

        <div
          aria-hidden
          className={cn(
            "flex h-10 w-16 items-center justify-center rounded-[20px] rounded-bl-md bg-paper-2 transition-opacity duration-300",
            typing ? "opacity-100" : "opacity-0",
          )}
        >
          <span className="typing-dots">
            <i />
            <i />
            <i />
          </span>
        </div>
      </div>
    </div>
  );
}
