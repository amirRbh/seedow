import { useTranslation } from "react-i18next";
import { useLang } from "@/hooks/useLang";
import { formatDate, formatPercent } from "@/lib/format";
import { summarizeHoldings, type HoldingLine } from "@/lib/portfolio/holdings-summary";
import {
  holdingsAgeDays,
  holdingsFreshness,
  type HoldingsFreshness,
} from "@/lib/data-engine/holdings-freshness";

/**
 * « Ce qu'il y a derrière ton investissement. »
 *
 * C'est le maillon que Seedow promettait sans pouvoir le tenir : passer de
 * « j'ai un ETF » à « je vois les entreprises que mon argent finance ».
 *
 * ── L'ordre est le fond ───────────────────────────────────────────────────
 *
 * On ne commence PAS par la liste. Mille lignes de tickers et de pourcentages
 * ne répondent pas à la question, elles la remplacent par un tableau que
 * personne ne sait lire. On commence par le secteur dominant, en français,
 * parce que c'est ce qui décrit vraiment l'exposition. Les entreprises
 * viennent ensuite, et le reste se déplie.
 *
 * ── Quand on ne sait pas ──────────────────────────────────────────────────
 *
 * Le repli n'est pas un espace vide ni un message d'erreur technique. Il dit
 * ce qui manque et pourquoi on préfère ne pas deviner. La plupart des fonds du
 * catalogue sont dans ce cas : ne pas avoir la donnée n'est pas un défaut du
 * fonds, et l'écran ne doit pas le laisser croire.
 *
 * ── Les poids restent ceux de l'émetteur ──────────────────────────────────
 *
 * Leur somme n'atteint presque jamais 100 % — liquidités, dérivés, arrondis.
 * On l'affiche telle quelle et on nomme l'écart. Le ramener à 100 fabriquerait
 * une composition que l'émetteur n'a pas publiée.
 */

/** Le palier porte un mot ; la teinte ne fait que l'accompagner (§4). */
const FRESHNESS_TONE: Record<HoldingsFreshness, string> = {
  fresh: "text-mint-ink",
  aging: "text-solar-ink",
  stale: "text-alert-ink",
  unknown: "text-ink-3",
};

/** En deçà, la somme publiée mérite d'être expliquée à l'utilisateur. */
const SUM_TOLERANCE_PCT = 2;

interface Props {
  holdings: readonly HoldingLine[];
  /** Date de publication de la composition (ISO), ou null. */
  asOf: string | null;
  /** Émetteur/source de la donnée, tel qu'enregistré. */
  source: string | null;
  /** URL publique du document — rend la donnée rejouable par quiconque. */
  sourceUrl?: string | null;
  className?: string;
}

export function FundHoldingsBlock({ holdings, asOf, source, sourceUrl, className = "" }: Props) {
  const { t } = useTranslation();
  const { lang } = useLang();

  const summary = summarizeHoldings(holdings);

  // ── Rien à montrer : on dit quoi, et pourquoi on ne devine pas. ──────────
  if (summary.count === 0) {
    return (
      <section className={className}>
        <p className="stamp">{t("holdings.title")}</p>
        <p className="mt-2 text-body-sm text-ink-2 leading-relaxed">{t("holdings.empty")}</p>
        <p className="mt-1.5 text-caption text-ink-3 leading-relaxed">{t("holdings.empty_why")}</p>
      </section>
    );
  }

  const freshness = holdingsFreshness(asOf);
  const ageDays = holdingsAgeDays(asOf);
  const sumOff = Math.abs(100 - summary.totalWeightPct) > SUM_TOLERANCE_PCT;

  return (
    <section className={className}>
      <p className="stamp">{t("holdings.title")}</p>

      {/* NIVEAU 1 — la phrase. C'est la seule ligne qu'un débutant doit lire. */}
      {summary.topSectors.length > 0 && (
        <p className="mt-2 text-body-lg leading-snug text-ink">
          {t("holdings.lead", {
            sectors: summary.topSectors.map((s) => s.sector).join(", "),
            count: summary.topSectors.length,
          })}
        </p>
      )}

      {/* NIVEAU 2 — les entreprises. */}
      <p className="mt-4 text-body-sm font-semibold text-ink">{t("holdings.main_companies")}</p>
      <ul className="mt-2 divide-y divide-paper-3 border-t border-paper-3">
        {summary.topHoldings.map((h) => (
          <li key={`${h.ticker ?? ""}-${h.name}`} className="flex items-baseline gap-3 py-2">
            <span className="min-w-0 flex-1 text-body-sm text-ink truncate">{h.name}</span>
            <span className="shrink-0 text-tag font-mono tabular-nums text-ink-2">
              {formatPercent((h.weightPct ?? 0) / 100, lang, 2)}
            </span>
          </li>
        ))}
      </ul>

      {/* NIVEAU 3 — la date, la source, et ce que la somme vaut réellement. */}
      <div className="mt-3 flex flex-col gap-1">
        <p className={`text-caption ${FRESHNESS_TONE[freshness]}`}>
          {asOf
            ? t(`holdings.freshness.${freshness}`, {
                date: formatDate(asOf, lang, { year: "numeric", month: "long", day: "numeric" }),
                days: ageDays ?? 0,
              })
            : t("holdings.freshness.unknown")}
        </p>
        <p className="text-caption text-ink-3">
          {source ? t("holdings.source", { source }) : t("holdings.source_missing")}
          {sourceUrl && (
            <>
              {" · "}
              <a
                href={sourceUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="underline underline-offset-2 hover:no-underline"
              >
                {t("holdings.source_link")}
              </a>
            </>
          )}
        </p>
        {/* La somme publiée n'est jamais retouchée : on explique l'écart. */}
        <p className="text-caption text-ink-3">
          {t("holdings.count", { count: summary.count })}
          {sumOff &&
            ` · ${t("holdings.sum_note", {
              pct: formatPercent(summary.totalWeightPct / 100, lang, 1),
            })}`}
        </p>
      </div>
    </section>
  );
}
