import { Link } from "@tanstack/react-router";
import { RevealGroup } from "@/components/motion/Reveal";
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
    <div className="page accent-mint px-5 pt-10 md:pt-14">
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
            stroke="var(--mint)"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <motion.circle
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4 }}
            cx="200"
            cy="8"
            r="3"
            fill="var(--mint)"
          />
        </svg>
      </motion.div>

      <span className="chip chip--accent">{t("empty_portfolio.welcome", { name: userName })}</span>
      <h1 className="display-lg mt-4">{t("empty_portfolio.title")}</h1>
      <p className="mt-4 max-w-[52ch] text-body-lg leading-relaxed text-ink-2">
        {t("empty_portfolio.choose_desc")}
      </p>

      <RevealGroup className="mt-8 grid gap-4 md:grid-cols-2">
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
      </RevealGroup>

      <div className="mt-6">
        <Link
          to="/discover"
          className="link-u inline-flex items-center gap-1.5 text-body font-semibold text-ink-2 hover:text-ink"
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
  mint: { dot: "accent-mint", cta: "text-mint-ink" },
  ice: { dot: "accent-ice", cta: "text-ice-ink" },
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
      className={`${a.dot} paper-card spot lift group flex min-h-[200px] flex-col p-6 outline-none focus-visible:ring-2 focus-visible:ring-mint sm:p-7`}
    >
      <span className="chip chip--accent w-fit">{eyebrow}</span>
      <h2 className="mt-4 text-[clamp(20px,2.2vw,24px)]">{title}</h2>
      <p className="mt-2 text-body leading-relaxed text-ink-2">{desc}</p>
      <span
        className={`mt-auto inline-flex items-center gap-1.5 pt-6 text-body font-bold ${a.cta}`}
      >
        {cta}
        <span
          aria-hidden
          className="transition-transform duration-300 ease-brand group-hover:translate-x-1.5"
        >
          →
        </span>
      </span>
    </Link>
  );
}
