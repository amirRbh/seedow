import { useTranslation } from "react-i18next";
import { useLang } from "@/hooks/useLang";
import { formatPercent } from "@/lib/format";
import type { PortfolioAnalysis } from "@/lib/portfolio/analysis/analyzePortfolio";

/**
 * « Ce qui mérite ton attention. »
 *
 * Seedow savait déjà tout ça — exclusion enfreinte, concentration élevée, note
 * ESG estimée maison, historique de marché insuffisant, part non placée — mais
 * l'information était éparpillée : une ligne dans l'analyse, une réserve dans
 * le pool, un `unknown` dans un coin. Un utilisateur ne rassemble pas ça tout
 * seul, et surtout il ne sait pas qu'il devrait le faire.
 *
 * Ce bloc les réunit à un seul endroit, et c'est un choix de crédibilité :
 * un produit qui ne dit que le positif se lit comme une brochure. Nommer ses
 * propres limites est ce qui rend le reste croyable.
 *
 * ── Deux natures, jamais confondues ───────────────────────────────────────
 *
 *   · `portfolio` — quelque chose dans la composition mérite un regard
 *     (une exclusion touchée, une ligne qui pèse trop) ;
 *   · `data` — c'est NOTRE connaissance qui est limitée, pas le fonds qui est
 *     mauvais. « On ne sait pas » n'est pas « c'est mauvais », et présenter
 *     l'un comme l'autre serait une accusation sans fondement (§1.3).
 *
 * Rien n'est calculé ici : le composant lit `analyzePortfolio` et ne fait que
 * rassembler. Il ne rend rien quand il n'y a rien à signaler — un bloc vide
 * « tout va bien » serait une affirmation de plus.
 */

type PointKind = "portfolio" | "data";

interface WatchPoint {
  key: string;
  kind: PointKind;
  label: string;
}

/** Le libellé de nature est écrit ; la teinte ne fait que l'accompagner (§4). */
const KIND_TONE: Record<PointKind, string> = {
  portfolio: "text-solar-ink",
  data: "text-ink-3",
};

interface Props {
  analysis: PortfolioAnalysis;
  className?: string;
}

export function WatchPoints({ analysis, className = "" }: Props) {
  const { t } = useTranslation();
  const { lang } = useLang();

  const points: WatchPoint[] = [];

  // ── Ce qui concerne la composition ──────────────────────────────────────

  // Une exclusion enfreinte est le seul point réellement grave : l'utilisateur
  // a déclaré refuser ce secteur, et il le finance quand même.
  if (!analysis.alignment.exclusionsRespected) {
    points.push({
      key: "exclusions",
      kind: "portfolio",
      label: t("watch_points.exclusions_breached", {
        count: analysis.alignment.breaches.length,
      }),
    });
  }

  if (
    analysis.diversification.concentration === "high" &&
    analysis.diversification.largestPosition != null
  ) {
    points.push({
      key: "concentration",
      kind: "portfolio",
      label: t("watch_points.concentrated", {
        pct: formatPercent(analysis.diversification.largestPosition, lang, 0),
      }),
    });
  }

  // Part non placée : un choix valide, jamais une erreur — on l'expose comme
  // une information, pas comme un rappel à l'ordre.
  if (analysis.allocation.unallocatedShare > 0.02) {
    points.push({
      key: "unallocated",
      kind: "portfolio",
      label: t("watch_points.unallocated", {
        pct: formatPercent(analysis.allocation.unallocatedShare, lang, 0),
      }),
    });
  }

  if (analysis.horizon.fit === "weak") {
    points.push({ key: "horizon", kind: "portfolio", label: t("watch_points.horizon_weak") });
  }

  // ── Ce que NOUS ne savons pas ───────────────────────────────────────────

  if (analysis.dataQuality.esgSourcedShare != null && analysis.dataQuality.esgSourcedShare < 0.6) {
    points.push({
      key: "esg_sourced",
      kind: "data",
      label: t("watch_points.esg_estimated", {
        pct: formatPercent(1 - analysis.dataQuality.esgSourcedShare, lang, 0),
      }),
    });
  }

  if (analysis.risk.level === "unknown") {
    points.push({ key: "risk_unknown", kind: "data", label: t("watch_points.risk_unknown") });
  }

  // Le look-through entreprise n'est pas ingéré : on ne peut pas dire quelles
  // sociétés l'argent finance réellement. C'est une limite majeure, et la
  // taire donnerait au reste une précision qu'il n'a pas.
  if (analysis.exposure.byCompany === null) {
    points.push({ key: "no_lookthrough", kind: "data", label: t("watch_points.no_lookthrough") });
  }

  if (points.length === 0) return null;

  return (
    <div className={className}>
      <p className="stamp">{t("watch_points.title")}</p>
      <ul className="mt-2.5 flex flex-col gap-2">
        {points.map((p) => (
          <li key={p.key} className="flex items-start gap-2.5 text-body-sm leading-snug">
            <span
              className={`text-tag font-mono uppercase tracking-wider shrink-0 mt-0.5 ${KIND_TONE[p.kind]}`}
            >
              {t(`watch_points.kind.${p.kind}`)}
            </span>
            <span className="text-ink-2">{p.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
