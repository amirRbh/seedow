import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { getObservatoryFund } from "@/lib/esg/v2/observatory.functions";
import { EuroBreakdownBlock } from "@/components/impact/EuroBreakdownBlock";
import { hasPublishedComposition } from "@/lib/impact/euroBreakdown";
import { LanguageToggle } from "@/components/LanguageToggle";
import { WhyThis } from "@/components/common/WhyThis";
import { StiScore } from "@/components/observatory/StiScore";
import { StiBlocks } from "@/components/observatory/StiBlocks";
import { DiscrepancyCard } from "@/components/observatory/DiscrepancyCard";
import { ThemeClaims } from "@/components/observatory/ThemeClaims";
import { SectorDisclosureList } from "@/components/observatory/SectorDisclosure";
import { STI_VERSION } from "@/lib/esg/v2/sti";
import { siteUrl, socialMeta } from "@/lib/seo/socialMeta";

/**
 * La fiche d'un fonds — grille STI 2.0.
 *
 * ── Les trois objets, strictement séparés (spec §2) ────────────────────────
 *
 *   INDICE DE TRANSPARENCE   fait documentaire      agrégé en 0–100
 *   CONSTATS D'ÉCART         contradiction sourcée  jamais agrégés
 *   FAITS BRUTS              donnée publiée         jamais agrégés
 *
 * L'erreur structurelle de la v1 était de mélanger ces trois natures dans un
 * même chiffre — un « score de durabilité » qui additionnait une donnée MSCI,
 * une estimation carbone et un décompte d'exclusions, puis servait ensuite à
 * détecter des écarts avec lui-même. La page les tient désormais dans trois
 * blocs qui ne communiquent pas : un fonds peut afficher un STI de 90 ET porter
 * un constat. Cela veut dire qu'il publie beaucoup, et que dans ce qu'il publie
 * il y a une contradiction — c'est l'usage le plus intéressant de la page, et il
 * serait invisible si le constat faisait baisser le score.
 *
 * ── L'ordre de lecture ─────────────────────────────────────────────────────
 *
 *   1. la composition publiée, DITE EN EUROS. Seule chose de la page qui se
 *      comprend sans rien savoir de la finance ; elle passe donc devant.
 *   2. l'indice de transparence, avec son taux de couverture au même niveau
 *      visuel — jamais un chiffre seul.
 *   3. les constats, en trois lignes fixes, avec le droit de réponse.
 *   4. les faits bruts et les limites, dépliables.
 */
export const Route = createFileRoute("/fonds/$isin")({
  loader: async ({ params }) => {
    const data = await getObservatoryFund({ data: params.isin });
    if (!data) throw notFound();
    return data;
  },
  head: ({ params, loaderData }) => {
    const fund = loaderData?.fund;
    if (!fund) return { meta: [{ title: "Fonds — Seedow" }] };
    const title = `${fund.name} : que publie ce fonds ? — Seedow`;
    const description = `Ce que ${fund.name} publie, et à quel niveau de précision : indice de transparence Seedow (STI ${STI_VERSION}), documents sourcés et datés, constats d'écart opposables.`;
    const path = `/fonds/${params.isin}`;
    return {
      meta: socialMeta({ title, description, path, type: "article" }),
      links: [{ rel: "canonical", href: siteUrl(path) }],
    };
  },
  component: FundAuthorityPage,
});

