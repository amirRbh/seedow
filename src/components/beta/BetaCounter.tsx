import { useTranslation } from "react-i18next";
import { useBetaCapacity } from "@/hooks/useBetaCapacity";

export function BetaCounter({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  const { capacity, loading } = useBetaCapacity();
  if (loading || !capacity) {
    return (
      <span className={`text-tag uppercase tracking-[0.22em] text-ink-3 ${className}`}>
        {t("beta.counter_loading")}
      </span>
    );
  }
  const pct = Math.min(100, Math.round((capacity.slotsTaken / capacity.cap) * 100));
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div className="flex items-center justify-between gap-3 text-tag uppercase tracking-[0.22em] text-ink-2">
        <span>{t("beta.counter_label")}</span>
        <span className="font-semibold text-ink">
          {t("beta.counter_taken", { taken: capacity.slotsTaken, cap: capacity.cap })}
        </span>
      </div>
      <div className="h-1 bg-paper-3 overflow-hidden rounded-full">
        <div className="h-full bg-gold transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
