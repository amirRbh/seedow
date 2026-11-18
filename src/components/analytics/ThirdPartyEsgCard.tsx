import { ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AnalyticsCard } from "./AnalyticsCard";
import { DataStatusChip } from "./DataStatusChip";
import { useLang } from "@/hooks/useLang";
import { primarySourceStatus } from "@/lib/data/status";
import type { ThirdPartyFundEsg } from "@/lib/esg/framework";
import { formatDate, formatNumber, formatPercent } from "@/lib/format";

/**
 * Les indicateurs de durabilité qu'un émetteur publie sur son fonds, calculés
 * par MSCI ESG Research : notation, intensité carbone, hausse de température
 * implicite, expositions d'activité. Chaque chiffre est affiché avec son taux
 * de couverture et sa date, attribué au calculateur ET au diffuseur.
 *
 * Ce bloc ne classe pas les fonds, ne convertit rien en score Seedow et ne
 * rend aucun verdict (docs/scoring-v2.md) : il reproduit une publication.
 */
const ONE_DECIMAL = { minimumFractionDigits: 1, maximumFractionDigits: 1 };

export function ThirdPartyEsgCard({ data }: { data: ThirdPartyFundEsg }) {
  const { t } = useTranslation();
  const { lang } = useLang();
  const s = data.sustainability;
  const bi = data.businessInvolvement;
  const date = (d: string | null) =>
    d ? formatDate(d, lang, { day: "numeric", month: "short", year: "numeric" }) : "—";
  const pct = (v: number | null, digits = 2) =>
    v == null ? "—" : formatPercent(v / 100, lang, digits);
  const status = primarySourceStatus(true, s?.asOf ?? bi?.asOf ?? null, "esg_fund_metrics");

  return (
    <AnalyticsCard
      title={t("fin.esg_data.title")}
      description={t("fin.esg_data.desc", { provider: data.provider, issuer: data.publishedBy })}
      aside={<DataStatusChip status={status} detail={date(s?.asOf ?? bi?.asOf ?? null)} />}
      methodLabel={t("fin.method.label")}
      method={
        <div className="flex flex-col gap-2">
          <p>{t("fin.esg_data.method_rating")}</p>
          <p>{t("fin.esg_data.method_waci")}</p>
          <p>{t("fin.esg_data.method_itr")}</p>
          <p>{t("fin.esg_data.method_involvement")}</p>
        </div>
      }
    >
      {s && (
        <dl className="grid gap-3 sm:grid-cols-3 [&>*]:min-w-0">
          <Metric
            label={t("fin.esg_data.rating")}
            value={s.msciRating ?? "—"}
            hint={t("fin.esg_data.rating_hint", {
              quality:
                s.qualityScore == null ? "—" : formatNumber(s.qualityScore, lang, ONE_DECIMAL),
              coverage: pct(s.ratingCoveragePct),
            })}
            peer={
              s.peerPercentile != null && s.peerGroup
                ? t("fin.esg_data.peer", {
                    pct: pct(s.peerPercentile, 0),
                    group: s.peerGroup,
                    count: s.peerCount ?? 0,
                  })
                : null
            }
          />
          <Metric
            label={t("fin.esg_data.waci")}
            value={s.waci == null ? "—" : formatNumber(s.waci, lang, ONE_DECIMAL)}
            unit={t("fin.esg_data.waci_unit")}
            hint={t("fin.esg_data.coverage", { pct: pct(s.waciCoveragePct) })}
          />
          <Metric
            label={t("fin.esg_data.itr")}
            value={s.impliedTempRise ?? "—"}
            hint={t("fin.esg_data.coverage", { pct: pct(s.itrCoveragePct) })}
          />
        </dl>
      )}

      {bi && bi.rows.length > 0 && (
        <div className="mt-6">
          <p className="text-label font-bold text-ink">{t("fin.esg_data.involvement_title")}</p>
          <p className="mt-1 max-w-[64ch] text-label text-ink-2">
            {t("fin.esg_data.involvement_desc", { coverage: pct(bi.coveragePct) })}
          </p>
          <ul className="mt-3 grid gap-x-6 sm:grid-cols-2">
            {bi.rows.map((r) => (
              <li
                key={r.id}
                className="flex items-baseline justify-between gap-3 border-t border-paper-3 py-2"
              >
                <span className="text-label text-ink">{t(`fin.esg_data.involvement.${r.id}`)}</span>
                <span className="font-value text-body-sm tabular-nums text-ink">{pct(r.pct)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-caption text-ink-3">{t("fin.esg_data.involvement_threshold")}</p>
        </div>
      )}

      <p className="mt-6 text-label leading-relaxed text-ink-2">
        <span className="font-semibold">{t("fin.esg.does_not_say")} </span>
        {t("fin.esg_data.not")}
      </p>
      <p className="mono-meta mt-3 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span>
          {t("fin.esg_data.attribution", { provider: data.provider, issuer: data.publishedBy })}
        </span>
        {s?.holdingsBasisAsOf && (
          <span>· {t("fin.esg_data.basis", { date: date(s.holdingsBasisAsOf) })}</span>
        )}
        {data.sourceUrl && (
          <a
            href={data.sourceUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1 underline hover:no-underline"
          >
            {t("fin.demo.understand.source_link")} <ExternalLink aria-hidden className="size-3" />
          </a>
        )}
      </p>
      <p className="mt-1 text-caption text-ink-3">{t("fin.esg_data.license_note")}</p>
    </AnalyticsCard>
  );
}

function Metric({
  label,
  value,
  unit,
  hint,
  peer,
}: {
  label: string;
  value: string;
  unit?: string;
  hint?: string;
  peer?: string | null;
}) {
  return (
    <div className="paper-card-inset flex flex-col gap-1.5 p-4">
      <dt className="text-label font-semibold text-ink-2">{label}</dt>
      <dd className="font-display text-[clamp(22px,2.4vw,28px)] font-extrabold leading-none tracking-[-0.03em] text-ink tabular-nums">
        {value}
        {unit && <span className="ml-1.5 text-label font-semibold text-ink-2">{unit}</span>}
      </dd>
      {hint && <dd className="text-label text-ink-2">{hint}</dd>}
      {peer && <dd className="text-caption text-ink-3">{peer}</dd>}
    </div>
  );
}
