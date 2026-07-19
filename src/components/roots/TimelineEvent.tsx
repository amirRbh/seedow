import { motion } from "framer-motion";

type EventType = "gain" | "deposit" | "withdrawal" | "opening";
type BadgeVariant = "gain" | "loss" | "deposit" | "withdrawal" | "opening";

interface TimelineEventProps {
  type: EventType;
  title: string;
  subtitle?: string;
  badge?: string;
  badgeVariant?: BadgeVariant;
  impactChips?: string[];
}

export function TimelineEvent({
  type,
  title,
  subtitle,
  badge,
  badgeVariant = "gain",
  impactChips,
}: TimelineEventProps) {
  const dotColor = {
    gain: "bg-highlight-1",
    deposit: "bg-highlight-2",
    withdrawal: "bg-gold",
    opening: "bg-ink-3",
  }[type];
  const badgeStyles = {
    gain: "bg-highlight-5 text-highlight-1",
    loss: "bg-[oklch(0.93_0.05_45)] text-rust",
    deposit: "bg-highlight-5 text-highlight-1",
    withdrawal: "bg-[oklch(0.93_0.06_85)] text-gold",
    opening: "bg-paper-2 text-ink-3",
  }[badgeVariant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3.5 pb-3"
    >
      <div className="flex flex-col items-center w-7 flex-shrink-0">
        <div className={`w-2.5 h-2.5 rounded-full mt-1.5 ${dotColor} ring-2 ring-paper`} />
        <div className="w-[2px] flex-1 bg-paper-3 mt-1 min-h-[24px]" />
      </div>

      <div className="flex-1 paper-card p-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink truncate">{title}</p>
            {subtitle && <p className="text-xs text-ink-3 mt-0.5">{subtitle}</p>}
          </div>
          {badge && (
            <span
              className={`inline-flex items-center text-tag font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${badgeStyles}`}
            >
              {badge}
            </span>
          )}
        </div>

        {impactChips && impactChips.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {impactChips.map((chip) => (
              <span
                key={chip}
                className="text-tag bg-highlight-5 text-highlight-1 font-semibold px-2 py-0.5 rounded-full"
              >
                {chip}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