function FundAuthorityPage() {
  const { fund, peers, holdings, holdingsAsOf, holdingsSourceUrl } = Route.useLoaderData();
  const { t } = useTranslation();

  const composed = hasPublishedComposition(holdings ?? []);
  const identifiers = fund.isins.length > 0 ? fund.isins : fund.tickers;

  return (
    <div className="min-h-screen bg-paper-2 text-ink">
      <header className="max-w-3xl mx-auto px-6 pt-8 pb-5 flex items-center justify-between gap-4">
        <Link to="/observatoire" className="stamp hover:text-ink transition-colors">
          {t("fonds_page.back")}
        </Link>
        <LanguageToggle />
      </header>

      <div className="max-w-3xl mx-auto px-6 pb-16">
        {/* ── Identité — une seule fiche, tous les ISIN de parts dessous ──── */}
        <div>
          <p className="mono-meta">{fund.issuer ?? t("fonds_page.issuer_unknown")}</p>
          <h1 className="font-display text-[clamp(26px,4vw,42px)] leading-[1.06] tracking-[-0.02em] max-w-[20ch] mt-3">
            {fund.name}
          </h1>
          <p className="mono-meta mt-3">{identifiers.join(" · ")}</p>
          {identifiers.length > 1 && (
            <p className="mt-1.5 text-body-sm text-ink-3 leading-relaxed max-w-[62ch]">
              {t("fonds_page.share_classes_note", { n: identifiers.length })}
            </p>
          )}
        </div>

        {/* ── 1. La composition publiée, en euros (fait brut) ─────────────── */}
        {composed && (
          <EuroBreakdownBlock
            className="mt-8"
            holdings={holdings ?? []}
            asOf={holdingsAsOf ?? null}
            source={fund.issuer ?? null}
            sourceUrl={holdingsSourceUrl ?? null}
            ter={fund.ter ?? 0}
          />
        )}

        {/* ── 2. L'indice de transparence ─────────────────────────────────── */}
        <section className={`paper-card p-7 ${composed ? "mt-6" : "mt-8"}`}>
          <StiScore sti={fund.sti} size="lg" />

          <p className="mt-4 max-w-[62ch] text-body-sm leading-relaxed text-ink-2">
            {t("sti.what_it_measures")}
          </p>

          {/* Les dates encadrant le score : la plus ancienne donnée utilisée est
              affichée, parce qu'un score reproportionné sur des documents de
              2023 n'a pas la même valeur qu'un score calculé sur des documents
              du trimestre. */}
          {fund.sti.oldestDataDate && (
            <p className="mono-meta mt-3">
              {t("sti.oldest_data", { date: fund.sti.oldestDataDate })}
            </p>
          )}

          <div className="mt-6 pt-6 border-t border-paper-3">
            <StiBlocks sti={fund.sti} />
          </div>

          <div className="mt-6 border-t border-paper-3">
            <WhyThis variant="section" label={t("sti.why_no_sustainability_score")}>
              <p className="max-w-[62ch]">{t("sti.no_score_explanation")}</p>
              <Link
                to="/methodologie"
                className="mt-3 inline-block text-body-sm font-semibold text-ink underline underline-offset-4 hover:no-underline rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ink"
              >
                {t("observatoire.methodology_cta")} <span aria-hidden>→</span>
              </Link>
            </WhyThis>
          </div>
        </section>

        {/* ── 3. Les constats d'écart — jamais agrégés au score ───────────── */}
        <section className="mt-6">
          <h2 className="stamp">{t("constats.title")}</h2>
          {fund.discrepancies.length > 0 ? (
            <>
              <div className="mt-3 flex flex-col gap-3">
                {fund.discrepancies.map((d, i) => (
                  <DiscrepancyCard key={`${d.code}-${i}`} discrepancy={d} />
                ))}
              </div>
              <p className="mt-3 text-caption text-ink-3 leading-relaxed max-w-[62ch]">
                {t("constats.independence_note")}
              </p>
            </>
          ) : (
            <p className="paper-card mt-3 p-5 text-body-sm text-ink-2 leading-relaxed">
              {t("constats.none")}
            </p>
          )}
        </section>

        {/* ── 4. Faits bruts et limites ───────────────────────────────────── */}
        <section className="paper-card px-7 py-2 mt-6">
          <div className="border-b border-paper-3">
            <WhyThis variant="section" label={t("fonds_page.declared_title")}>
              <div className="pt-1 pb-5">
                <p className="stamp">{t("fonds_page.themes_declared")}</p>
                <ThemeClaims themes={fund.themes} />
                <p className="mt-3 text-caption text-ink-3 leading-relaxed max-w-[62ch]">
                  {t("themes.no_attribution_note")}
                </p>

                {/* Ce que la documentation dit des six secteurs. « Non vérifié »
                    y est écrit comme tel : Seedow assume son trou de collecte
                    plutôt que de le faire porter au fonds. */}
                <p className="stamp mt-7">{t("sti.sectors_title")}</p>
                <SectorDisclosureList sectors={fund.sectors} />
              </div>
            </WhyThis>
          </div>

          <div className="border-b border-paper-3">
            <WhyThis variant="section" label={t("fonds_page.figures_title")}>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-7 pt-2 pb-5">
                <Fact
                  label={t("fonds_page.metric_sfdr")}
                  value={fund.sfdrArticle != null ? `Article ${fund.sfdrArticle}` : "—"}
                />
                <Fact
                  label={t("fonds_page.metric_ter")}
                  value={
                    fund.ter != null ? `${(fund.ter * 100).toFixed(2).replace(".", ",")} %` : "—"
                  }
                />
                <Fact
                  label={t("fonds_page.metric_share_classes")}
                  value={String(identifiers.length)}
                />
              </div>
              <p className="pb-5 text-caption text-ink-3 leading-relaxed max-w-[62ch]">
                {t("fonds_page.raw_facts_note")}
              </p>
            </WhyThis>
          </div>

          <WhyThis variant="section" label={t("fonds_page.sources_title")}>
            <div className="pt-1 pb-5">
              <p className="max-w-[62ch]">{t("fonds_page.limits")}</p>
              {!composed && (
                <div className="mt-5">
                  <p className="font-semibold text-ink">{t("euro_breakdown.empty_title")}</p>
                  <p className="mt-1.5 max-w-[62ch]">{t("euro_breakdown.empty_body")}</p>
                </div>
              )}
              <p className="mono-meta mt-5">{t("sti.version", { version: fund.sti.version })}</p>
            </div>
          </WhyThis>
        </section>

        {/* ── Les pairs — jamais un classement général ────────────────────── */}
        {peers.length > 0 && (
          <section className="mt-8">
            <h2 className="stamp">{t("fonds_page.peers_title")}</h2>
            <p className="mt-2 text-body-sm text-ink-3 leading-relaxed max-w-[62ch]">
              {t("fonds_page.peers_note")}
            </p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {peers.slice(0, 12).map((p) => (
                <li key={p.key}>
                  <Link
                    to="/fonds/$isin"
                    params={{ isin: p.slug }}
                    className="chip hover:bg-paper-inset transition-colors rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ink"
                  >
                    {p.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
          <Link
            to="/observatoire"
            className="text-body font-semibold text-ink underline underline-offset-4 hover:no-underline rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ink"
          >
            {t("landing.observatory.cta")} <span aria-hidden>→</span>
          </Link>
          <Link
            to="/methodologie"
            className="text-body font-semibold text-ink-2 underline underline-offset-4 hover:no-underline rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ink"
          >
            {t("observatoire.methodology_cta")} <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

/** Un fait brut : repris à l'identique, jamais agrégé (spec §2). */
function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="stamp">{label}</p>
      <p className="font-value text-[24px] leading-none text-ink mt-2.5 tabular-nums">{value}</p>
    </div>
  );
}
