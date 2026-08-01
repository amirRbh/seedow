import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useActivePortfolio } from "@/hooks/useActivePortfolio";
import { useReveil } from "@/hooks/useReveil";
import { isIntroDone } from "@/lib/intro";
import { pickNextAction } from "@/components/dashboard/nextAction";
import { NextStepCard } from "@/components/dashboard/NextStepCard";
import { LearnIntroCard } from "@/components/dashboard/LearnIntroCard";

/**
 * L'action du jour — bloc 1 du dashboard (audit .lovable/plan.md §11) :
 * UNE seule carte, choisie par une priorité déterministe et pure
 * (`pickNextAction`) sur l'état réel de l'utilisateur, au lieu d'empiler 9
 * modules au même niveau.
 */
export function ActionOfTheDayCard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { portfolio } = useActivePortfolio();
  const { dispatches } = useReveil();

  const action = useMemo(() => {
    const meta = user?.user_metadata as { display_name?: string; full_name?: string } | undefined;
    const profileIncomplete = !(meta?.display_name?.trim() || meta?.full_name?.trim());

    const ownedIds = new Set((portfolio?.holdings ?? []).map((h) => h.id));
    const gw = dispatches.find(
      (d) => d.tone === "caution" && d.action?.kind === "asset" && ownedIds.has(d.action.assetId),
    );
    const greenwashingAlert =
      gw && gw.action?.kind === "asset" ? { assetId: gw.action.assetId, company: gw.company } : null;

    const portfolioEmpty = !portfolio || portfolio.holdings.length === 0;

    return pickNextAction({
      profileIncomplete,
      greenwashingAlert,
      portfolioEmpty,
      introDone: isIntroDone(),
    });
  }, [user, portfolio, dispatches]);

  if (action.kind === "complete_profile") {
    return (
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-5 pt-6"
      >
        <div className="rounded-[14px] bg-paper-2 border border-paper-3 p-4 flex items-center gap-3">
          <p className="flex-1 text-body-sm text-ink-2 leading-snug">
            {t("dashboard.action_of_day.complete_profile.text")}
          </p>
          <Link
            to="/profil"
            className="flex-shrink-0 px-3.5 py-1.5 text-label font-medium rounded-full border border-ink hover:bg-ink hover:text-paper transition-colors"
          >
            {t("dashboard.action_of_day.complete_profile.cta")}
          </Link>
        </div>
      </motion.section>
    );
  }

  if (action.kind === "greenwashing_alert") {
    return (
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-5 pt-6"
      >
        <Link
          to="/discover"
          className="block rounded-2xl border border-solar/40 bg-solar-tint p-4 transition-colors hover:border-solar/70"
        >
          <p className="font-mono text-tag uppercase tracking-[0.14em] text-solar">
            {t("dashboard.action_of_day.greenwashing.eyebrow")}
          </p>
          <p className="mt-2 text-body-sm text-ink leading-snug">
            {t("dashboard.action_of_day.greenwashing.text", { company: action.company })}
          </p>
          <span className="mt-3 inline-flex items-center gap-1 font-mono text-tag uppercase tracking-[0.12em] text-ink">
            {t("dashboard.action_of_day.greenwashing.cta")} →
          </span>
        </Link>
      </motion.section>
    );
  }

  if (action.kind === "start_course") {
    return <LearnIntroCard />;
  }

  // "empty_portfolio" et "default" : la logique existante de NextStepCard
  // couvre déjà honnêtement ces deux cas (premier investissement, objectif
  // proche, ou briefing Ethi).
  return <NextStepCard />;
}
