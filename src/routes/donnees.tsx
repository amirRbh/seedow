import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CalendarClock, Database, FileCode2, Hand, Ban, Camera, BookMarked, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DataStatusChip } from "@/components/analytics/DataStatusChip";
import { PageHero, PublicPage } from "@/components/layout/PublicPage";
import { Reveal, RevealGroup } from "@/components/motion/Reveal";
import { Button } from "@/components/ui/button";
import { DATA_STATUSES, FRESHNESS_DAYS } from "@/lib/data/status";
import { sourcesByIntegration, type IntegrationLevel } from "@/lib/data/sources";
import { siteUrl, socialMeta } from "@/lib/seo/socialMeta";

export const Route = createFileRoute("/donnees")({
  head: () => ({
    meta: socialMeta({
      title: "Sources et qualité des données — Seedow",
      description:
        "D'où vient chaque donnée affichée par Seedow, à quelle fréquence elle est mise à jour, ce qui est vérifié, estimé, simulé ou indisponible.",
      path: "/donnees",
    }),
    links: [{ rel: "canonical", href: siteUrl("/donnees") }],
  }),
  component: DataPage,
});

const LEVEL_ICON: Record<IntegrationLevel, LucideIcon> = {
  scheduled: CalendarClock,
  manual: Hand,
  snapshot: Camera,
  reference: BookMarked,
  not_integrated: Ban,
};

/**
 * Page publique « Sources et qualité des données ».
 *
 * Elle reprend le registre `lib/data/sources.ts` tel quel : une source dont le
 * connecteur existe mais n'a pas tourné en production y est écrite comme telle.
 * C'est la page qu'un banquier, un régulateur ou un client B2B ouvre en premier.
 */
function DataPage() {
  const { t } = useTranslation();
  const groups = sourcesByIntegration();
  return (
    <PublicPage accent="ice" progress>
      <PageHero eyebrow={t("fin.data.eyebrow")} title={t("fin.data.title")} subtitle={t("fin.data.subtitle")} />

      <div className="mx-auto flex max-w-[1160px] flex-col gap-16 px-5 pb-10 sm:px-7">
        <section>
          <Reveal>
            <h2 className="text-[clamp(22px,2.6vw,28px)]">{t("fin.data.statuses_title")}</h2>
            <p className="mt-2 max-w-[62ch] text-body text-ink-2">{t("fin.data.statuses_desc")}</p>
          </Reveal>
          <RevealGroup className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-5">
            {DATA_STATUSES.map((s) => (
              <div key={s} className="paper-card flex flex-col gap-3 p-5">
                <DataStatusChip status={s} className="w-fit" />
                <p className="text-label leading-relaxed text-ink-2">{t(`fin.status_desc.${s}`)}</p>
              </div>
            ))}
          </RevealGroup>
          <Reveal className="paper-card-inset mt-4 p-5">
            <p className="text-label font-bold text-ink">{t("fin.data.freshness_title")}</p>
            <ul className="mt-2 grid gap-1.5 text-label text-ink-2 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(FRESHNESS_DAYS).map(([kind, days]) => (
                <li key={kind}>
                  {t(`fin.data.kind.${kind}`)} : <span className="font-value tabular-nums text-ink">{days}</span>{" "}
                  {t("fin.data.days")}
                </li>
              ))}
            </ul>
          </Reveal>
        </section>

        <section>
          <Reveal>
            <h2 className="text-[clamp(22px,2.6vw,28px)]">{t("fin.data.sources_title")}</h2>
            <p className="mt-2 max-w-[62ch] text-body text-ink-2">{t("fin.data.sources_desc")}</p>
          </Reveal>
          <div className="mt-6 flex flex-col gap-8">
            {groups.map((g) => {
              const Icon = LEVEL_ICON[g.level];
              return (
                <div key={g.level}>
                  <p className="flex items-center gap-2 text-body font-bold text-ink">
                    <span className="icon-badge h-9 w-9 rounded-xl">
                      <Icon aria-hidden />
                    </span>
                    {t(`fin.data.level.${g.level}`)}
                  </p>
                  <RevealGroup className="mt-3 grid gap-3 lg:grid-cols-2">
                    {g.sources.map((s) => (
                      <article key={s.id} className="paper-card flex flex-col gap-3 p-5 sm:p-6">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="text-[clamp(17px,1.8vw,19px)]">{s.dataset}</h3>
                            <p className="mt-0.5 text-label text-ink-2">{s.provider}</p>
                          </div>
                          <DataStatusChip status={s.producesStatus} />
                        </div>
                        <dl className="grid gap-x-4 gap-y-2 text-label sm:grid-cols-[auto_1fr]">
                          <Row label={t("fin.data.field.source")} value={s.source} />
                          <Row label={t("fin.data.field.frequency")} value={s.frequency} />
                          <Row label={t("fin.data.field.license")} value={s.license ?? t("fin.data.to_confirm")} />
                          <Row label={t("fin.data.field.transformation")} value={s.transformation} />
                          <Row label={t("fin.data.field.limits")} value={s.limits} />
                        </dl>
                        <p className="mono-meta mt-auto flex items-center gap-1.5">
                          <FileCode2 aria-hidden className="size-3.5" />
                          {s.codePath}
                        </p>
                      </article>
                    ))}
                  </RevealGroup>
                </div>
              );
            })}
          </div>
        </section>

        <Reveal className="tile-accent accent-solar flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
          <span className="icon-badge">
            <Database aria-hidden />
          </span>
          <p className="flex-1 text-body text-ink">{t("fin.data.provider_note")}</p>
          <Button asChild variant="outline">
            <Link to="/demo">
              {t("fin.data.open_demo")} <ArrowRight aria-hidden />
            </Link>
          </Button>
        </Reveal>
      </div>
    </PublicPage>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="font-semibold text-ink-3">{label}</dt>
      <dd className="text-ink-2">{value}</dd>
    </>
  );
}
