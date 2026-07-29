import { useTranslation } from "react-i18next";
import { buildImpactSignal, type SignalTone } from "@/lib/impact/narrative";
import type { PortfolioImpactView } from "@/lib/impact/portfolioImpact";

/**
 * Primitives partagées de la section Impact — pour que le dashboard (ImpactMoment)
 * et la page portefeuille (ImpactExperience) racontent le MÊME fait de la même
 * façon. Le ton (mint/solar/neutre) est TOUJOURS doublé d'une icône + d'un libellé,
 * jamais porté par la seule couleur (CLAUDE.md §4).
 */

const TONE: Record<SignalTone, { chip: string; icon: "up" | "down" | "dot"; labelKey: string }> = {
  positive: { chip: "bg-mint/12 text-mint", icon: "up", labelKey: "impact_signal.tone.positive" },
  caution: {
    chip: "bg-solar-tint text-solar",
    icon: "down",
    labelKey: "impact_signal.tone.caution",
  },
  neutral: { chip: "bg-paper-2 text-ink-2", icon: "dot", labelKey: "impact_signal.tone.neutral" },
};

function ToneIcon({ kind }: { kind: "up" | "down" | "dot" }) {
  if (kind === "dot") {
    return <span className="block h-1.5 w-1.5 rounded-full bg-current" aria-hidden />;
  }
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      {kind === "up" ? <polyline points="2,12 6,7 10,9 14,3" /> : <polyline points="2,4 6,9 10,7 14,13" />}
    </svg>
  );
}

/**
 * SignalLine — rend LE signal d'impact le plus porteur de sens (choisi par
 * `buildImpactSignal` sur des données déjà honnêtes), avec sa source et sa date.
 */
export function SignalLine({
  impact,
  numLocale,
}: {
  impact: PortfolioImpactView;
  numLocale: string;
}) {
  const { t } = useTranslation();
  const signal = buildImpactSignal(impact);
  const tone = TONE[signal.tone];

  // Localise les paramètres numériques pour un rendu propre (séparateurs de milliers).
  const params: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(signal.params)) {
    params[k] = typeof v === "number" ? v.toLocaleString(numLocale) : v;
  }

  return (
    <div className="flex items-start gap-3">
      <span
        className={`mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-lg ${tone.chip}`}
      >
        <ToneIcon kind={tone.icon} />
      </span>
      <div className="min-w-0">
        <p className="text-[15px] font-semibold leading-snug tracking-[-0.01em] text-ink">
          <span className="sr-only">{t(tone.labelKey)} · </span>
          {t(signal.headlineKey, params)}
        </p>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
          {t("impact_signal.source_prefix")} {signal.source}
          {signal.asOf != null ? ` · ${signal.asOf}` : ""}
        </p>
      </div>
    </div>
  );
}
