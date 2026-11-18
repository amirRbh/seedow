import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Braces, FileSpreadsheet, FileText, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DataStatusChip } from "@/components/analytics/DataStatusChip";
import { PageHero, PublicPage } from "@/components/layout/PublicPage";
import { Reveal, RevealGroup } from "@/components/motion/Reveal";
import { Button } from "@/components/ui/button";
import { API_BASE, MAX_COMPARE } from "@/lib/api/v1";
import { EXPORT_COLUMNS } from "@/lib/compare/universe";
import { DATA_STATUSES } from "@/lib/data/status";
import { siteUrl, socialMeta } from "@/lib/seo/socialMeta";

export const Route = createFileRoute("/developpeurs")({
  head: () => ({
    meta: socialMeta({
      title: "API publique et exports — Seedow",
      description:
        "API en lecture seule et exports CSV du comparateur de fonds Seedow, pour les sociétés de gestion et les équipes de sélection : provenance champ par champ, sans classement ni score.",
      path: "/developpeurs",
    }),
    links: [{ rel: "canonical", href: siteUrl("/developpeurs") }],
  }),
  component: DevelopersPage,
});

const EXAMPLE_ISINS = "IE00B4L5Y983,IE00BDZZTM54";

const ENDPOINTS = [
  { id: "funds", method: "GET", path: "/funds", example: `/funds?sfdr=8&maxTer=0.003` },
  { id: "fund", method: "GET", path: "/funds/{isin}", example: "/funds/IE00BDZZTM54" },
  { id: "compare", method: "GET", path: "/compare", example: `/compare?isins=${EXAMPLE_ISINS}` },
  {
    id: "compare_csv",
    method: "GET",
    path: "/compare?format=csv",
    example: `/compare?isins=${EXAMPLE_ISINS}&format=csv`,
  },
  { id: "openapi", method: "GET", path: "/openapi.json", example: "/openapi.json" },
] as const;

/**
 * Documentation publique de l'API v1 et des exports institutionnels. La page
 * lit ses constantes dans le code (`lib/api/v1.ts`, `EXPORT_COLUMNS`) : la
 * liste des colonnes ne peut pas dériver de ce qui est réellement servi.
 */
