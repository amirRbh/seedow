import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { getPublicFundByIsin } from "@/lib/esg/public-fund.functions";
import { EuroBreakdownBlock } from "@/components/impact/EuroBreakdownBlock";
import { hasPublishedComposition } from "@/lib/impact/euroBreakdown";
import type { PublicFundAsset } from "@/lib/esg/public-fund";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Provenance } from "@/components/ui/Provenance";
import { WhyThis } from "@/components/common/WhyThis";
import { SeedowScore, ScorePillars } from "@/components/esg/SeedowScore";
import { notExcluded } from "@/lib/esg/exclusions";
import { siteUrl, socialMeta } from "@/lib/seo/socialMeta";

/**
 * La fiche d'un fonds — trois niveaux de lecture, dans cet ordre.
 *
 * ── Ce qu'elle était ───────────────────────────────────────────────────────
 *
 * Sept cartes de poids égal empilées : score, grille de métriques, risque,
 * exclusions, composition, thèmes, source. Toutes ouvertes, toutes au même
 * niveau typographique. Un débutant y lisait un document réglementaire ; un
 * professionnel devait quand même tout parcourir pour trouver les deux chiffres
 * qui l'intéressaient. Une page qui ne hiérarchise pas ne sert bien personne.
 *
 * ── Ce qu'elle est ─────────────────────────────────────────────────────────
 *
 *   Niveau 1, ouvert   — la composition publiée, DITE EN EUROS sur un montant
 *                        de référence. C'est la seule chose de cette page qui
 *                        se comprend sans rien savoir de la finance, donc elle
 *                        passe devant tout le reste. Le bloc gère lui-même,
 *                        franchement, le cas où l'émetteur n'a rien publié.
 *   Niveau 1 bis, ouvert — ce que le fonds REVENDIQUE (thèmes déclarés, ce
 *                        qu'il ne s'interdit pas), son score et ses frais. On
 *                        lit d'abord ce qu'il détient, ensuite ce qu'il dit.
 *   Niveau 2, replié   — pourquoi ce score : les piliers du composite.
 *   Niveau 3, replié   — la grille complète, les sources, les écarts relevés,
 *                        et ce que Seedow ne mesure pas.
 *
 * Rien n'a été retiré : tout ce qui était affiché l'est encore, à un niveau qui
 * correspond à la question qu'il répond. Replier n'est pas masquer tant que le
 * déclencheur est écrit en toutes lettres.
 *
 * Jamais de verdict au-delà de ce que dit la donnée (§1.3) : le risque
 * greenwashing reste un « écart à vérifier », avec ses raisons.
 */
export const Route = createFileRoute("/fonds/$isin")({
  loader: async ({ params }) => {
    const fund = await getPublicFundByIsin({ data: params.isin });
    if (!fund) throw notFound();
    return { fund };
  },
  head: ({ params, loaderData }) => {
    const fund = loaderData?.fund;
    if (!fund) return { meta: [{ title: "Fonds — Seedow" }] };
    const title = `${fund.name} : ce fonds finance quoi ? — Seedow`;
    const description = `Données sourcées et datées sur ${fund.name} (${fund.isin ?? fund.ticker}) : ce qu'il finance, ce qu'il ne s'interdit pas, score Seedow, empreinte carbone, article SFDR.`;
    const path = `/fonds/${params.isin}`;
    return {
      meta: socialMeta({
        title,
        description,
        path,
        type: "article",
      }),
      links: [{ rel: "canonical", href: siteUrl(path) }],
    };
  },
  component: FundAuthorityPage,
});

const RISK_LABEL: Record<PublicFundAsset["greenwashing_risk"], string> = {
  low: "fonds_page.risk_low",
  medium: "fonds_page.risk_medium",
  high: "fonds_page.risk_high",
};

