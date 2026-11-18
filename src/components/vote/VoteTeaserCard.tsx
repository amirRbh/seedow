import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useResolutions, useMyVotes } from "@/hooks/useResolutions";
import { soonestClosingOpen, daysUntilClose } from "@/lib/vote/bloc";
import { useLang } from "@/hooks/useLang";

/**
 * Teaser « un vote arrive » sur le dashboard — point d'entrée mobile vers Le
 * Vote (le bottom-nav est plein). Met en avant la résolution ouverte qui clôt
 * le plus tôt ; ne rend rien s'il n'y en a aucune (jamais d'écran mort).
 */
export function VoteTeaserCard() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const { resolutions, loading } = useResolutions();
  const myVotes = useMyVotes();

  const featured = useMemo(() => {
    const soonest = soonestClosingOpen(resolutions.map((r) => r.resolution));
    if (!soonest) return null;
    return resolutions.find((r) => r.resolution.id === soonest.id) ?? null;
  }, [resolutions]);

  if (loading || !featured) return null;

  const { resolution, bloc } = featured;
  const days = daysUntilClose(resolution.closesAt);
  const nf = new Intl.NumberFormat(lang === "en" ? "en-US" : "fr-FR");
  const voted = myVotes[resolution.id] ?? null;

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4 }}
      className="px-5 pt-8"
    >
      <Link
        to="/vote/$resolutionId"
        params={{ resolutionId: resolution.id }}
        className="ink-section group block overflow-hidden rounded-2xl p-5 transition-transform duration-300 hover:scale-[1.01]"
        style={{ transitionTimingFunction: "cubic-bezier(0.32,0.72,0,1)" }}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2">
            <span aria-hidden="true" className="live-dot" />
            <span className="text-caption font-semibold text-mint-ink">
              {t("vote.teaser.eyebrow")}
            </span>
          </span>
          <span className="text-caption font-semibold text-ink-2">
            {days === 0
              ? t("vote.status.last_day")
              : days != null
                ? t("vote.status.days_left", { n: days })
                : null}
          </span>
        </div>

        <p className="mt-3 font-value text-lg leading-snug text-on-deep">{resolution.title}</p>
        <p className="mt-1 text-caption text-ink-3">
          {resolution.company}
          {resolution.ticker ? ` · ${resolution.ticker}` : ""}
        </p>

        <div className="mt-4 flex items-center justify-between border-t border-on-deep/15 pt-3">
          <span className="text-caption text-ink-2 tabular-nums">
            {bloc.total === 0
              ? t("vote.teaser.be_first")
              : t("vote.teaser.bloc_count", { formatted: nf.format(bloc.total) })}
          </span>
          <span className="text-caption font-semibold text-mint-ink">
            {voted ? t("vote.teaser.cta_voted") : t("vote.teaser.cta")}
            <span
              aria-hidden="true"
              className="ml-1 inline-block transition-transform group-hover:translate-x-0.5"
            >
              →
            </span>
          </span>
        </div>
      </Link>
    </motion.section>
  );
}