function DevelopersPage() {
  const { t } = useTranslation();
  return (
    <PublicPage accent="ice" progress>
      <PageHero
        eyebrow={t("fin.dev.eyebrow")}
        title={t("fin.dev.title")}
        subtitle={t("fin.dev.subtitle")}
      >
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild>
            <a href={`${API_BASE}/openapi.json`} target="_blank" rel="noreferrer">
              <Braces aria-hidden /> OpenAPI 3.1
            </a>
          </Button>
          <Button asChild variant="outline">
            <Link to="/comparer">
              {t("fin.dev.open_compare")} <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>
      </PageHero>

      <div className="mx-auto flex max-w-[1160px] flex-col gap-14 px-5 pb-10 sm:px-7">
        <RevealGroup className="grid gap-3 md:grid-cols-3 [&>*]:min-w-0">
          {(
            [
              { icon: Braces, key: "json" },
              { icon: FileSpreadsheet, key: "csv" },
              { icon: FileText, key: "report" },
            ] as const
          ).map(({ icon: Icon, key }) => (
            <div key={key} className="paper-card flex flex-col gap-3 p-6">
              <span className="icon-badge">
                <Icon aria-hidden />
              </span>
              <h2 className="text-[clamp(18px,2vw,21px)]">{t(`fin.dev.format.${key}.title`)}</h2>
              <p className="text-body-sm leading-relaxed text-ink-2">
                {t(`fin.dev.format.${key}.desc`)}
              </p>
            </div>
          ))}
        </RevealGroup>

        <section aria-labelledby="endpoints-title">
          <Reveal>
            <h2 id="endpoints-title" className="text-[clamp(22px,2.6vw,28px)]">
              {t("fin.dev.endpoints_title")}
            </h2>
            <p className="mt-2 max-w-[66ch] text-body text-ink-2">
              {t("fin.dev.endpoints_desc", { base: API_BASE, max: MAX_COMPARE })}
            </p>
          </Reveal>
          <ol className="mt-6 flex flex-col gap-3">
            {ENDPOINTS.map((e) => (
              <li key={e.id} className="paper-card flex flex-col gap-2 p-5 sm:p-6">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-mint-tint px-2.5 py-0.5 font-mono text-caption font-semibold text-mint-ink">
                    {e.method}
                  </span>
                  <code className="font-mono text-body-sm font-semibold break-all text-ink">
                    {API_BASE}
                    {e.path}
                  </code>
                </p>
                <p className="text-body-sm text-ink-2">{t(`fin.dev.endpoint.${e.id}`)}</p>
                <a
                  href={`${API_BASE}${e.example}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mono-meta w-fit break-all underline hover:no-underline"
                >
                  {t("fin.dev.try")} {API_BASE}
                  {e.example}
                </a>
              </li>
            ))}
          </ol>
          <Reveal className="paper-card-inset mt-4 p-5">
            <p className="text-label font-bold text-ink">{t("fin.dev.curl_title")}</p>
            <pre className="mt-2 overflow-x-auto rounded-xl bg-paper p-4 font-mono text-caption leading-relaxed text-ink">
              {`curl -s "${siteUrl(`${API_BASE}/compare?isins=${EXAMPLE_ISINS}`)}" \\
  | jq '.data.funds[] | {isin, ter: .costs.ter, sfdr: .regulatory.sfdrDeclared}'

curl -s -o comparaison.csv \\
  "${siteUrl(`${API_BASE}/compare?isins=${EXAMPLE_ISINS}&format=csv`)}"`}
            </pre>
          </Reveal>
        </section>

        <section aria-labelledby="provenance-title">
          <Reveal>
            <h2 id="provenance-title" className="text-[clamp(22px,2.6vw,28px)]">
              {t("fin.dev.provenance_title")}
            </h2>
            <p className="mt-2 max-w-[66ch] text-body text-ink-2">{t("fin.dev.provenance_desc")}</p>
          </Reveal>
          <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr] [&>*]:min-w-0">
            <pre className="paper-card overflow-x-auto p-5 font-mono text-caption leading-relaxed text-ink">
              {`"ter": {
  "value": 0.002,
  "status": "VERIFIED",
  "source": "iShares (BlackRock) — …",
  "asOf": "2026-11-17"
},
"taxonomyAlignment": {
  "value": null,
  "status": "UNAVAILABLE",
  "source": null,
  "asOf": null
}`}
            </pre>
            <ul className="flex flex-col gap-2">
              {DATA_STATUSES.map((s) => (
                <li key={s} className="paper-card-inset flex items-start gap-3 p-3">
                  <DataStatusChip status={s} className="flex-none" />
                  <span className="text-label leading-relaxed text-ink-2">
                    {t(`fin.status_desc.${s}`)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="columns-title">
          <Reveal>
            <h2 id="columns-title" className="text-[clamp(22px,2.6vw,28px)]">
              {t("fin.dev.columns_title")}
            </h2>
            <p className="mt-2 max-w-[66ch] text-body text-ink-2">{t("fin.dev.columns_desc")}</p>
          </Reveal>
          <ul className="mt-5 flex flex-wrap gap-2">
            {EXPORT_COLUMNS.map((c) => (
              <li key={c}>
                <code className="rounded-lg bg-paper-inset px-2 py-1 font-mono text-caption text-ink">
                  {c}
                </code>
              </li>
            ))}
          </ul>
        </section>

        <Reveal className="tile-accent accent-solar flex flex-col gap-4 p-6 sm:flex-row sm:items-start">
          <span className="icon-badge">
            <ShieldCheck aria-hidden />
          </span>
          <div className="flex flex-1 flex-col gap-2">
            <h2 className="text-[clamp(18px,2vw,21px)]">{t("fin.dev.rules_title")}</h2>
            <ul className="flex list-disc flex-col gap-1.5 pl-5 text-body-sm leading-relaxed text-ink">
              <li>{t("fin.dev.rule.no_ranking")}</li>
              <li>{t("fin.dev.rule.provenance")}</li>
              <li>{t("fin.dev.rule.msci")}</li>
              <li>{t("fin.dev.rule.cache")}</li>
              <li>{t("fin.dev.rule.not_advice")}</li>
            </ul>
          </div>
        </Reveal>
      </div>
    </PublicPage>
  );
}
