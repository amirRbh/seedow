import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { isIntroDone, markIntroDone } from "@/lib/intro";

/**
 * Carte d'accueil néophyte sur le dashboard — invite à l'onboarding pédagogique
 * (/comprendre), dismissible en un clic. Ne s'affiche que tant que l'intro n'a
 * pas été terminée ou passée. Lecture localStorage après montage : rien n'est
 * rendu côté serveur, ce qui évite tout écart d'hydratation et tout flash.
 */
export function LearnIntroCard() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isIntroDone()) setVisible(true);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    markIntroDone();
    setVisible(false);
  };

  return (
    <div className="mx-5 mt-4 relative bg-ink text-paper ink-grain rounded-xl p-4 pr-10">
      <button
        type="button"
        onClick={dismiss}
        aria-label={t("learn_intro.dismiss")}
        className="absolute top-2.5 right-2.5 w-7 h-7 flex items-center justify-center rounded-full text-paper/60 hover:text-paper hover:bg-paper/10 transition-colors"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>

      <p className="text-tag font-semibold uppercase tracking-[0.2em] text-gold mb-1">
        {t("learn_intro.eyebrow")}
      </p>
      <p className="text-body-sm text-paper/85 leading-snug mb-3">{t("learn_intro.body")}</p>
      <Link
        to="/comprendre"
        className="inline-flex items-center gap-1.5 bg-gold text-ink px-4 py-2 text-tag font-semibold uppercase tracking-[0.18em] hover:bg-gold/90 transition-colors rounded"
      >
        {t("learn_intro.cta")}
        <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}
