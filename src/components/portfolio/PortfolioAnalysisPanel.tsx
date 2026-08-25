import { useTranslation } from "react-i18next";
import { useLang } from "@/hooks/useLang";
import { formatPercent } from "@/lib/format";
import { WhyThis } from "@/components/common/WhyThis";
import type { PortfolioAnalysis } from "@/lib/portfolio/analysis/analyzePortfolio";

/**
 * Rend une `PortfolioAnalysis` — le même affichage sur le builder et sur Le Fil,
 * pour que composer et consulter racontent la même chose.
 *
 * Deux règles de la DA s'appliquent ici plus qu'ailleurs :
 *
 *  - **La couleur ne porte jamais l'information seule** (§4) : chaque niveau est
 *    doublé d'un mot écrit. Un compromis « critique » se lit, il ne se devine
 *    pas à sa teinte.
 *  - **Une donnée absente s'écrit** : `unknown` / `null` n'est pas masqué, il est
 *    dit. Ne rien afficher laisserait croire que la question ne se pose pas.
 *
 * S'y ajoute une troisième règle, celle qui manquait : **chaque ligne dont le
 * libellé suppose une notion financière doit pouvoir répondre « pourquoi ? »**.
 * « Risque : modéré » ne veut rien dire pour quelqu'un qui n'a jamais investi
 * tant qu'on ne lui a pas dit ce que « modéré » recouvre. L'explication est
 * repliée (`WhyThis`) : elle ne charge pas l'écran, elle est là quand on la
 * cherche.
 */

interface Props {
  analysis: PortfolioAnalysis;
  /** Affiche le bloc « compromis » (masqué quand il est déjà rendu ailleurs). */
  showTradeoffs?: boolean;
  className?: string;
}

/** Accent par sévérité — toujours accompagné du libellé écrit. */
const SEVERITY_TONE: Record<string, string> = {
  critical: "text-alert-ink",
  warning: "text-solar-ink",
  info: "text-ink-2",
};

export function PortfolioAnalysisPanel({ analysis, showTradeoffs = true, className }: Props) {
  const { t } = useTranslation();
  const { lang } = useLang();

  const rows: Array<{
    key: string;
    label: string;
    value: string;
    hint?: string;
    /** Clé i18n d'une explication en langage clair, dépliable. */
    why?: string;
  }> = [];

  // A — Compatibilité avec les valeurs.
  rows.push({
    key: "alignment",
    label: t("analysis.row.alignment"),
    value:
      analysis.alignment.overall != null
        ? t("analysis.score_100", { score: analysis.alignment.overall })
        : t("analysis.unknown"),
    // `explanation` liste d'abord les exclusions, puis les convictions : c'est
    // la dernière qui parle d'alignement, pas la première.
    hint: t(`analysis.${analysis.alignment.explanation.at(-1) ?? "alignment.no_causes"}`),
  });
  rows.push({
    key: "exclusions",
    label: t("analysis.row.exclusions"),
    value: analysis.alignment.exclusionsRespected
      ? t("analysis.exclusions_ok")
      : t("analysis.exclusions_breached", { count: analysis.alignment.breaches.length }),
  });

  // B — Compatibilité financière, jamais mêlée à l'ESG.
  rows.push({
    key: "risk",
    label: t("analysis.row.risk"),
    value: t(`analysis.risk.${analysis.risk.level}`),
    why: `analysis.why.risk.${analysis.risk.level}`,
    hint:
      analysis.risk.volatility != null
        ? t("analysis.volatility", { pct: formatPercent(analysis.risk.volatility, lang, 1) })
        : undefined,
  });
  rows.push({
    key: "horizon",
    label: t("analysis.row.horizon"),
    value: t(`analysis.horizon.${analysis.horizon.fit}`),
    hint:
      analysis.horizon.years != null
        ? t("analysis.horizon_years", { count: analysis.horizon.years })
        : undefined,
  });

  rows.push({
    key: "diversification",
    label: t("analysis.row.diversification"),
    value: t(`analysis.concentration.${analysis.diversification.concentration}`),
    why: `analysis.why.concentration.${analysis.diversification.concentration}`,
    hint:
      analysis.diversification.largestPosition != null
        ? t("analysis.largest_position", {
            pct: formatPercent(analysis.diversification.largestPosition, lang, 0),
          })
        : undefined,
  });

  // C — Qualité des DONNÉES, distincte de la qualité de l'actif.
  rows.push({
    key: "data",
    label: t("analysis.row.data"),
    value: t(`analysis.data.${analysis.dataQuality.overall}`),
    why: `analysis.why.data.${analysis.dataQuality.overall}`,
    hint:
      analysis.dataQuality.esgSourcedShare != null
        ? t("analysis.esg_sourced", {
            pct: formatPercent(analysis.dataQuality.esgSourcedShare, lang, 0),
          })
        : undefined,
  });

  return (
    <div className={className}>
      <ul className="divide-y divide-paper-3 border-t border-b border-paper-3">
        {rows.map((r) => (
          <li key={r.key} className="py-2.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-body-sm text-ink-2">{r.label}</span>
              <span className="text-right">
                <span className="text-body-sm font-semibold text-ink">{r.value}</span>
                {r.hint && <span className="block text-tag text-ink-3">{r.hint}</span>}
              </span>
            </div>
            {r.why && (
              <WhyThis className="mt-1" ariaLabel={t("analysis.why_aria", { row: r.label })}>
                {t(r.why)}
              </WhyThis>
            )}
          </li>
        ))}
      </ul>

      {showTradeoffs && analysis.tradeoffs.length > 0 && (
        <div className="mt-4">
          <p className="stamp">{t("analysis.tradeoffs_title")}</p>
          <ul className="mt-2 flex flex-col gap-2">
            {analysis.tradeoffs.map((tr) => (
              <li key={tr.type} className="flex items-start gap-2 text-body-sm leading-snug">
                {/* Le niveau est ÉCRIT, pas seulement coloré. */}
                <span
                  className={`text-tag font-mono uppercase tracking-wider shrink-0 ${
                    SEVERITY_TONE[tr.severity] ?? "text-ink-2"
                  }`}
                >
                  {t(`analysis.severity.${tr.severity}`)}
                </span>
                <span className="text-ink-2">{t(`analysis.${tr.code}`, tr.vars)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
