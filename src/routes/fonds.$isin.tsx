import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { getPublicFundByIsin } from "@/lib/esg/public-fund.functions";
import type { PublicFundAsset } from "@/lib/esg/public-fund";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Provenance } from "@/components/ui/Provenance";

/**
 * Page Autorité publique (Phase C, ticket C1 — Moat Blueprint) : ce que
 * Seedow sait réellement d'un fonds, chiffre par chiffre, sourcé et daté.
 * Jamais de verdict au-delà de ce que dit la donnée (§1.3) ; le risque
 * greenwashing est présenté avec ses raisons, pas comme un jugement définitif
 * (§7 : « drapeau à vérifier », pas un verdict).
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
    const title = `${fund.name} : ce fonds est-il vraiment vert ? — Seedow`;
    const description = `Données sourcées et datées sur ${fund.name} (${fund.isin ?? fund.ticker}) : score ESG, empreinte carbone, article SFDR, exclusions, risque de greenwashing.`;
    const url = `https://seedow.life/fonds/${params.isin}`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        { property: "og:type", content: "article" },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: FundAuthorityPage,
});

const RISK_LABEL: Record<PublicFundAsset["greenwashing_risk"], string> = {
  low: "fonds_page.risk_low",
  medium: "fonds_page.risk_medium",
  high: "fonds_page.risk_high",
};

/** Le risque greenwashing est un STATUT DE PREUVE, pas une humeur : il prend
 *  le tampon correspondant, et son libellé est toujours écrit (jamais porté
 *  par la seule couleur — CLAUDE.md §4). */