/**
 * Le risque greenwashing est un STATUT DE PREUVE, pas une humeur : il prend la
 * pastille correspondante, et son libellé est toujours écrit (jamais porté par
 * la seule couleur — CLAUDE.md §4).
 *
 * Ces trois badges portaient les classes `stamp-tag` / `stamp-tag--proof` /
 * `stamp-tag--modelled` / `stamp-tag--flag`. Aucune n'existe : elles ne sont
 * définies nulle part dans la feuille de style, et cette page était le seul
 * endroit du produit à les invoquer. Les badges sortaient donc en texte brut
 * collé, sans fond ni séparation — « Article 8 SFDR Modéré — certains signaux
 * à vérifier ESG large » sur une seule ligne. Ils prennent le `.chip` de la
 * DA V3, qui est la primitive réelle, avec ses variantes de statut.
 */
const RISK_CHIP: Record<PublicFundAsset["greenwashing_risk"], string> = {
  low: "chip--verified",
  medium: "chip--modelled",
  high: "chip--disputed",
};

const TIER_LABEL: Record<PublicFundAsset["sustainability_tier"], string> = {
  paris_aligned: "fonds_page.tier_paris_aligned",
  transition: "fonds_page.tier_transition",
  broad_esg: "fonds_page.tier_broad_esg",
  insufficient_evidence: "fonds_page.tier_insufficient",
};

