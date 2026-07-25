import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useLang } from "@/hooks/useLang";
import { EASE_REVEAL } from "@/lib/motion";

/**
 * MirrorReveal — « le miroir » : le moment fondateur de l'onboarding.
 *
 * Confronte le portefeuille simulé de l'utilisateur à un ETF Monde classique,
 * uniquement à partir de nombres RÉELS calculés par `simulatePortfolio`
 * (intensité carbone WACI, écart vs indice de référence sourcé, secteurs exclus,
 * lignes filtrées de l'univers). Aucun chiffre n'est inventé : si l'intensité
 * n'est pas mesurée sur la sélection, on l'affiche honnêtement plutôt que de
 * combler le vide.
 */
export interface MirrorImpact {
  /** WACI moyen pondéré du portefeuille (tCO₂e/M$ CA), null si non couvert. */
  waci: number | null;
  /** Part du portefeuille disposant d'un WACI réel (0..1). */
  waci_coverage: number;
  /** Écart relatif vs indice de référence, (bench − port)/bench. null si non calculable. */
  vs_benchmark_delta_pct: number | null;
  /** WACI de référence (ETF Monde), tCO₂e/M$ CA, sourcé MSCI ACWI. null si non défini. */
  benchmark_waci: number | null;
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

  const fmtWaci = (v: number | null) =>
    v == null ? "—" : v.toLocaleString(numLocale, { maximumFractionDigits: 0 });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE_REVEAL }}
      className="mb-8 rounded-2xl border border-paper-3 bg-paper-2 p-5 md:p-6"
    >
      <p className="text-tag uppercase tracking-[0.2em] text-gold font-semibold">
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
        <div className="rounded-xl border border-highlight-1/30 bg-highlight-5/40 px-4 py-3">
          <p className="text-tag uppercase tracking-[0.16em] text-ink-3 font-medium">
            {t("mirror.yours_label")}
          </p>
          <p className="font-value text-3xl text-ink mt-1 tabular-nums">{fmtWaci(impact.waci)}</p>
          <p className="text-tag text-ink-3 mt-0.5">{t("mirror.waci_unit")}</p>
        </div>
      </div>

      {/* Verdict honnête */}
      {hasComparison ? (
        <div
          className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
            cleaner ? "bg-highlight-5 text-highlight-1" : "bg-alert-tint text-rust"
          }`}
        >
          <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5">
            {cleaner ? <polyline points="2,12 6,7 10,9 14,3" /> : <polyline points="2,4 6,9 10,7 14,13" />}
          </svg>
          {t(cleaner ? "mirror.cleaner" : "mirror.dirtier", { pct: deltaPct })}
        </div>
      ) : (
        <p className="mt-4 text-caption text-ink-3">{t("mirror.intensity_pending")}</p>
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
          {t("mirror.benchmark_source", { value: fmtWaci(impact.benchmark_waci) })}
        </p>
      )}
      <p className="mt-1 text-tag text-ink-3 italic">{t("mirror.reveal_hint")}</p>
    </motion.div>
  );
}
