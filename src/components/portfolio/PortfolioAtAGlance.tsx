import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { Leaf, Gauge, Coins, Network } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLang } from "@/hooks/useLang";
import { formatPercent } from "@/lib/format";
import { EASE_REVEAL } from "@/lib/motion";
import type { ActiveHolding, ActivePortfolioMetrics } from "@/hooks/useActivePortfolio";
import type { AssetClass, CauseTag, ExclusionTag } from "@/lib/portfolio/types";
import { portfolioGlance } from "@/lib/portfolio/plain-language";
import { assetBucket, explainPortfolio, type MoneyBucket } from "@/lib/portfolio/rationale";
import { DataProvenance } from "@/components/impact/DataProvenance";

interface RationaleInput {
  causes: CauseTag[];
  exclusions: ExclusionTag[];
  horizon_years: number;
  risk_target: number;
}

interface Props {
  metrics: ActivePortfolioMetrics | null;
  holdings: ActiveHolding[];
  rationale: RationaleInput | null;
  /** Ancre optionnelle vers les détails (onglets plus bas). */
  onSeeDetails?: () => void;
}

const BUCKET_COLOR: Record<MoneyBucket, string> = {
  actions: "var(--ink)",
  obligations: "var(--ink-3)",
  autres: "var(--paper-3)",
};

/**
 * « Coup d'œil » lisible en tête de portefeuille — pensé pour quelqu'un qui n'a
 * jamais investi (mission Seedow §5/§8). Traduit les métriques réelles en bandes
 * (Impact/Risque/Frais/Diversification), montre « Où va votre argent ? » en trois
 * grands seaux, et explique « Pourquoi cette proposition ? ». Le détail chiffré
 * reste accessible plus bas (progressive disclosure).
 */
