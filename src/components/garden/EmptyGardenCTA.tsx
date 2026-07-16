import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

export function EmptyGardenCTA({ userName }: { userName: string }) {
  const { t } = useTranslation();
  return (
    <div className="max-w-lg mx-auto px-8 pt-20 pb-32">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="mb-12"
      >
        <svg viewBox="0 0 200 60" className="w-full h-16" preserveAspectRatio="none">
          <line x1="0" y1="59" x2="200" y2="59" stroke="var(--paper-3)" strokeWidth="0.5" />
          <motion.path
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.4, ease: "easeOut", delay: 0.2 }}
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
            fill="var(--moss-1)"
          />
        </svg>
      </motion.div>

      <p className="text-tag uppercase tracking-[0.18em] text-ink-3 font-medium">
        {t("empty_garden.welcome", { name: userName })}
      </p>
      <h1 className="font-value text-3xl text-ink mt-2 leading-tight">{t("empty_garden.title")}</h1>
      <p className="text-sm text-ink-2 mt-4 max-w-md leading-relaxed">{t("empty_garden.desc")}</p>

      <div className="mt-10 flex items-center gap-4">
        <Link to="/onboarding" search={{ new: undefined }} className="btn-plant">
          {t("empty_garden.start")}
        </Link>
        <Link
          to="/discover"
          className="text-body-sm text-ink-3 hover:text-ink transition-colors underline-offset-4 hover:underline"
        >
          {t("empty_garden.explore")}
        </Link>
      </div>
    </div>
  );
}
