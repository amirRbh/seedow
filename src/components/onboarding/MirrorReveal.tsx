import { motion } from "framer-motion";
import { Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLang } from "@/hooks/useLang";
import { EASE_REVEAL } from "@/lib/motion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * MirrorReveal — « le miroir » : le moment fondateur de l'onboarding.
 *
 * Confronte le portefeuille simulé de l'utilisateur à un référentiel composite
 * (actions + obligations) calculé par `simulatePortfolio`. Le benchmark s'adapte
 * à l'allocation réelle pour éviter de comparer un portefeuille obligataire à
 * un indice actions.
 */
export interface MirrorImpact {
  /** WACI moyen pondéré du portefeuille (tCO₂e/M$ CA), null si non couvert. */
  waci: number | null;
  /** Part du portefeuille disposant d'un WACI réel (0..1). */
  waci_coverage: number;
  /** Écart relatif vs référence composite, (bench − port)/bench. null si non calculable. */
  vs_benchmark_delta_pct: number | null;
  /** WACI de référence composite (tCO₂e/M$ CA), adapté à l'allocation. null si non défini. */
  benchmark_waci: number | null;
  /** Sources du référentiel composite. */
  benchmark_sources?: string[];
  /** Date des références. */
  benchmark_as_of?: string;
  /** Répartition actions/obligations/réels/cash du benchmark composite. */
  benchmark_breakdown?: {
    equity: number;
    bond: number;
    real: number;
    cash: number;
  };
  /** Repère ESG large : MSCI World ESG Leaders. */
  esg_benchmark_waci?: number;
  /** Repère aligné Paris : MSCI World Climate Paris Aligned. */
  paris_aligned_benchmark_waci?: number;
}

interface Props {
  impact: MirrorImpact;
  /** Nombre de lignes écartées de l'univers par les filtres (réel). */
  excludedCount: number;
  /** Taille de l'univers investissable (réel). */
  universeSize: number;
  /** Nombre de secteurs que l'utilisateur a choisi d'exclure. */
  exclusionsCount: number;
}

