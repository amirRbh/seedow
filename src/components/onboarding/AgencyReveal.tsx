import { useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useLang } from "@/hooks/useLang";
import { useResolutions } from "@/hooks/useResolutions";
import { daysUntilClose } from "@/lib/vote/bloc";
import { pickAgencyTeaser } from "@/lib/vote/agency";
import { formatDate } from "@/lib/format";
import { EASE_REVEAL } from "@/lib/motion";

/**
 * Moment WOW de l'onboarding — « Ta voix ».
 *
 * Intervient APRÈS le questionnaire (jamais en première scène) et avant l'aperçu
 * d'allocation : on relie ce que l'utilisateur vient de choisir à une VRAIE
 * résolution d'assemblée générale, encore ouverte, sur laquelle il pourra peser.
 * Donnée publique, sourcée et datée (§1.2). Aucune sur-promesse : on dit « tu
 * auras une voix », pas « tu contrôles l'entreprise » (§1.3).
 *
 * Dégradation propre : si aucune résolution n'est ouverte (ou si le chargement
 * échoue), la scène s'auto-saute vers l'aperçu — jamais d'écran mort, jamais un
 * onboarding bloqué par une fonctionnalité annexe.
 */
export function AgencyReveal({
  causes,
  onContinue,
  onBack,
}: {
  causes: string[];
  onContinue: () => void;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  const { lang } = useLang();
  const { resolutions, loading, error } = useResolutions();

  const teaser = useMemo(() => pickAgencyTeaser(resolutions, causes), [resolutions, causes]);

  // Auto-saut si rien à montrer : on ne bloque jamais l'onboarding sur une
  // scène « bonus ». `skipped` garde l'appel unique (onContinue démonte la scène).
  const skipped = useRef(false);
  useEffect(() => {
    if (skipped.current) return;
    if (!loading && (error || !teaser)) {
      skipped.current = true;
      onContinue();
    }
  }, [loading, error, teaser, onContinue]);

  // Tant qu'on charge (ou qu'on s'apprête à sauter) : shimmer cohérent avec les
  // autres scènes de l'onboarding, plutôt qu'un flash de contenu.
  if (loading || !teaser) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-paper text-ink"
      >
        <div className="w-32 h-px bg-paper-3 relative mb-8 overflow-hidden">
          <motion.div
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-y-0 w-1/2 bg-ink"
          />
        </div>
        <p className="text-tag uppercase tracking-[0.18em] text-ink-3 font-medium">
          {t("onboarding.agency.loading")}
        </p>
      </motion.div>
    );
  }

  const { resolution } = teaser.item;
  const days = daysUntilClose(resolution.closesAt);
  const causeLabel =
    resolution.theme != null ? t(`onboarding.steps.values.${resolution.theme}`) : null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.35 }}
      className="min-h-screen flex flex-col"
    >
      <div className="flex items-center justify-between px-6 pt-6">
        <button
          onClick={onBack}
          className="w-11 h-11 rounded-full flex items-center justify-center text-ink-3 hover:text-ink transition-colors"
          aria-label={t("onboarding.step.back")}
        >
          <svg
            viewBox="0 0 24 24"
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
        <span className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="apple-live" />
          <span className="font-mono text-tag uppercase tracking-[0.14em] text-mint-ink">
            {t("onboarding.agency.eyebrow")}
          </span>
        </span>
      </div>

      <div className="px-6 pt-10 pb-40 max-w-md mx-auto w-full flex-1">
        <motion.h2
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, ease: EASE_REVEAL }}
          className="font-value text-3xl leading-tight text-ink"
        >
          {t("onboarding.agency.title")}
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, ease: EASE_REVEAL }}
          className="mt-3 text-body-sm text-ink-2 leading-relaxed"
        >
          {teaser.matchedCause && causeLabel
            ? t("onboarding.agency.subtitle_matched", { cause: causeLabel })
            : t("onboarding.agency.subtitle")}
        </motion.p>

        {/* La vraie résolution — carte sombre, donnée publique sourcée et datée. */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32, duration: 0.5, ease: EASE_REVEAL }}
          className="ink-section paper-grain ink-grain mt-6 overflow-hidden rounded-2xl p-5"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-tag uppercase tracking-[0.1em] text-paper/70">
              {resolution.company}
              {resolution.ticker ? ` · ${resolution.ticker}` : ""}
            </span>
            {days != null && (
              <span className="inline-flex items-center gap-1.5 font-mono text-tag uppercase tracking-[0.08em] text-mint-ink">
                <span aria-hidden="true" className="apple-live" />
                {days === 0 ? t("vote.status.last_day") : t("vote.status.days_left", { n: days })}
              </span>
            )}
          </div>

          <p className="mt-3 font-value text-lg leading-snug text-paper">{resolution.title}</p>

          {resolution.fundsStance && (
            <p className="mt-2 font-mono text-caption leading-relaxed text-paper/60">
              {resolution.fundsStance}
            </p>
          )}

          <p className="mt-4 border-t border-paper/15 pt-3 font-mono text-tag uppercase tracking-[0.06em] text-paper/50">
            {t("onboarding.agency.source", {
              source: resolution.sourceName,
              date: formatDate(resolution.meetingDate, lang),
            })}
          </p>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 text-body-sm text-ink-2 leading-relaxed"
        >
          {t("onboarding.agency.without_seedow")}
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.62 }}
          className="mt-4 font-value text-lg leading-snug text-ink"
        >
          {t("onboarding.agency.signature")}
        </motion.p>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-paper via-paper to-transparent">
        <div className="max-w-md mx-auto">
          <button
            onClick={onContinue}
            className="w-full h-14 rounded-full bg-ink text-paper font-semibold text-sm hover:opacity-90 transition-colors flex items-center justify-center gap-2"
          >
            {t("onboarding.agency.cta")}
            <svg
              viewBox="0 0 24 24"
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </motion.div>
  );
}
