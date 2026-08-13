import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { EASE_REVEAL } from "@/lib/motion";

/**
 * État vide du portefeuille — deux intentions explicites (analyse UX §15).
 *
 * Un néophyte et quelqu'un qui investit déjà n'arrivent pas ici avec le même
 * besoin : le premier veut découvrir/simuler sans risque, le second veut
 * analyser ce qu'il détient déjà. On ne devine pas — on pose le choix, chaque
 * carte menant à une suite claire (§17). La connexion bancaire automatique
 * n'est volontairement PAS le point de départ : elle est annoncée pour plus
 * tard, en bas, pour ne pas transformer l'entrée en démarche bancaire.
 */
export function EmptyPortfolioState({ userName }: { userName: string }) {
  const { t } = useTranslation();
  return (
    <div className="max-w-lg mx-auto px-6 pt-16 pb-32">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="mb-10"
      >
        <svg viewBox="0 0 200 60" className="w-full h-16" preserveAspectRatio="none">
          <line x1="0" y1="59" x2="200" y2="59" stroke="var(--paper-3)" strokeWidth="0.5" />
          <motion.path
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.4, ease: EASE_REVEAL, delay: 0.2 }}
            d="M 0 50 L 40 46 L 80 38 L 120 30 L 160 18 L 200 8"
            stroke="var(--ink)"
            strokeWidth="1"
            fill="none"
          />
          <motion.circle
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4 }}
            cx="200"
            cy="8"
            r="2"
            fill="var(--highlight-1)"
          />
        </svg>
      </motion.div>

      <p className="text-tag uppercase tracking-[0.18em] text-ink-3 font-medium">
        {t("empty_portfolio.welcome", { name: userName })}
      </p>
      <h1 className="font-value text-3xl text-ink mt-2 leading-tight">
        {t("empty_portfolio.title")}
      </h1>
      <p className="text-sm text-ink-2 mt-3 max-w-md leading-relaxed">
        {t("empty_portfolio.choose_desc")}
      </p>

      <div className="mt-8 space-y-3">
        <IntentCard
          accent="mint"
          eyebrow={t("empty_portfolio.beginner_eyebrow")}
          title={t("empty_portfolio.beginner_title")}
          desc={t("empty_portfolio.beginner_desc")}
          cta={t("empty_portfolio.beginner_cta")}
          to="/onboarding"
          search={{ new: undefined }}
        />
        <IntentCard
          accent="ice"
          eyebrow={t("empty_portfolio.existing_eyebrow")}
          title={t("empty_portfolio.existing_title")}
          desc={t("empty_portfolio.existing_desc")}
          cta={t("empty_portfolio.existing_cta")}
          to="/construire"
        />
      </div>

      <div className="mt-6">
        <Link
          to="/discover"
          className="inline-flex items-center gap-1.5 text-body-sm text-ink-3 hover:text-ink transition-colors underline-offset-4 hover:underline"
        >
          {t("empty_portfolio.explore")}
          <span aria-hidden>→</span>
        </Link>
      </div>

      {/* La connexion automatique des comptes viendra plus tard — jamais l'entrée. */}
      <p className="mt-10 flex items-center gap-2 text-caption text-ink-3 leading-relaxed">
        <span
          aria-hidden
          className="inline-block h-1.5 w-1.5 rounded-full bg-paper-3 flex-shrink-0"
        />
        {t("empty_portfolio.bank_soon")}
      </p>
    </div>
  );
}

const ACCENT: Record<"mint" | "ice", { dot: string; cta: string }> = {
  mint: { dot: "bg-mint", cta: "text-mint" },
  ice: { dot: "bg-ice", cta: "text-ice" },
};

function IntentCard({
  accent,
  eyebrow,
  title,
  desc,
  cta,
  to,
  search,
}: {
  accent: "mint" | "ice";
  eyebrow: string;
  title: string;
  desc: string;
  cta: string;
  to: string;
  search?: Record<string, unknown>;
}) {
  const a = ACCENT[accent];
  return (
    <Link
      to={to}
      search={search}
      className="group flex flex-col rounded-2xl border border-paper-3 bg-paper-2/40 p-5 min-h-[132px] transition-all duration-200 hover:-translate-y-0.5 hover:border-ink/30 outline-none focus-visible:ring-2 focus-visible:ring-highlight-1"
    >
      <span className="inline-flex items-center gap-2 text-tag uppercase tracking-[0.16em] font-semibold text-ink-3">
        <span aria-hidden className={`inline-block h-1.5 w-1.5 rounded-full ${a.dot}`} />
        {eyebrow}
      </span>
      <h2 className="mt-2.5 font-value text-lg text-ink leading-tight">{title}</h2>
      <p className="mt-1.5 text-body-sm text-ink-2 leading-relaxed">{desc}</p>
      <span
        className={`mt-auto pt-4 inline-flex items-center gap-1 text-body-sm font-semibold ${a.cta}`}
      >
        {cta}
        <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-0.5">
          ›
        </span>
      </span>
    </Link>
  );
}