export function PortfolioAtAGlance({ metrics, holdings, rationale, onSeeDetails }: Props) {
  const { t } = useTranslation();
  const { lang } = useLang();
  const [whyOpen, setWhyOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const glance = portfolioGlance(metrics);

  // Répartition en grands seaux à partir des pondérations réelles.
  const bucketPct = new Map<MoneyBucket, number>();
  for (const h of holdings) {
    const b = assetBucket(h.category as AssetClass);
    bucketPct.set(b, (bucketPct.get(b) ?? 0) + h.allocationPct);
  }
  const buckets = (["actions", "obligations", "autres"] as MoneyBucket[])
    .map((b) => ({ bucket: b, pct: bucketPct.get(b) ?? 0 }))
    .filter((b) => b.pct > 0.05)
    .sort((a, b) => b.pct - a.pct);

  const reasons = rationale
    ? explainPortfolio({
        causes: rationale.causes,
        exclusions: rationale.exclusions,
        horizon_years: rationale.horizon_years,
        risk_target: rationale.risk_target,
        metrics,
      })
    : [];

  return (
    <section className="paper-card p-5">
      <p className="text-tag uppercase tracking-[0.18em] text-ink-3 font-semibold">
        {t("portfolio_glance.eyebrow")}
      </p>
      <h2 className="font-value text-2xl text-ink mt-0.5">{t("portfolio_glance.title")}</h2>

      {/* Les 4 lectures essentielles */}
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <GlanceChip
          icon={<Leaf className="w-4 h-4" strokeWidth={1.8} aria-hidden />}
          label={t("portfolio_glance.chip.impact")}
          value={glance.impact ? `${glance.impact.score}/100` : "—"}
          sublabel={t("portfolio_glance.impact_sublabel")}
          accent="mint"
        />
        <GlanceChip
          icon={<Gauge className="w-4 h-4" strokeWidth={1.8} aria-hidden />}
          label={t("portfolio_glance.chip.risk")}
          value={glance.risk ? t(`portfolio_glance.risk.${glance.risk.level}`) : "—"}
          scale={glance.risk ? riskDots(glance.risk.level) : undefined}
        />
        <GlanceChip
          icon={<Coins className="w-4 h-4" strokeWidth={1.8} aria-hidden />}
          label={t("portfolio_glance.chip.fees")}
          value={
            glance.fees
              ? `${formatPercent(glance.fees.ratio, lang, 2)} ${t("portfolio_glance.fees_suffix")}`
              : "—"
          }
          accent={glance.fees?.level === "eleve" ? "solar" : undefined}
        />
        <GlanceChip
          icon={<Network className="w-4 h-4" strokeWidth={1.8} aria-hidden />}
          label={t("portfolio_glance.chip.diversification")}
          value={
            glance.diversification ? t(`portfolio_glance.div.${glance.diversification.band}`) : "—"
          }
          accent={glance.diversification?.band === "limitee" ? "solar" : undefined}
        />
      </div>

      {/* Provenance du score d'impact — sourcé sur le support principal (§1.2).
          Pas de « couverture » ici : le score porte sur 100 % des lignes (notes
          ESG par actif) ; la couverture carbone, elle, vit avec les chiffres
          carbone dans l'onglet Impact. Le caveat « repère, pas garantie » est
          dans l'explication dépliable ci-dessous. */}
      {glance.impact && (
        <DataProvenance
          className="mt-3"
          basis={t("portfolio_glance.impact_basis")}
          link={
            <Link
              to="/portfolio"
              search={{ tab: "impact" }}
              className="text-mint-ink underline-offset-2 hover:underline"
            >
              {t("portfolio_glance.impact_sources_link")}
            </Link>
          }
        />
      )}

      {/* Que veulent dire ces mots ? — progressive disclosure niveau 1 */}
      <button
        type="button"
        onClick={() => setHelpOpen((o) => !o)}
        aria-expanded={helpOpen}
        className="mt-3 inline-flex items-center gap-1 text-caption text-ink-3 hover:text-ink-2 border-b border-dotted border-ink-3/60 transition-colors"
      >
        {t("portfolio_glance.help_cta")}
        <Chevron open={helpOpen} />
      </button>
      <AnimatePresence initial={false}>
        {helpOpen && (
          <motion.ul
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden mt-2 space-y-1.5 text-body-sm text-ink-2 leading-relaxed"
          >
            <li>{t("portfolio_glance.help.impact")}</li>
            <li>{t("portfolio_glance.help.risk")}</li>
            <li>{t("portfolio_glance.help.fees")}</li>
            <li>{t("portfolio_glance.help.diversification")}</li>
          </motion.ul>
        )}
      </AnimatePresence>

      {/* Où va votre argent ? */}
      {buckets.length > 0 && (
        <div className="mt-5 border-t border-paper-3 pt-4">
          <p className="text-body-sm font-semibold text-ink">{t("portfolio_glance.money_title")}</p>
          <div className="mt-2.5 h-2.5 w-full bg-paper-2 rounded-full overflow-hidden flex">
            {buckets.map((b, i) => (
              <motion.div
                key={b.bucket}
                initial={{ width: 0 }}
                animate={{ width: `${b.pct}%` }}
                transition={{ duration: 0.8, ease: EASE_REVEAL, delay: i * 0.08 }}
                style={{ backgroundColor: BUCKET_COLOR[b.bucket] }}
                className="h-full"
              />
            ))}
          </div>
          <ul className="mt-3 space-y-1.5">
            {buckets.map((b) => (
              <li key={b.bucket} className="flex items-center gap-2 text-body-sm">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: BUCKET_COLOR[b.bucket] }}
                  aria-hidden
                />
                <span className="text-ink">{t(`portfolio_glance.bucket.${b.bucket}`)}</span>
                <span className="ml-auto tabular-nums text-ink-2 font-medium">
                  {formatPercent(b.pct / 100, lang, 0)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Pourquoi cette proposition ? */}
      {reasons.length > 0 && (
        <div className="mt-4 border-t border-paper-3 pt-4">
          <button
            type="button"
            onClick={() => setWhyOpen((o) => !o)}
            aria-expanded={whyOpen}
            className="w-full flex items-center justify-between gap-3 text-left"
          >
            <span className="text-body-sm font-semibold text-ink">
              {t("portfolio_glance.why_title")}
            </span>
            <Chevron open={whyOpen} />
          </button>
          <AnimatePresence initial={false}>
            {whyOpen && (
              <motion.ul
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden mt-2.5 space-y-2"
              >
                {reasons.map((r) => (
                  <li key={r.key} className="flex gap-2 text-body-sm text-ink-2 leading-relaxed">
                    <span className="text-mint-ink mt-0.5 flex-shrink-0" aria-hidden>
                      •
                    </span>
                    <span>{t(r.key, r.vars)}</span>
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      )}

      {onSeeDetails && (
        <button
          type="button"
          onClick={onSeeDetails}
          className="mt-5 w-full h-11 rounded-full border border-paper-3 bg-paper text-ink text-body-sm font-semibold hover:bg-paper-2 transition-colors"
        >
          {t("portfolio_glance.see_details")}
        </button>
      )}

      <p className="mt-3 text-tag text-ink-3 leading-relaxed text-center">
        {t("portfolio_glance.simulation_note")}
      </p>
    </section>
  );
}

type Accent = "mint" | "solar";

function GlanceChip({
  icon,
  label,
  value,
  sublabel,
  accent,
  scale,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sublabel?: string;
  accent?: Accent;
  scale?: number; // 1..3 pour l'échelle de risque
}) {
  const valueColor =
    accent === "mint" ? "text-mint-ink" : accent === "solar" ? "text-solar-ink" : "text-ink";
  return (
    <div className="rounded-2xl border border-paper-3 bg-paper-2 px-3.5 py-3">
      <div className="flex items-center gap-1.5 text-ink-3">
        {icon}
        <span className="text-tag uppercase tracking-[0.14em] font-semibold">{label}</span>
      </div>
      <p className={`mt-1.5 font-value text-lg leading-none ${valueColor}`}>{value}</p>
      {sublabel && <p className="mt-1 text-tag text-ink-3 leading-tight">{sublabel}</p>}
      {typeof scale === "number" && (
        <div className="mt-2 flex gap-1" aria-hidden>
          {[1, 2, 3].map((n) => (
            <span
              key={n}
              className={`h-1 flex-1 rounded-full ${n <= scale ? "bg-ink" : "bg-paper-3"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function riskDots(level: "prudent" | "modere" | "dynamique"): number {
  return level === "prudent" ? 1 : level === "modere" ? 2 : 3;
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={`w-3.5 h-3.5 text-ink-3 transition-transform ${open ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M4 6l4 4 4-4" />
    </svg>
  );
}
