import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { getPublicFundByIsin } from "@/lib/esg/public-fund.functions";
import type { PublicFundAsset } from "@/lib/esg/public-fund";
import { LanguageToggle } from "@/components/LanguageToggle";

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
      <header className="max-w-3xl mx-auto px-6 pt-10 pb-8 border-b border-paper-3 flex items-center justify-between">
        <Link
          to="/comprendre"
          className="text-tag uppercase tracking-[0.18em] text-ink-3 hover:text-ink transition-colors"
        >
          {t("fonds_page.back")}
        </Link>
        <LanguageToggle />
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        <div>
          <p className="text-tag uppercase tracking-[0.18em] text-ink-3 font-mono">
            {fund.isin ?? fund.ticker} · {fund.issuer ?? "—"}
          </p>
          <h1 className="font-value text-3xl mt-2">{fund.name}</h1>
          <p className="text-body text-ink-2 mt-3 max-w-2xl leading-relaxed">
            {t("fonds_page.intro")}
          </p>
        </div>

        {fund.seedow_score != null && (
          <section className="border border-ink rounded-2xl p-5 bg-paper-2/40">
            <div className="flex items-baseline justify-between gap-3 flex-wrap">
              <div>
                <p className="text-tag uppercase tracking-[0.14em] text-ink-3 font-mono">
                  {t("fonds_page.seedow_score_title")}
                </p>
                <p className="font-value text-4xl mt-1 tabular-nums">
                  {fund.seedow_score}
                  <span className="text-ink-3 text-xl">/100</span>
                </p>
              </div>
              <p className="text-body-sm font-medium">{t(TIER_LABEL[fund.sustainability_tier])}</p>
            </div>
            {fund.sustainability_drivers.length > 0 && (
              <p className="text-caption text-ink-3 mt-3">
                {fund.sustainability_drivers.join(" · ")}
              </p>
            )}
            <p className="text-caption text-ink-3 mt-3">
              {t("fonds_page.seedow_score_disclaimer")}
            </p>
          </section>
        )}

        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Metric label={t("fonds_page.metric_esg")} value={`${fund.esg.toFixed(1)}/10`} />
          <Metric label={t("fonds_page.metric_climate")} value={`${fund.climate.toFixed(1)}/10`} />
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
        </section>

        <section className="border border-paper-3 rounded-2xl p-5">
          <p className="text-tag uppercase tracking-[0.14em] text-ink-3 font-mono mb-2">
            {t("fonds_page.risk_title")}
          </p>
          <p className="font-value text-lg">{t(RISK_LABEL[fund.greenwashing_risk])}</p>
          {fund.greenwashing_reasons.length > 0 && (
            <ul className="mt-3 space-y-1.5 list-disc list-inside text-body-sm text-ink-2">
              {fund.greenwashing_reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          )}
          <p className="text-caption text-ink-3 mt-3">{t("fonds_page.risk_disclaimer")}</p>
        </section>

        {fund.excluded_sectors.length > 0 && (
          <section>
            <p className="text-tag uppercase tracking-[0.14em] text-ink-3 font-mono mb-2">
              {t("fonds_page.exclusions_title")}
            </p>
            <p className="text-body-sm text-ink-2">{fund.excluded_sectors.join(", ")}</p>
          </section>
        )}

        {fund.themes.length > 0 && (
          <section>
            <p className="text-tag uppercase tracking-[0.14em] text-ink-3 font-mono mb-2">
              {t("fonds_page.themes_title")}
            </p>
            <ul className="space-y-1 text-body-sm text-ink-2">
              {fund.themes.map((th) => (
                <li key={th.tag} className="flex justify-between">
                  <span>{th.tag}</span>
                  <span className="tabular-nums">{th.pct}%</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <footer className="text-caption text-ink-3 border-t border-paper-3 pt-4">
          {t("fonds_page.source_line", {
            source: fund.source ?? t("fonds_page.source_unknown"),
            date: fund.data_asof ?? "—",
          })}
          {" · "}
          <span className="uppercase">{t(`fonds_page.coverage_${fund.coverage}`)}</span>
        </footer>
      </main>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-paper-3 rounded-2xl p-4">
      <p className="text-tag uppercase tracking-[0.18em] text-ink-3 font-mono">{label}</p>
      <p className="font-value text-xl text-ink mt-1 tabular-nums">{value}</p>
    </div>
  );
}
