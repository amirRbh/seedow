import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

export interface MilestoneBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  tier: "bronze" | "silver" | "gold";
}

export function BadgesCard({ badges }: { badges: MilestoneBadge[] }) {
  const { t } = useTranslation();
  const unlocked = badges.filter((b) => b.unlocked);
  const locked = badges.filter((b) => !b.unlocked);

  return (
    <div className="paper-card p-5">
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <p className="text-tag uppercase tracking-wider text-ink-3 font-semibold">
            {t("milestone_badges.milestones")}
          </p>
          <h3 className="font-value text-2xl text-ink mt-0.5">
            {t("milestone_badges.celebrated", { count: unlocked.length })}
          </h3>
        </div>
        <span className="text-xs text-ink-3">
          {unlocked.length} / {badges.length}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {unlocked.map((badge, i) => (
          <motion.div
            key={badge.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.06, type: "spring", damping: 14 }}
            className="flex flex-col items-center gap-1.5"
            title={badge.description}
          >
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${
                badge.tier === "gold"
                  ? "bg-solar-tint ring-1 ring-solar/40"
                  : badge.tier === "silver"
                    ? "bg-paper-2"
                    : "bg-highlight-5"
              }`}
            >
              {badge.icon}
            </div>
            <span className="text-tag text-ink-3 text-center line-clamp-2 leading-tight">
              {badge.name}
            </span>
          </motion.div>
        ))}

        {locked.slice(0, 8 - unlocked.length).map((badge) => (
          <div
            key={badge.id}
            className="flex flex-col items-center gap-1.5 opacity-30"
            title={t("milestone_badges.to_unlock", { desc: badge.description })}
          >
            <div className="w-12 h-12 rounded-full bg-paper-2 flex items-center justify-center text-xl grayscale">
              {badge.icon}
            </div>
            <span className="text-tag text-ink-3 text-center line-clamp-2 leading-tight">
              {badge.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