function FundAuthorityPage() {
  const { fund } = Route.useLoaderData();
  const { t } = useTranslation();

  const allowed = notExcluded(fund.excluded_sectors);
  // La traduction en euros ouvre la page quand elle a de quoi parler. Sinon
  // elle descend au niveau des sources : une fiche qui s'ouvre sur
  // « composition non publiée » remplit d'une absence le seul emplacement
  // censé porter la réponse. L'absence est dite, plus bas, à sa place.
  const composed = hasPublishedComposition(fund.holdings ?? []);
  const sourceLabel = fund.source ?? t("fonds_page.source_unknown");

  return (
    <div className="min-h-screen bg-paper-2 text-ink">
      <header className="max-w-3xl mx-auto px-6 pt-8 pb-5 flex items-center justify-between gap-4">
        {/* La fiche se lit surtout depuis un moteur de recherche : le retour
            doit ramener là où les autres fonds vivent, pas dans un diaporama
            d'introduction. */}
        <Link to="/observatoire" className="stamp hover:text-ink transition-colors">
          {t("fonds_page.back")}
        </Link>
        <LanguageToggle />
      </header>

      <div className="max-w-3xl mx-auto px-6 pb-16">
        {/* ── Identité ──────────────────────────────────────────────────── */}
        <div>
          <p className="mono-meta">
            {[fund.isin ?? fund.ticker, fund.issuer].filter(Boolean).join(" · ")}
          </p>
          <h1 className="font-display text-[clamp(26px,4vw,42px)] leading-[1.06] tracking-[-0.02em] max-w-[18ch] mt-3">
            {fund.name}
          </h1>
          <div className="flex flex-wrap gap-2 mt-4">
            {/* L'article SFDR est une REVENDICATION du fonds, pas une preuve :
                pastille neutre. Le statut de preuve, lui, est porté par le
                risque greenwashing juste à côté. */}
            {fund.sfdr_article != null && (
              <span className="chip">Article {fund.sfdr_article} SFDR</span>
            )}
            <span className={`chip ${RISK_CHIP[fund.greenwashing_risk]}`}>
              {t(RISK_LABEL[fund.greenwashing_risk])}
            </span>
            <span className="chip">{t(TIER_LABEL[fund.sustainability_tier])}</span>
          </div>
        </div>

        {/* ── NIVEAU 1 — la réponse, en euros ───────────────────────────
            Le premier bloc de la page est celui qui se comprend sans rien
            savoir de la finance : la composition publiée, dite en euros sur un
            montant de référence. Le score, les piliers et la grille SFDR
            viennent après — ils répondent à une question qu'on ne se pose
            qu'une fois la première comprise. */}
        {composed && (
          <EuroBreakdownBlock
            className="mt-8"
            holdings={fund.holdings ?? []}
            asOf={fund.holdingsAsOf ?? null}
            source={fund.issuer ?? null}
            sourceUrl={fund.holdingsSourceUrl ?? null}
            ter={fund.ter}
          />
        )}

        {/* ── NIVEAU 1 bis — ce que le fonds revendique ──────────────────── */}

        <section className={`paper-card p-7 ${composed ? "mt-6" : "mt-8"}`}>
          <div className="grid gap-7 sm:grid-cols-2">
            <div>
              <p className="stamp">{t("fonds_page.what_it_finances")}</p>
              {fund.themes.length > 0 ? (
                <ul className="mt-2.5">
                  {fund.themes.map((th) => (
                    <li
                      key={th.tag}
                      className="flex items-baseline justify-between gap-3 py-2 border-b border-paper-3"
                    >
                      <span className="text-body-sm text-ink">
                        {t(`landing.rayon_x.themes_labels.${th.tag}`, { defaultValue: th.tag })}
                      </span>
                      <span className="font-value text-body-sm tabular-nums text-ink">
                        {th.pct} %
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2.5 text-body-sm text-ink-3 leading-relaxed">
                  {t("xray.finances_empty")}
                </p>
              )}
              {/* Une appréciation Seedow, dite comme telle — la mesure, elle,
                  est le bloc en euros au-dessus. */}
              <p className="mt-3 text-caption text-ink-3 leading-relaxed">
                {t("xray.finances_note")}
              </p>
            </div>

            <div>
              <p className="stamp">{t("fonds_page.what_it_allows")}</p>
              {allowed.length > 0 ? (
                <>
                  <ul className="mt-2.5 flex flex-wrap gap-2">
                    {allowed.map((s) => (
                      <li key={s} className="chip chip--modelled">
                        {t(`landing.rayon_x.sectors_labels.${s}`, { defaultValue: s })}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-body-sm text-ink-3 leading-relaxed">
                    {t("xray.not_excluded_note")}
                  </p>
                </>
              ) : (
                <p className="mt-2.5 text-body-sm text-ink-2 leading-relaxed">
                  {t("xray.not_excluded_empty")}
                </p>
              )}
            </div>
          </div>

          <div className="mt-7 pt-6 border-t border-paper-3 flex flex-wrap items-start justify-between gap-x-8 gap-y-5">
            <SeedowScore score={fund.seedow_score} size="md" />
            <div className="max-w-[34ch]">
              <p className="stamp">{t("xray.cost_label")}</p>
              <p className="font-value text-[24px] leading-none text-ink mt-2 tabular-nums">
                {(fund.ter * 100).toFixed(2).replace(".", ",")} %
              </p>
              <p className="mt-2 text-body-sm text-ink-3 leading-relaxed">{t("xray.cost_note")}</p>
            </div>
          </div>

          {/* ── NIVEAU 2 — pourquoi ce nombre ─────────────────────────── */}
          <div className="mt-6 border-t border-paper-3">
            <WhyThis variant="section" label={t("fonds_page.why_score")}>
              <p className="mb-4 max-w-[62ch]">{t("xray.why_score_intro")}</p>
              <ScorePillars pillars={fund.score_breakdown} />
              {fund.sustainability_drivers.length > 0 && (
                <p className="mt-4 text-caption text-ink-3 leading-relaxed">
                  {fund.sustainability_drivers.join(" · ")}
                </p>
              )}
              <p className="mt-4 text-caption text-ink-3 leading-relaxed max-w-[62ch]">
                {t("xray.score_is_index")}
              </p>
            </WhyThis>
          </div>
        </section>

        {/* ── NIVEAU 3 — la profondeur, à la demande ────────────────────── */}

        <section className="paper-card px-7 py-2 mt-6">
          <div className="border-b border-paper-3">
            <WhyThis variant="section" label={t("fonds_page.figures_title")}>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-7 pt-2 pb-5">
                <Metric label={t("fonds_page.metric_esg")} value={`${fund.esg.toFixed(1)}/10`} />
                <Metric
                  label={t("fonds_page.metric_climate")}
                  value={`${fund.climate.toFixed(1)}/10`}
                />
                <Metric
                  label={t("fonds_page.metric_ter")}
                  value={`${(fund.ter * 100).toFixed(2).replace(".", ",")} %`}
                />
                <Metric
                  label={t("fonds_page.metric_sfdr")}
                  value={fund.sfdr_article != null ? `Article ${fund.sfdr_article}` : "—"}
                />
                <Metric
                  label={t("fonds_page.metric_carbon")}
                  value={
                    fund.carbon_intensity != null
                      ? `${Math.round(fund.carbon_intensity)} gCO₂e/€`
                      : "—"
                  }
                />
                <Metric label={t("fonds_page.metric_temp")} value={fund.implied_temp_rise ?? "—"} />
              </div>
              {fund.excluded_sectors.length > 0 && (
                <div className="pb-5">
                  <p className="stamp">{t("fonds_page.exclusions_title")}</p>
                  <p className="mt-2 text-body-sm text-ink-2 leading-relaxed">
                    {fund.excluded_sectors.join(" · ")}
                  </p>
                </div>
              )}
            </WhyThis>
          </div>

          <WhyThis variant="section" label={t("fonds_page.sources_title")}>
            <div className="pt-1 pb-5">
              <Provenance
                status={fund.coverage === "estimated" ? "modelled" : "verified"}
                source={sourceLabel}
                asOf={fund.data_asof ?? undefined}
                note={t(`fonds_page.coverage_${fund.coverage}`)}
              />

              {fund.greenwashing_reasons.length > 0 && (
                <div className="mt-6">
                  <p className="stamp">{t("xray.flags_label")}</p>
                  <ul className="mt-2">
                    {fund.greenwashing_reasons.map((r) => (
                      <li
                        key={r}
                        className="py-2.5 border-b border-paper-3 text-body-sm text-ink-2"
                      >
                        {/* Les raisons sont des identifiants stables côté
                            moteur ; la page les affichait bruts
                            (« sfdr_no_exclusions »). Elles sont traduites,
                            comme partout ailleurs. */}
                        {t(`transparency.reasons.${r}`, { defaultValue: r })}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2.5 text-caption text-ink-3 leading-relaxed max-w-[62ch]">
                    {t("fonds_page.risk_disclaimer")}
                  </p>
                </div>
              )}

              {/* Ce que Seedow ne sait pas de ce fonds vit ici. Une composition
                  non publiée en fait partie : elle ne disparaît pas de la page,
                  elle cesse seulement d'en occuper l'ouverture. */}
              {!composed && (
                <div className="mt-6">
                  <p className="font-semibold text-ink">{t("euro_breakdown.empty_title")}</p>
                  <p className="mt-1.5 max-w-[62ch]">{t("euro_breakdown.empty_body")}</p>
                </div>
              )}

              <p className="mt-6 max-w-[62ch]">{t("fonds_page.limits")}</p>
              {fund.isin == null && (
                <p className="mt-3 max-w-[62ch] text-caption text-ink-3 leading-relaxed">
                  {t("fonds_page.no_isin_note")}
                </p>
              )}
            </div>
          </WhyThis>
        </section>

        {/* ── La suite ──────────────────────────────────────────────────── */}
        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
          <Link
            to="/observatoire"
            className="text-body font-semibold text-ink underline underline-offset-4 hover:no-underline rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ink"
          >
            {t("landing.observatory.cta")} <span aria-hidden>→</span>
          </Link>
          <Link
            to="/onboarding"
            search={{ guest: true }}
            className="text-body font-semibold text-mint-ink underline underline-offset-4 hover:no-underline rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ink"
          >
            {t("xray.find_alternatives")} <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="stamp">{label}</p>
      <p className="font-value text-[24px] leading-none text-ink mt-2.5">{value}</p>
    </div>
  );
}