const RISK_TAG: Record<PublicFundAsset["greenwashing_risk"], string> = {
  low: "stamp-tag--proof",
  medium: "stamp-tag--modelled",
  high: "stamp-tag--flag",
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

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="max-w-3xl mx-auto px-6 pt-8 pb-5 border-b border-ink flex items-center justify-between">
        <Link to="/comprendre" className="stamp hover:text-ink transition-colors">
          {t("fonds_page.back")}
        </Link>
        <LanguageToggle />
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        <div>
          <p className="stamp">
            {fund.isin ?? fund.ticker} · {fund.issuer ?? "—"}
          </p>
          <div className="flex flex-wrap items-end gap-x-5 gap-y-3 mt-3">
            <h1 className="font-display text-[clamp(26px,4vw,42px)] leading-[1.06] max-w-[16ch]">
              {fund.name}
            </h1>
            <span className="flex flex-wrap gap-2 mb-1.5">
              {fund.sfdr_article != null && (
                <span className="stamp-tag stamp-tag--verified">
                  Article {fund.sfdr_article} SFDR
                </span>
              )}
              <span className={`stamp-tag ${RISK_TAG[fund.greenwashing_risk]}`}>
                {t(RISK_LABEL[fund.greenwashing_risk])}
              </span>
            </span>
          </div>
          <p className="text-body-lg text-ink-2 mt-4 max-w-[62ch] leading-relaxed">
            {t("fonds_page.intro")}
          </p>
        </div>

        {fund.seedow_score != null && (
          <section className="border-t-2 border-ink pt-5">
            <div className="flex items-end justify-between gap-6 flex-wrap">
              <div>
                <p className="stamp">{t("fonds_page.seedow_score_title")}</p>
                <p className="font-value text-[clamp(44px,6vw,64px)] leading-none mt-2.5">
                  {fund.seedow_score}
                  <span className="text-ink-3 text-[0.36em]"> / 100</span>
                </p>
                <ScoreGauge score={fund.seedow_score} />
              </div>
              <p className="text-body-lg font-medium mb-1">
                {t(TIER_LABEL[fund.sustainability_tier])}
              </p>
            </div>
            {fund.sustainability_drivers.length > 0 && (
              <p className="text-body-sm text-ink-2 mt-4 leading-relaxed">
                {fund.sustainability_drivers.join(" · ")}
              </p>
            )}
            <Provenance
              className="mt-4"
              status="modelled"
              source={fund.source ?? t("fonds_page.source_unknown")}
              asOf={fund.data_asof ?? undefined}
              note={t("fonds_page.seedow_score_disclaimer")}
            />
          </section>
        )}

        <section>
          <p className="stamp mb-4">{t("fonds_page.metric_esg")}</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-7">
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
                fund.carbon_intensity != null ? `${Math.round(fund.carbon_intensity)} gCO₂e/€` : "—"
              }
            />
            <Metric label={t("fonds_page.metric_temp")} value={fund.implied_temp_rise ?? "—"} />
          </div>
          {/* Une attestation par BLOC de données, pas une par ligne (DA V2 §4.4). */}
          <Provenance
            className="mt-6"
            status="verified"
            source={fund.source ?? t("fonds_page.source_unknown")}
            asOf={fund.data_asof ?? undefined}
            note={t(`fonds_page.coverage_${fund.coverage}`)}
          />
        </section>

        <section className="border-t-2 border-ink pt-5">
          <p className="stamp">{t("fonds_page.risk_title")}</p>
          <p className="font-display text-[22px] mt-2.5">{t(RISK_LABEL[fund.greenwashing_risk])}</p>
          {fund.greenwashing_reasons.length > 0 && (
            <ul className="mt-4">
              {fund.greenwashing_reasons.map((r) => (
                <li
                  key={r}
                  className="text-body text-ink-2 leading-relaxed py-2.5 border-b border-paper-3"
                >
                  {r}
                </li>
              ))}
            </ul>
          )}
          {/* « Drapeau à vérifier », jamais un verdict : le disclaimer est
              typographié comme une réserve, pas caché en petit gris. */}
          <Provenance
            className="mt-4"
            status="disputed"
            source={fund.source ?? t("fonds_page.source_unknown")}
            note={t("fonds_page.risk_disclaimer")}
          />
        </section>

        {fund.excluded_sectors.length > 0 && (
          <section className="border-t border-paper-3 pt-5">
            <p className="stamp">{t("fonds_page.exclusions_title")}</p>
            <p className="text-body text-ink-2 mt-2.5 leading-relaxed">
              {fund.excluded_sectors.join(" · ")}
            </p>
          </section>
        )}

        {fund.themes.length > 0 && (
          <section className="border-t border-paper-3 pt-5">
            <p className="stamp mb-1">{t("fonds_page.themes_title")}</p>
            <ul>
              {fund.themes.map((th) => (
                <li
                  key={th.tag}
                  className="flex justify-between items-baseline gap-4 py-2.5 border-b border-paper-3"
                >
                  <span className="text-body text-ink-2">{th.tag}</span>
                  <span className="font-value text-body text-ink">{th.pct} %</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <footer className="border-t-2 border-ink pt-4">
          <p className="stamp">
            {t("fonds_page.source_line", {
              source: fund.source ?? t("fonds_page.source_unknown"),
              date: fund.data_asof ?? "—",
            })}
          </p>
        </footer>
      </main>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-ink pt-2.5">
      <p className="stamp">{label}</p>
      <p className="font-value text-[24px] leading-none text-ink mt-2.5">{value}</p>
    </div>
  );
}

/**
 * Réglure graduée — DA V2 : un score sur 100 est une mesure, il se lit sur une
 * échelle avec ses graduations, pas dans un anneau coloré.
 */
function ScoreGauge({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, score));
  return (
    <div className="relative mt-3.5 h-[18px] w-[150px]" aria-hidden="true">
      <span className="absolute inset-x-0 top-0 h-px bg-paper-3" />
      {[0, 25, 50, 75, 100].map((tick) => (
        <span
          key={tick}
          className="absolute top-0 w-px bg-paper-3"
          style={{ left: `${tick}%`, height: tick % 50 === 0 ? 7 : 4 }}
        />
      ))}
      <span className="absolute top-[3px] h-px bg-ink" style={{ width: `${pct}%` }} />
      <span
        className="absolute top-0 h-[13px] w-[2px] bg-ink"
        style={{ left: `calc(${pct}% - 1px)` }}
      />
    </div>
  );
}
