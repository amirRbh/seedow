import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLang } from "@/hooks/useLang";
import type { Lang } from "@/i18n";
import { formatDate, formatPercent } from "@/lib/format";
import {
  holdingsAgeDays,
  holdingsFreshness,
  type HoldingsFreshness,
} from "@/lib/data-engine/holdings-freshness";
import { WhyThis } from "@/components/common/WhyThis";
import {
  buildEuroBreakdown,
  DEFAULT_REFERENCE_AMOUNT,
  REFERENCE_AMOUNTS,
  type EuroSlice,
} from "@/lib/impact/euroBreakdown";
import type { HoldingLine } from "@/lib/portfolio/holdings-summary";
import { cn } from "@/lib/utils";

/**
 * « Sur 1 000 € investis, voilà où ils vont. »
 *
 * C'est le seul écran du produit qui doit provoquer quelque chose. Pas une
 * mise en scène : une traduction. « Technologie 31,4 % » et « 314 € sur
 * 1 000 € » disent exactement la même chose, mais seul le second se comprend
 * sans rien savoir de la finance — et c'est le second qui fait lever la tête.
 *
 * ── Pourquoi pas un camembert ─────────────────────────────────────────────
 *
 * Un anneau multicolore demande une légende, donc un aller-retour de l'œil,
 * donc un décodage — et il fait porter l'information par la couleur seule, ce
 * que le produit s'interdit (CLAUDE.md §4). Ici chaque secteur est une ligne :
 * le montant en euros à gauche, le libellé écrit, la barre derrière. Rien à
 * décoder, rien à survoler, et ça tient sur un écran de téléphone.
 *
 * ── Ce qui n'est pas montré est dit ───────────────────────────────────────
 *
 * Deux écarts existent toujours dans une composition publiée, et aucun n'est
 * masqué : la part dont l'émetteur ne publie pas le secteur, et la part que la
 * composition ne décrit pas du tout (liquidités, dérivés, arrondis). Elles ont
 * chacune leur ligne, avec leur libellé exact. Les lisser à 100 % rendrait le
 * graphique plus joli et le produit moins vrai.
 *
 * Quand rien n'est publié, le bloc ne se vide pas : il explique.
 */

/**
 * Le palier d'ancienneté porte un mot ; la teinte ne fait que l'accompagner
 * (§4). Il reste au NIVEAU 1 : une composition vieille de huit mois change le
 * sens de « voilà où va ton argent », ce n'est pas un détail de source.
 */
const FRESHNESS_TONE: Record<HoldingsFreshness, string> = {
  fresh: "text-ink-3",
  aging: "text-solar-ink",
  stale: "text-alert-ink",
  unknown: "text-ink-3",
};

interface Props {
  /** Composition publiée par l'émetteur. Peut être vide — le bloc le dit. */
  holdings: readonly HoldingLine[];
  /** Date d'arrêté de la composition (ISO), ou null. */
  asOf: string | null;
  /** Émetteur/source de la donnée, telle qu'enregistrée. */
  source: string | null;
  /** Document public — rend la donnée rejouable par quiconque. */
  sourceUrl?: string | null;
  /** Frais courants annuels, en fraction (0.0022 = 0,22 %). */
  ter?: number | null;
  /**
   * Montant de référence IMPOSÉ — celui que l'utilisateur a réellement placé
   * sur cette ligne. Il masque le sélecteur : proposer « et sur 10 000 € ? »
   * à quelqu'un qui regarde ses 340 € transformerait une lecture de son
   * portefeuille en simulation, ce que cet écran n'est pas.
   */
  fixedAmount?: number | null;
  /** Clé i18n de la phrase d'ouverture — `euro_breakdown.lead` par défaut. */
  leadKey?: string;
  /** `card` : le bloc porte sa propre carte. `bare` : il est déjà dans une. */
  variant?: "card" | "bare";
  className?: string;
}

