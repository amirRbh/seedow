import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useLang } from "@/hooks/useLang";
import { formatPercentPoints } from "@/lib/format";
import {
  portfolioGlance,
  type GlanceMetrics,
  type RiskLevel,
} from "@/lib/portfolio/plain-language";

/**
 * Coup d'œil « glanceable » de l'Accueil (refonte mobile §5/§24) : les trois
 * lectures que l'utilisateur doit saisir en moins de 5 secondes, sans scroller —
 * Performance, Impact, Risque. Chaque tuile est tactile et mène directement au
 * détail concerné (drill-down §13), au lieu d'empiler le détail sous le pli.
 */
export function HomeGlance({
  metrics,
  returnPct,
}: {
  metrics: GlanceMetrics | null | undefined;
  returnPct: number;
}) {
  const { t } = useTranslation();
  const { lang } = useLang();
  const glance = portfolioGlance(metrics);

  const perfPositive = returnPct >= 0;
  const perfValue = `${perfPositive ? "+" : ""}${formatPercentPoints(returnPct, lang, 1)}`;

  return (
    <div className="grid grid-cols-3 gap-3">
      <GlanceTile
        to="/portfolio"
        label={t("home_glance.performance")}
        value={perfValue}
        tone={perfPositive ? "mint" : "alert"}
      />
      <GlanceTile
        to="/portfolio"
        search={{ tab: "impact" }}
        label={t("home_glance.impact")}
        value={glance.impact ? `${glance.impact.score}` : "—"}
        suffix={glance.impact ? "/100" : undefined}
        tone="mint"
      />
      <GlanceTile
        to="/portfolio"
        search={{ tab: "impact" }}
        label={t("home_glance.risk")}
        value={glance.risk ? t(`portfolio_glance.risk.${glance.risk.level}`) : "—"}
        scale={glance.risk ? riskDots(glance.risk.level) : undefined}
      />
    </div>
  );
}

function GlanceTile({
  to,
  search,
  label,
  value,
  suffix,
  tone,
  scale,
}: {
  to: string;
  search?: Record<string, unknown>;
  label: string;
  value: string;
  suffix?: string;
  tone?: "mint" | "alert";
  scale?: number; // 1..3
}) {
  const valueColor =
    tone === "mint" ? "text-mint-ink" : tone === "alert" ? "text-alert-ink" : "text-ink";
  return (
    <Link
      to={to}
      search={search}
      className="paper-card flex flex-col justify-between px-4 py-4 min-h-[92px] transition-colors hover:bg-paper-inset outline-none focus-visible:ring-2 focus-visible:ring-ink"
    >
      <span className="stamp leading-none">{label}</span>
      <span className={`mt-3 font-value text-[24px] leading-none ${valueColor}`}>
        {value}
        {suffix && <span className="text-caption text-ink-3 ml-0.5">{suffix}</span>}
      </span>
      {typeof scale === "number" && (
        <span className="mt-1.5 flex gap-1" aria-hidden>
          {[1, 2, 3].map((n) => (
            <span key={n} className={`h-[3px] flex-1 ${n <= scale ? "bg-ink" : "bg-paper-3"}`} />
          ))}
        </span>
      )}
    </Link>
  );
}

function riskDots(level: RiskLevel): number {
  return level === "prudent" ? 1 : level === "modere" ? 2 : 3;
}
