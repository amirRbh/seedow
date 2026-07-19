import { useNavigate } from "@tanstack/react-router";
import { useLexicon } from "@/hooks/useLexicon";
import { useTranslation } from "react-i18next";
import { useLang } from "@/hooks/useLang";
import { formatCurrency } from "@/lib/format";

interface IntentCardsProps {
  wallet?: { balance: number; currency: string } | null;
}

export function IntentCards({ wallet }: IntentCardsProps) {
  const { t } = useTranslation();
  const { lang } = useLang();
  const navigate = useNavigate();
  const { L } = useLexicon();
  const balance = wallet?.balance ?? 0;
  const currency = wallet?.currency ?? "EUR";

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-tag uppercase tracking-wider text-ink-3 font-semibold">
          {t("intent_cards.what_to_do")}
        </p>
        <p className="text-caption text-ink-3">
          {t("intent_cards.available_balance")}{" "}
          <span className="text-ink font-semibold">{formatCurrency(balance, lang)}</span>
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <IntentCard
          label={L.actions.invest}
          hint={t("intent_cards.invest_hint")}
          variant="primary"
          onClick={() => navigate({ to: "/discover" })}
          icon={
            <svg
              viewBox="0 0 24 24"
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22V12" />
              <path d="M12 12c0-4 3-7 7-7 0 4-3 7-7 7Z" />
              <path d="M12 12c0-3-2-5-5-5 0 3 2 5 5 5Z" />
            </svg>
          }
        />
        <IntentCard
          label={L.actions.deposit}
          hint={t("intent_cards.deposit_hint")}
          variant="muted"
          onClick={() => navigate({ to: "/discover" })}
          icon={
            <svg
              viewBox="0 0 24 24"
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3c-4 6-7 9-7 13a7 7 0 0 0 14 0c0-4-3-7-7-13Z" />
            </svg>
          }
        />
        <IntentCard
          label={L.actions.rebalance}
          hint={t("intent_cards.rebalance_hint")}
          variant="ethi"
          onClick={() => navigate({ to: "/ethi", search: { intent: "rebalance" } as never })}
          icon={
            <svg
              viewBox="0 0 24 24"
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 12a8 8 0 0 1-11.5 7.2L4 21l1.8-5.5A8 8 0 1 1 21 12Z" />
            </svg>
          }
        />
      </div>
    </div>
  );
}

function IntentCard({
  label,
  hint,
  variant,
  icon,
  onClick,
}: {
  label: string;
  hint: string;
  variant: "primary" | "muted" | "ethi";
  icon: React.ReactNode;
  onClick: () => void;
}) {
  const styles =
    variant === "primary"
      ? "bg-highlight-1 text-paper hover:bg-highlight-2"
      : variant === "ethi"
        ? "bg-ink text-paper hover:bg-highlight-2"
        : "bg-card border border-paper-3 text-ink hover:border-highlight-3 hover:bg-highlight-5";

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-start gap-1.5 p-3.5 rounded-2xl transition-all hover-border ${styles}`}
    >
      <div className="opacity-90">{icon}</div>
      <span className="text-sm font-semibold leading-tight">{label}</span>
      <span className="text-tag opacity-60 leading-tight">{hint}</span>
    </button>
  );
}
