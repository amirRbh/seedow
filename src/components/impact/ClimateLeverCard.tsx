import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { EASE_REVEAL } from "@/lib/motion";
import { estimateClimateExposureLever, type LeverHolding } from "@/lib/impact/lever";

/**
 * Levier « exposition climat » — audit .lovable/plan.md §12. Câble la fonction
 * pure `estimateClimateExposureLever` sur un slider. N'affiche RIEN si les
 * données réelles (WACI/volatilité du portefeuille et d'au moins une ligne
 * détenue plus propre) manquent (CLAUDE.md §1.2) : pas de simulation sans
 * données réelles.
 */
export function ClimateLeverCard({
  currentWaci,
  waciCoverage,
  currentVolatility,
  holdings,
  numLocale,
}: {
  currentWaci: number | null;
  waciCoverage: number;
  currentVolatility: number | null;
  holdings: readonly LeverHolding[];
  numLocale: string;
}) {
  const { t } = useTranslation();
  const [pct, setPct] = useState(25);

  const result = useMemo(
    () =>
      estimateClimateExposureLever({
        currentWaci,
        waciCoverage,
        currentVolatility,
        holdings,
        exposureIncreasePct: pct,
      }),
    [currentWaci, waciCoverage, currentVolatility, holdings, pct],
  );

  // Donnée manquante : on masque totalement le levier, on n'invente rien.
  if (!result.available) return null;

  const fmtWaci = (v: number) => v.toLocaleString(numLocale, { maximumFractionDigits: 0 });
  const fmtVol = (v: number) =>
    v.toLocaleString(numLocale, { style: "percent", maximumFractionDigits: 1 });

  return (
    <div className="space-y-4">
      <div className="px-1">
        <p className="text-body-sm font-semibold text-ink">{t("impact_xp.lever.title")}</p>
        <p className="mt-1 text-caption leading-snug text-ink-2">{t("impact_xp.lever.subtitle")}</p>
      </div>
      <div className="rounded-3xl border border-paper-3 bg-paper p-5 md:p-6">
        <label className="block">
          <span className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
            <span>{t("impact_xp.lever.slider_label", { pct })}</span>
          </span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={pct}
            onChange={(e) => setPct(Number(e.target.value))}
            className="mt-2 w-full accent-mint"
            aria-label={t("impact_xp.lever.slider_label", { pct })}
          />
        </label>

        <div className="mt-5 grid grid-cols-2 gap-4">
          <div>
            <p className="text-caption uppercase tracking-wider text-ink-3">
              {t("impact_xp.lever.waci_label")}
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-mono text-sm text-ink-3 line-through decoration-ink-3/50">
                {fmtWaci(currentWaci as number)}
              </span>
              <motion.span
                key={`waci-${pct}`}
                initial={{ opacity: 0.4 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, ease: EASE_REVEAL }}
                className="font-value text-lg text-mint"
              >
                {fmtWaci(result.estimatedWaci)}
              </motion.span>
            </div>
          </div>
          <div>
            <p className="text-caption uppercase tracking-wider text-ink-3">
              {t("impact_xp.lever.volatility_label")}
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-mono text-sm text-ink-3 line-through decoration-ink-3/50">
                {fmtVol(currentVolatility as number)}
              </span>
              <motion.span
                key={`vol-${pct}`}
                initial={{ opacity: 0.4 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, ease: EASE_REVEAL }}
                className="font-value text-lg text-ink"
              >
                {fmtVol(result.estimatedVolatility)}
              </motion.span>
            </div>
          </div>
        </div>

        <p className="mt-4 text-caption leading-snug text-ink-3">{t("impact_xp.lever.method")}</p>
      </div>
    </div>
  );
}
