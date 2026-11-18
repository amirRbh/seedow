import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getObservatory } from "@/lib/esg/v2/observatory.functions";
import type { ObservatoryFund } from "@/lib/esg/v2/observatory";
import { STI_VERSION } from "@/lib/esg/v2/sti";
import { groupByPeers } from "@/lib/esg/v2/peer-group";
import { StiScore } from "@/components/observatory/StiScore";
import { motion } from "framer-motion";
import { PageHero, PublicPage } from "@/components/layout/PublicPage";
import { CountUp } from "@/components/motion/CountUp";
import { RevealGroup } from "@/components/motion/Reveal";
import { Button } from "@/components/ui/button";
import { EASE_SIGNATURE } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Observatoire — version 2 de la grille (STI 2.0).
 *
 * ── Ce que la page a cessé de faire ────────────────────────────────────────
 *
 * Elle ne classe plus les fonds par score de durabilité. Ce score est supprimé :
 * noter la durabilité suppose de mesurer un effet sur le monde, que Seedow
 * n'observe pas — et tout agrégat unique finit par poser un ETF nucléaire
 * au-dessus d'un ETF solaire. Elle n'affiche plus non plus 67 « écarts » dont 59
 * étaient des trous de données Seedow reformulés en reproche.
 *
 * ── Ce qu'elle fait ────────────────────────────────────────────────────────
 *
 * Elle publie ce que chaque fonds PUBLIE : l'indice de transparence, calculé sur
 * des faits documentaires, avec le nombre de blocs réellement évalués à côté du
 * chiffre — jamais l'un sans l'autre. Et, séparément, les constats d'écart
 * opposables : une revendication citée, un fait public qui la contredit, aucune
 * inférence entre les deux.
 *
 * ── Deux règles d'affichage qui ne se négocient pas ────────────────────────
 *
 *  1. **Aucun tri global par score.** Les fonds sont regroupés par groupe de
 *     pairs (classe d'actifs, zone, thématique déclarée) et rangés par nom à
 *     l'intérieur. C'est ce qui empêche structurellement le titre « Seedow note
 *     le nucléaire mieux que le solaire » : les deux ne sont plus dans le même
 *     tableau. Une règle seulement écrite dans une doc finit contournée par la
 *     surface d'affichage suivante.
 *
 *  2. **Le taux de fonds non notables est en tête**, avant tout classement.
 *     C'est le chiffre qui dit ce que le catalogue ne sait pas — et c'est un
 *     meilleur titre que n'importe quel palmarès.
 */
export const Route = createFileRoute("/observatoire")({
  loader: async () => await getObservatory(),
  head: () => ({
    meta: [
      { title: "Observatoire de la transparence — Seedow" },
      {
        name: "description",
        content:
          "Ce que chaque fonds publie, et à quel niveau de précision. Indice de transparence Seedow, constats d'écart sourcés et datés, droit de réponse des émetteurs.",
      },
    ],
  }),
  component: ObservatoryPage,
});

type Filter = "all" | "rated" | "gaps";

function ObservatoryPage() {
  const { funds, stats } = Route.useLoaderData();
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = funds.filter((f) => {
      if (filter === "rated" && !f.sti.publishable) return false;
      if (filter === "gaps" && f.discrepancies.length === 0) return false;
      if (!q) return true;
      return (
        f.name.toLowerCase().includes(q) ||
        (f.issuer ?? "").toLowerCase().includes(q) ||
        f.isins.some((i) => i.toLowerCase().includes(q)) ||
        f.tickers.some((tk) => tk.toLowerCase().includes(q))
      );
    });
    // Le tri est alphabétique, à l'intérieur d'un groupe de pairs uniquement.
    // Aucun ordre par score n'est possible ici, et c'est volontaire.
    return groupByPeers(filtered, (f) => f.peer)
      .map((g) => ({ ...g, items: [...g.items].sort((a, b) => a.name.localeCompare(b.name)) }))
      .sort((a, b) => a.group.key.localeCompare(b.group.key));
  }, [funds, query, filter]);

  const FILTERS: { id: Filter; label: string }[] = [
    { id: "all", label: t("observatoire.filter_all") },
    { id: "rated", label: t("observatoire.filter_rated") },
    { id: "gaps", label: t("observatoire.filter_gaps") },
  ];

  return (
    <PublicPage accent="ice">
      <PageHero
        eyebrow={t("landing.observatory.eyebrow")}
        title={t("observatoire.title")}
        subtitle={t("observatoire.intro")}
        align="left"
      />

      {/* Les trois chiffres de tête, calculés sur le catalogue lui-même. Le
          premier est le taux de fonds NON NOTABLES : ce que Seedow ne sait pas
          passe devant ce qu'il sait. */}
      <section className="mx-auto max-w-[1160px] px-5 sm:px-7">
        <RevealGroup className="grid gap-4 sm:grid-cols-3">
          <Counter
            value={stats.notRatablePct}
            suffix=" %"
            label={t("observatoire.stat_not_ratable")}
          />
          <Counter value={stats.funds} label={t("observatoire.stat_funds")} />
          <Counter value={stats.withDiscrepancy} label={t("observatoire.stat_gaps")} />
        </RevealGroup>
        <p className="mt-5 max-w-[66ch] text-body-sm leading-relaxed text-ink-3">
          {t("observatoire.stat_note", { lines: stats.lines, funds: stats.funds })}
        </p>
        <p className="mono-meta mt-2">{t("sti.version", { version: STI_VERSION })}</p>
      </section>

      <div className="mx-auto max-w-[1160px] px-5 pt-12 pb-8 sm:px-7">
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="observatoire-search" className="sr-only">
            {t("observatoire.search")}
          </label>
          <input
            id="observatoire-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("observatoire.search")}
            className="field min-w-[200px] flex-1"
          />
          <div
            role="group"
            aria-label={t("observatoire.filter_aria")}
            className="inline-flex items-center gap-1 rounded-full bg-paper-inset p-1"
          >
            {FILTERS.map((f) => {
              const active = filter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  aria-pressed={active}
                  className={cn(
                    "relative min-h-[44px] rounded-full px-4 text-label font-bold outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-mint",
                    active ? "text-ink" : "text-ink-3 hover:text-ink",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="observatoire-filter"
                      aria-hidden
                      className="absolute inset-0 rounded-full bg-paper shadow-card"
                      transition={{ duration: 0.32, ease: EASE_SIGNATURE }}
                    />
                  )}
                  <span className="relative">{f.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {groups.length === 0 ? (
          <p className="paper-card mt-6 p-8 text-center text-body text-ink-2">
            {t("observatoire.empty")}
          </p>
        ) : (
          groups.map(({ group, items }) => (
            <section key={group.key} className="mt-10">
              {/* L'intitulé du groupe de pairs est écrit : sans lui, le lecteur
                  croit lire un classement général. */}
              <h2 className="stamp">
                {t("observatoire.peer_group", {
                  assetClass: t(`asset_class.${group.assetClass}`, {
                    defaultValue: group.assetClass,
                  }),
                  region: t(`region.${group.region}`, { defaultValue: group.region }),
                  theme: t(`landing.rayon_x.themes_labels.${group.declaredTheme}`, {
                    defaultValue: t("observatoire.no_declared_theme"),
                  }),
                })}
              </h2>
              <ul className="mt-3 grid gap-3 lg:grid-cols-2">
                {items.map((f) => (
                  <FundRow key={f.key} fund={f} />
                ))}
              </ul>
            </section>
          ))
        )}

        <p className="mt-10 text-body-sm leading-relaxed text-ink-3 max-w-[66ch]">
          {t("observatoire.hint")}
        </p>
        <Button asChild variant="outline" className="mt-5">
          <Link to="/methodologie">
            {t("observatoire.methodology_cta")} <span aria-hidden>→</span>
          </Link>
        </Button>
      </div>
    </PublicPage>
  );
}

/** Un chiffre de tête : il compte jusqu'à sa valeur à l'entrée dans l'écran. */
function Counter({ value, suffix = "", label }: { value: number; suffix?: string; label: string }) {
  return (
    <div className="paper-card spot p-6 sm:p-7">
      <p className="font-display text-[clamp(40px,6vw,60px)] font-extrabold leading-none tracking-[-0.04em] text-ink">
        <CountUp value={value} />
        {suffix}
      </p>
      <p className="mt-3 max-w-[30ch] text-body leading-snug text-ink-2">{label}</p>
    </div>
  );
}

/**
 * Une ligne = un FONDS, pas une part de classe. Les ISIN des parts sont listés
 * dessous : c'est la déduplication rendue visible, et c'est aussi ce qui répond
 * d'avance à « pourquoi ce fonds apparaissait-il deux fois avec deux notes ? ».
 */
function FundRow({ fund }: { fund: ObservatoryFund }) {
  const { t } = useTranslation();
  const identifiers = fund.isins.length > 0 ? fund.isins : fund.tickers;

  return (
    <li>
      <Link
        to="/fonds/$isin"
        params={{ isin: fund.slug }}
        className="paper-card spot lift block h-full p-5 outline-none focus-visible:ring-2 focus-visible:ring-mint sm:p-6"
      >
        <div className="flex items-start justify-between gap-5">
          <div className="min-w-0">
            <p className="text-body font-semibold text-ink">{fund.name}</p>
            <p className="mono-meta mt-0.5 truncate">
              {[identifiers.join(" · "), fund.issuer].filter(Boolean).join(" — ")}
            </p>
            {identifiers.length > 1 && (
              <p className="mono-meta mt-1 text-ink-3">
                {t("observatoire.share_classes", { n: identifiers.length })}
              </p>
            )}
          </div>
          <StiScore sti={fund.sti} size="sm" className="shrink-0 text-right" />
        </div>

        <div className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <div>
            <p className="stamp">{t("observatoire.col_declared")}</p>
            <p className="mt-1.5 text-body-sm leading-snug text-ink-2">
              {[
                fund.sfdrArticle != null ? `Article ${fund.sfdrArticle} SFDR` : null,
                ...fund.themes
                  .filter((th) => th.level === "revendique")
                  .map((th) =>
                    t(`landing.rayon_x.themes_labels.${th.tag}`, { defaultValue: th.tag }),
                  ),
              ]
                .filter(Boolean)
                .join(" · ") || t("observatoire.claim_none")}
            </p>
          </div>
          <div>
            <p className="stamp">{t("observatoire.col_gaps")}</p>
            {fund.discrepancies.length > 0 ? (
              <ul className="mt-1.5 flex flex-col gap-1">
                {fund.discrepancies.map((d, i) => (
                  <li key={`${d.code}-${i}`} className="text-body-sm leading-snug text-ink">
                    <span className="mono-meta mr-1.5">{d.code}</span>
                    {t(`constats.type.${d.code}`)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1.5 text-body-sm leading-snug text-ink-2">
                {t("observatoire.no_gap")}
              </p>
            )}
          </div>
        </div>
      </Link>
    </li>
  );
}