export function MirrorReveal({ impact, excludedCount, universeSize, exclusionsCount }: Props) {
  const { t } = useTranslation();
  const { lang } = useLang();
  const numLocale = lang === "en" ? "en-US" : "fr-FR";

  const delta = impact.vs_benchmark_delta_pct;
  const hasComparison = delta != null && impact.waci != null && impact.benchmark_waci != null;
  const cleaner = delta != null && delta > 0;
  const deltaPct = delta != null ? Math.round(Math.abs(delta) * 100) : 0;
  const coverage = impact.waci_coverage ?? 0;
  const lowCoverage = coverage < 0.5;

  const fmtWaci = (v: number | null) =>
    v == null ? "—" : v.toLocaleString(numLocale, { maximumFractionDigits: 0 });

  const fmtPct = (v: number) =>
    v.toLocaleString(numLocale, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  // Barre de positionnement : de 0 à max(Paris, ESG, benchmark, portfolio)
  const portfolioWaci = impact.waci ?? 0;
  const benchmarkWaci = impact.benchmark_waci ?? 0;
  const esgWaci = impact.esg_benchmark_waci ?? 85;
  const parisWaci = impact.paris_aligned_benchmark_waci ?? 55;
  const maxScale = Math.max(parisWaci, esgWaci, benchmarkWaci, portfolioWaci, 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE_REVEAL }}
      className="mb-8 rounded-2xl border border-paper-3 bg-paper-2 p-5 md:p-6"
    >
      <p className="text-tag uppercase tracking-[0.2em] text-mint font-semibold">
        {t("mirror.eyebrow")}
      </p>
      <h3 className="font-value text-2xl text-ink mt-1">{t("mirror.title")}</h3>

      {/* Confrontation intensité carbone */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-paper-3 bg-paper px-4 py-3">
          <p className="text-tag uppercase tracking-[0.16em] text-ink-3 font-medium">
            {t("mirror.classic_label")}
          </p>
          <p className="font-value text-3xl text-ink-2 mt-1 tabular-nums">
            {fmtWaci(impact.benchmark_waci)}
          </p>
          <p className="text-tag text-ink-3 mt-0.5">{t("mirror.waci_unit")}</p>
        </div>
        <div className="rounded-xl border border-mint/30 bg-mint/5 px-4 py-3">
          <p className="text-tag uppercase tracking-[0.16em] text-ink-3 font-medium">
            {t("mirror.yours_label")}
          </p>
          <p className="font-value text-3xl text-ink mt-1 tabular-nums">{fmtWaci(impact.waci)}</p>
          <p className="text-tag text-ink-3 mt-0.5">{t("mirror.waci_unit")}</p>
        </div>
      </div>

      {/* Verdict nuancé */}
      {hasComparison ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
              cleaner
                ? "bg-mint/10 text-mint-ink border border-mint/20"
                : lowCoverage
                  ? "bg-solar-tint text-solar-ink border border-solar-tint-border"
                  : "bg-solar-tint text-solar-ink border border-solar-tint-border"
            }`}
          >
            <svg
              viewBox="0 0 16 16"
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              {cleaner ? (
                <polyline points="2,12 6,7 10,9 14,3" />
              ) : (
                <polyline points="2,4 6,9 10,7 14,13" />
              )}
            </svg>
            {t(cleaner ? "mirror.cleaner" : "mirror.dirtier", { pct: deltaPct })}
          </div>
          {lowCoverage && (
            <span className="text-tag text-ink-3">
              {t("mirror.low_coverage", { pct: fmtPct(coverage * 100) })}
            </span>
          )}
        </div>
      ) : (
        <p className="mt-4 text-caption text-ink-3">{t("mirror.intensity_pending")}</p>
      )}

      {/* Barre de positionnement pédagogique */}
      {hasComparison && (
        <div className="mt-5">
          <div className="flex justify-between text-tag text-ink-3 mb-1.5">
            <span>{t("mirror.scale_cleaner")}</span>
            <span>{t("mirror.scale_intenser")}</span>
          </div>
          <div className="relative h-2 rounded-full bg-paper-3 overflow-hidden">
            {/* Repères */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-ice/60"
              style={{ left: `${(parisWaci / maxScale) * 100}%` }}
              title={t("mirror.paris_label")}
            />
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-volt/60"
              style={{ left: `${(esgWaci / maxScale) * 100}%` }}
              title={t("mirror.esg_label")}
            />
            {/* Portefeuille */}
            <div
              className="absolute top-0 bottom-0 w-1.5 bg-mint rounded-full shadow-sm"
              style={{ left: `${Math.min((portfolioWaci / maxScale) * 100, 100)}%` }}
            />
            {/* Benchmark */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-ink-2 rounded-full"
              style={{ left: `${Math.min((benchmarkWaci / maxScale) * 100, 100)}%` }}
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-tag text-ink-3">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-mint" />
              {t("mirror.yours_label")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-ink-2" />
              {t("mirror.classic_label")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-1 bg-volt/60" />
              {t("mirror.esg_label")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-1 bg-ice/60" />
              {t("mirror.paris_label")}
            </span>
          </div>
        </div>
      )}

      {/* Exclusions réelles */}
      <p className="mt-5 text-label text-ink-2 leading-relaxed">
        {t("mirror.exclusions_line", {
          sectors: exclusionsCount,
          excluded: excludedCount.toLocaleString(numLocale),
          universe: universeSize.toLocaleString(numLocale),
        })}
      </p>

      {/* Sourçage */}
      {impact.benchmark_waci != null && (
        <p className="mt-3 text-tag text-ink-3 leading-relaxed">
          {t("mirror.benchmark_source", {
            value: fmtWaci(impact.benchmark_waci),
            sources: impact.benchmark_sources?.join(" + ") ?? "MSCI ACWI",
            date: impact.benchmark_as_of ?? "—",
          })}
        </p>
      )}
      <p className="mt-1 text-tag text-ink-3 italic">{t("mirror.reveal_hint")}</p>
    </motion.div>
  );
}