export function EuroBreakdownBlock({
  holdings,
  asOf,
  source,
  sourceUrl,
  ter = null,
  fixedAmount = null,
  leadKey = "euro_breakdown.lead",
  variant = "card",
  className,
}: Props) {
  const { t } = useTranslation();
  const { lang } = useLang();
  const [chosen, setChosen] = useState<number>(DEFAULT_REFERENCE_AMOUNT);
  // Un montant imposé nul ou négatif n'en est pas un : on retombe sur la
  // référence plutôt que de rendre un bloc vide (`buildEuroBreakdown` refuse
  // les montants absurdes, et l'utilisateur verrait « composition non
  // publiée » pour une raison qui n'a rien à voir avec la composition).
  const pinned = typeof fixedAmount === "number" && Number.isFinite(fixedAmount) && fixedAmount > 0;
  const amount = pinned ? (fixedAmount as number) : chosen;

  const breakdown = useMemo(
    () => buildEuroBreakdown(holdings, { amount, ter }),
    [holdings, amount, ter],
  );

  const shell = cn(variant === "card" && "paper-card p-6 md:p-7", className);

  // ── Rien de publié : on explique, on ne dessine pas un vide. ────────────
  if (!breakdown) {
    return (
      <section className={shell}>
        <p className="stamp">{t("euro_breakdown.eyebrow")}</p>
        <p className="mt-2.5 text-body-lg leading-snug text-ink">
          {t("euro_breakdown.empty_title")}
        </p>
        <p className="mt-2 text-body-sm leading-relaxed text-ink-2 max-w-[56ch]">
          {t("euro_breakdown.empty_body")}
        </p>
      </section>
    );
  }

  const freshness = holdingsFreshness(asOf);
  const ageDays = holdingsAgeDays(asOf);

  // Échelle des barres : la plus grosse ligne occupe toute la largeur. Une
  // échelle absolue (sur le montant total) écraserait toutes les lignes d'un
  // fonds bien diversifié en filets illisibles.
  const rows: Row[] = [
    ...breakdown.sectors.map((s) => ({ ...s, tone: "known" as const })),
    ...(breakdown.sectorsRestEuros > 0
      ? [
          {
            key: t("euro_breakdown.sectors_rest"),
            euros: breakdown.sectorsRestEuros,
            weightPct: (breakdown.sectorsRestEuros / breakdown.amount) * 100,
            tone: "known" as const,
          },
        ]
      : []),
    ...(breakdown.sectorUnknownEuros > 0
      ? [
          {
            key: t("euro_breakdown.sector_unknown"),
            euros: breakdown.sectorUnknownEuros,
            weightPct: (breakdown.sectorUnknownEuros / breakdown.amount) * 100,
            tone: "unknown" as const,
          },
        ]
      : []),
    ...(breakdown.undescribedEuros > 0.5
      ? [
          {
            key: t("euro_breakdown.undescribed"),
            euros: breakdown.undescribedEuros,
            weightPct: (breakdown.undescribedEuros / breakdown.amount) * 100,
            tone: "gap" as const,
          },
        ]
      : []),
  ];
  const scale = Math.max(...rows.map((r) => r.euros), 1);

  return (
    <section className={shell}>
      {/* ── L'annonce, et le montant de référence ───────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <p className="stamp">{t("euro_breakdown.eyebrow")}</p>
          <p className="mt-2 font-display text-[clamp(19px,2.6vw,24px)] leading-[1.15] tracking-[-0.02em] text-ink max-w-[22ch]">
            {t(leadKey, { amount: euros(amount, lang) })}
          </p>
        </div>

        {!pinned && (
          <div
            role="group"
            aria-label={t("euro_breakdown.amount_label")}
            className="flex flex-none items-center gap-1.5"
          >
            {REFERENCE_AMOUNTS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setChosen(a)}
                aria-pressed={a === amount}
                className={cn(
                  "min-h-[36px] px-3 rounded-[100px] border text-label font-semibold tabular-nums transition-colors",
                  "outline-none focus-visible:ring-2 focus-visible:ring-ink",
                  a === amount
                    ? "border-ink bg-ink text-paper"
                    : "border-paper-3 text-ink-2 hover:text-ink hover:border-ink-3",
                )}
              >
                {euros(a, lang)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Les euros, ligne par ligne ──────────────────────────────────── */}
      {/* Largeur de lecture bornée : sur un écran large, une barre de 6 px
          étirée sur mille pixels ne se lit plus comme une part, elle se lit
          comme un filet de séparation. */}
      <ul className="mt-7 flex max-w-[620px] flex-col gap-3.5">
        {rows.map((row, i) => (
          <EuroRow
            key={row.key}
            row={row}
            scale={scale}
            lang={lang}
            /* Les lignes de tête sont des SECTEURS, classés par montant. Les
               suivantes n'en sont pas : « secteur non publié » et « destination
               non décrite » sont des trous de la donnée. Sans ce filet, elles se
               lisent comme deux secteurs mal classés — leur montant casse
               l'ordre décroissant et le graphique paraît faux. */
            separated={row.tone !== "known" && rows[i - 1]?.tone === "known"}
          />
        ))}
      </ul>

      {/* ── Ce que l'écart veut dire, quand il y en a un ────────────────── */}
      {breakdown.undescribedEuros > 0.5 && (
        <p className="mt-5 text-body-sm leading-relaxed text-ink-2 max-w-[62ch]">
          {t("euro_breakdown.undescribed_note")}
        </p>
      )}
      {breakdown.publishedOver100 && (
        <p className="mt-3 text-body-sm leading-relaxed text-ink-2 max-w-[62ch]">
          {t("euro_breakdown.over_100", {
            pct: formatPercent(breakdown.totalWeightPct / 100, lang, 1),
          })}
        </p>
      )}

      {/* ── Ce que ces euros coûtent chaque année ───────────────────────── */}
      <p className="mt-5 pt-5 border-t border-paper-3 text-body-sm leading-relaxed text-ink-2">
        {breakdown.feesPerYear == null
          ? t("euro_breakdown.fees_unknown")
          : t("euro_breakdown.fees", { amount: euros(breakdown.feesPerYear, lang, 2) })}
      </p>

      {/* L'âge de la composition reste au premier niveau : il conditionne le
          sens même de la phrase d'ouverture. */}
      <p className={cn("mt-2 text-caption leading-relaxed", FRESHNESS_TONE[freshness])}>
        {asOf
          ? t(`holdings.freshness.${freshness}`, {
              date: formatDate(asOf, lang, { year: "numeric", month: "long", day: "numeric" }),
              days: ageDays ?? 0,
            })
          : t("holdings.freshness.unknown")}
      </p>

      {/* ── NIVEAU 2 — les entreprises, et d'où vient tout ça ───────────── */}
      <div className="border-t border-paper-3">
        <WhyThis variant="section" label={t("euro_breakdown.companies_label")}>
          <ul className="divide-y divide-paper-3 border-t border-paper-3">
            {breakdown.companies.map((c) => (
              <li key={c.key} className="flex items-baseline gap-3 py-2">
                <span className="font-value text-body-sm tabular-nums text-ink w-[5.5rem] flex-none">
                  {euros(c.euros, lang, 2)}
                </span>
                <span className="min-w-0 flex-1 text-body-sm text-ink-2">{c.key}</span>
              </li>
            ))}
            {breakdown.companiesRestCount > 0 && (
              <li className="flex items-baseline gap-3 py-2">
                <span className="font-value text-body-sm tabular-nums text-ink-3 w-[5.5rem] flex-none">
                  {euros(breakdown.companiesRestEuros, lang, 2)}
                </span>
                <span className="min-w-0 flex-1 text-body-sm text-ink-3">
                  {t("euro_breakdown.companies_rest", { count: breakdown.companiesRestCount })}
                </span>
              </li>
            )}
          </ul>

          <div className="mt-4 flex flex-col gap-1">
            <p className="text-caption text-ink-3 leading-relaxed">
              {source ? t("euro_breakdown.source", { source }) : t("euro_breakdown.source_missing")}
              {sourceUrl && (
                <>
                  {" · "}
                  <a
                    href={sourceUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="underline underline-offset-2 hover:no-underline"
                  >
                    {t("euro_breakdown.source_link")}
                  </a>
                </>
              )}
            </p>
            <p className="text-caption text-ink-3 leading-relaxed">
              {t("euro_breakdown.lines", { count: breakdown.lineCount })}
            </p>
            <p className="mt-2 text-caption text-ink-3 leading-relaxed max-w-[62ch]">
              {t("euro_breakdown.disclaimer")}
            </p>
          </div>
        </WhyThis>
      </div>
    </section>
  );
}

/* ─────────────────────────────── Une ligne ─────────────────────────────── */

type Row = EuroSlice & { tone: "known" | "unknown" | "gap" };

/**
 * La barre est décorative : le montant et le libellé disent déjà tout, donc
 * aucune information ne repose sur la couleur ni sur la longueur (§4). Les
 * deux écarts prennent une teinte plus pâle pour ne pas se lire comme une
 * exposition mesurée — mais ils restent nommés en toutes lettres.
 */
function EuroRow({
  row,
  scale,
  lang,
  separated = false,
}: {
  row: Row;
  scale: number;
  lang: Lang;
  separated?: boolean;
}) {
  const width = Math.max(2, Math.round((row.euros / scale) * 100));
  return (
    <li className={separated ? "border-t border-paper-3 pt-3.5" : undefined}>
      <div className="flex items-baseline gap-3">
        <span
          className={cn(
            "font-value tabular-nums flex-none w-[5.5rem] text-[clamp(15px,2vw,17px)]",
            row.tone === "known" ? "text-ink" : "text-ink-3",
          )}
        >
          {euros(row.euros, lang)}
        </span>
        <span
          className={cn(
            "min-w-0 flex-1 text-body-sm leading-snug",
            row.tone === "known" ? "text-ink" : "text-ink-3",
          )}
        >
          {row.key}
        </span>
      </div>
      <div
        aria-hidden
        className="mt-1.5 ml-[calc(5.5rem+0.75rem)] h-[6px] rounded-[100px] bg-paper-inset overflow-hidden"
      >
        {/* La part non décrite n'est pas une exposition : elle se dessine
            creuse — un contour, pas un aplat — pour qu'on ne la lise pas comme
            un secteur de plus. Le libellé reste seul porteur du sens (§4) ; la
            barre ne fait que l'accompagner. */}
        <div
          className={cn(
            "h-full rounded-[100px]",
            row.tone === "known"
              ? "bg-ink"
              : row.tone === "unknown"
                ? "bg-ink-3"
                : "border border-paper-3 bg-transparent",
          )}
          style={{ width: `${width}%` }}
        />
      </div>
    </li>
  );
}

/**
 * Les euros s'affichent SANS centimes par défaut : « 314 € » se retient,
 * « 314,00 € » se déchiffre. Les frais, eux, valent quelques euros et méritent
 * leurs décimales — d'où le paramètre.
 */
function euros(value: number, lang: Lang, digits = 0) {
  return new Intl.NumberFormat(lang === "en" ? "en-US" : "fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}
