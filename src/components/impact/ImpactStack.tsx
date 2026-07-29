import { motion } from "framer-motion";
import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useActivePortfolio } from "@/hooks/useActivePortfolio";
import { usePortfolioValuation } from "@/hooks/usePortfolioValuation";
import { useLang } from "@/hooks/useLang";
import { EASE_REVEAL } from "@/lib/motion";
import { buildPortfolioImpact } from "@/lib/impact/portfolioImpact";
import { ACWI_WACI_SOURCE, ACWI_WACI_ASOF } from "@/lib/esg/benchmark";

/**
 * ImpactStack — version compacte inline.
 * Une seule ligne éditoriale de 3 KPI, uniquement à partir de données réelles
 * (score ESG du moteur, WACI vs ACWI si couvert, couverture des données).
 * Aucune équivalence estimée, aucune extrapolation depuis le capital simulé.
 * Fallback honnête : em-dash + « en cours de mesure ».
 */
export function ImpactStack() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const { portfolio } = useActivePortfolio();
  const valuation = usePortfolioValuation();
  const numLocale = lang === "en" ? "en-US" : "fr-FR";

  const totalInvested = valuation.totalInvested || portfolio?.initial_amount || 0;

  const impact = useMemo(() => {
    if (!portfolio?.metrics || totalInvested <= 0) return null;
    return buildPortfolioImpact(portfolio.metrics, totalInvested);
  }, [portfolio, totalInvested]);

  if (!portfolio || !impact) return null;

  const intensity = impact.intensity;
  const deltaPct = intensity?.vsBenchmarkDeltaPct;
  const cleaner = intensity?.cleaner ?? false;
  const coveragePct = intensity ? Math.round(intensity.coverage * 100) : null;

  const fmtInt = (n: number) => n.toLocaleString(numLocale, { maximumFractionDigits: 0 });

  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE_REVEAL }}
      className="px-5 pt-6"
    >
      <div className="rounded-[14px] border border-paper-3 bg-paper-2">
        {/* Barre d'en-tête */}
        <header className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-paper-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] font-bold text-ink-3">
            {t("impact_stack.eyebrow")}
          </span>
          <Link
            to="/methodologie"
            className="font-mono text-[10px] uppercase tracking-[0.18em] font-semibold text-ink-3 hover:text-ink transition-colors"
          >
            {t("impact_stack.method")} →
          </Link>
        </header>

        {/* 3 KPI inline */}
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-paper-3">
          {/* KPI 1 — Score ESG (toujours réel) */}
          <Kpi
            label={t("impact_stack.k_esg")}
            value={impact.esgScore.toFixed(0)}
            unit="/100"
            note={t("impact_stack.k_esg_note")}
          />

          {/* KPI 2 — WACI vs ETF Monde (réel ou en attente) */}
          {intensity && deltaPct != null ? (
            <Kpi
              label={t("impact_stack.k_vs")}
              value={`${cleaner ? "−" : "+"}${Math.round(Math.abs(deltaPct) * 100)}%`}
              accent={cleaner ? "mint" : "alert"}
              note={t(
                cleaner ? "impact_stack.k_vs_note_cleaner" : "impact_stack.k_vs_note_dirtier",
                { bench: fmtInt(intensity.benchmarkWaci) },
              )}
              source={`${ACWI_WACI_SOURCE} · ${ACWI_WACI_ASOF}`}
            />
          ) : (
            <KpiEmpty
              label={t("impact_stack.k_vs")}
              note={t("impact_stack.k_vs_pending")}
            />
          )}

          {/* KPI 3 — WACI portefeuille + couverture (réel ou en attente) */}
          {intensity ? (
            <Kpi
              label={t("impact_stack.k_waci")}
              value={fmtInt(intensity.waci)}
              unit="tCO₂e/M$"
              note={t("impact_stack.k_waci_note", { pct: coveragePct })}
            />
          ) : (
            <KpiEmpty
              label={t("impact_stack.k_waci")}
              note={t("impact_stack.k_waci_pending")}
            />
          )}
        </div>
      </div>
    </motion.section>
  );
}

/* ─────────── Primitives ─────────── */

function Kpi({
  label,
  value,
  unit,
  note,
  source,
  accent,
}: {
  label: string;
  value: string;
  unit?: string;
  note?: string;
  source?: string;
  accent?: "mint" | "alert";
}) {
  const color =
    accent === "mint" ? "text-mint" : accent === "alert" ? "text-alert" : "text-ink";
  return (
    <div className="px-5 py-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] font-semibold text-ink-3">
        {label}
      </p>
      <p className="mt-2 flex items-baseline gap-1.5 leading-none">
        <span className={`font-mono font-bold text-3xl md:text-4xl tabular-nums ${color}`}>
          {value}
        </span>
        {unit && (
          <span className="font-mono text-xs font-semibold text-ink-3">{unit}</span>
        )}
      </p>
      {note && (
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-2 leading-relaxed">
          {note}
        </p>
      )}
      {source && (
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
          {source}
        </p>
      )}
    </div>
  );
}

function KpiEmpty({ label, note }: { label: string; note: string }) {
  return (
    <div className="px-5 py-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] font-semibold text-ink-3">
        {label}
      </p>
      <p className="mt-2 leading-none">
        <span className="font-mono font-bold text-3xl md:text-4xl text-ink-3">—</span>
      </p>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-2 leading-relaxed">
        {note}
      </p>
    </div>
  );
}
