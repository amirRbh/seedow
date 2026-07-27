import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useLang } from "@/hooks/useLang";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { buildPortfolioImpact, type PortfolioImpactMetrics } from "@/lib/impact/portfolioImpact";
import { carbonConfidenceTier } from "@/lib/impact/translator";
import { ACWI_WACI_SOURCE, ACWI_WACI_ASOF } from "@/lib/esg/benchmark";
import type { ActiveHolding } from "@/hooks/useActivePortfolio";

const AMOUNT_MIN = 1000;
const AMOUNT_MAX = 500000;
const AMOUNT_STEP = 1000;

/**
 * ImpactTranslator — met en récit l'impact du portefeuille en 4 onglets, sur la
 * SEULE donnée honnête (`buildPortfolioImpact`). Aucun chiffre fabriqué :
 * - « Vs le monde » : WACI réel vs indice ACWI sourcé/daté.
 * - « Rendu tangible » : empreinte financée réelle + équivalences ADEME + slider
 *   d'investissement (l'empreinte scale linéairement) + badge de confiance
 *   (= couverture émetteurs réelle).
 * - « Ce que je finance » : positions réelles du portefeuille.
 * - « Mes exclusions » : principe appliqué ; le montant détourné par secteur
 *   attend des parts sectorielles sourcées (état « à venir » assumé).
 */
export function ImpactTranslator({
  metrics,
  holdings,
  defaultAmount,
}: {
  metrics: PortfolioImpactMetrics;
  holdings: ActiveHolding[];
  defaultAmount: number;
}) {
  const { t } = useTranslation();
  const { lang } = useLang();
  const numLocale = lang === "en" ? "en-US" : "fr-FR";

  const [amount, setAmount] = useState(() =>
    Math.min(AMOUNT_MAX, Math.max(AMOUNT_MIN, Math.round(defaultAmount) || 10000)),
  );

  const view = useMemo(() => buildPortfolioImpact(metrics, amount), [metrics, amount]);

  const fmtInt = (v: number) => Math.round(v).toLocaleString(numLocale);
  const fmtMoney = (v: number) =>
    v.toLocaleString(numLocale, { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

  return (
    <div className="rounded-3xl border border-paper-3 bg-paper paper-grain p-6">
      <p className="text-tag uppercase tracking-[0.22em] font-semibold text-gold mb-4">
        {t("impact_translator.eyebrow")}
      </p>

      <Tabs defaultValue="monde">
        <TabsList className="flex flex-wrap gap-1.5 h-auto bg-transparent p-0">
          {(["monde", "tangible", "finance", "exclusions"] as const).map((k) => (
            <TabsTrigger
              key={k}
              value={k}
              className="text-caption uppercase tracking-[0.1em] rounded-full border border-paper-3 px-3 py-1.5 data-[state=active]:bg-ink data-[state=active]:text-paper"
            >
              {t(`impact_translator.tab.${k}`)}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── Vs le monde : WACI réel vs ACWI sourcé ── */}
        <TabsContent value="monde" className="pt-5">
          {view.intensity && view.intensity.vsBenchmarkDeltaPct != null ? (
            <VsWorld
              yourWaci={view.intensity.waci}
              benchmark={view.intensity.benchmarkWaci}
              deltaPct={view.intensity.vsBenchmarkDeltaPct}
              cleaner={view.intensity.cleaner}
              coverage={view.intensity.coverage}
              numLocale={numLocale}
            />
          ) : (
            <PendingState text={t("impact_translator.vs_world.pending")} />
          )}
        </TabsContent>

        {/* ── Rendu tangible : empreinte réelle + slider + confiance ── */}
        <TabsContent value="tangible" className="pt-5 space-y-5">
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <label
                htmlFor="impact-amount"
                className="text-caption text-ink-3 uppercase tracking-wider"
              >
                {t("impact_translator.tangible.amount_label")}
              </label>
              <span className="font-mono text-body-sm text-ink tabular-nums">
                {fmtMoney(amount)}
              </span>
            </div>
            <Slider
              id="impact-amount"
              min={AMOUNT_MIN}
              max={AMOUNT_MAX}
              step={AMOUNT_STEP}
              value={[amount]}
              onValueChange={([v]) => setAmount(v)}
              aria-label={t("impact_translator.tangible.amount_label")}
            />
          </div>

          {view.measured && view.presentation.show && view.financedEmissionsKgPerYear != null ? (
            <Tangible
              kg={view.financedEmissionsKgPerYear}
              equivalences={view.presentation.equivalences}
              coverage={view.coverage}
              numLocale={numLocale}
            />
          ) : (
            <div className="space-y-3">
              <PendingState text={t("impact_translator.tangible.pending")} />
              <ConfidenceBadge coverage={view.coverage} />
              <p className="text-body-sm text-ink-2">
                {t("impact_translator.tangible.esg_fallback", {
                  score: Math.round(view.esgScore),
                })}
              </p>
            </div>
          )}
        </TabsContent>

        {/* ── Ce que je finance : positions réelles ── */}
        <TabsContent value="finance" className="pt-5">
          {holdings.length > 0 ? (
            <div className="space-y-3">
              <ul className="flex flex-col divide-y divide-paper-3 border-t border-b border-paper-3">
                {holdings.slice(0, 3).map((h) => (
                  <li key={h.id} className="flex items-center gap-3 py-3">
                    <span className="font-value text-label text-ink w-14 flex-shrink-0">
                      {h.ticker}
                    </span>
                    <span className="flex-1 min-w-0 truncate text-body-sm text-ink-2">
                      {h.name}
                    </span>
                    <span className="text-caption text-ink-3 flex-shrink-0">
                      {t(`impact_translator.class.${h.category}`, { defaultValue: h.category })}
                    </span>
                    <span className="font-mono text-label text-ink tabular-nums w-12 text-right flex-shrink-0">
                      {fmtInt(h.allocationPct)}%
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-caption text-ink-3 leading-snug">
                {t("impact_translator.finance.note")}
              </p>
            </div>
          ) : (
            <PendingState text={t("impact_translator.finance.pending")} />
          )}
        </TabsContent>

        {/* ── Mes exclusions : principe réel, montant sourcé à venir ── */}
        <TabsContent value="exclusions" className="pt-5">
          <div className="space-y-3">
            <p className="text-body-sm text-ink-2 leading-relaxed">
              {t("impact_translator.exclusions.body")}
            </p>
            <p className="text-caption text-ink-3 leading-snug">
              {t("impact_translator.exclusions.pending")}{" "}
              <Link to="/methodologie" className="text-ice hover:underline">
                {t("impact_translator.exclusions.method_link")}
              </Link>
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function VsWorld({
  yourWaci,
  benchmark,
  deltaPct,
  cleaner,
  coverage,
  numLocale,
}: {
  yourWaci: number;
  benchmark: number;
  deltaPct: number;
  cleaner: boolean;
  coverage: number;
  numLocale: string;
}) {
  const { t } = useTranslation();
  const max = Math.max(yourWaci, benchmark, 1);
  const pct = Math.round(Math.abs(deltaPct) * 100);
  const fmt = (v: number) => v.toLocaleString(numLocale, { maximumFractionDigits: 0 });

  return (
    <div className="space-y-5">
      <p className="text-body-lg text-ink leading-snug">
        <span className={cleaner ? "text-mint font-semibold" : "text-alert font-semibold"}>
          {pct}%
        </span>{" "}
        {t(cleaner ? "impact_translator.vs_world.cleaner" : "impact_translator.vs_world.dirtier")}
      </p>

      <div className="space-y-3">
        <Bar
          label={t("impact_translator.vs_world.you")}
          value={yourWaci}
          max={max}
          tone={cleaner ? "mint" : "alert"}
          fmt={fmt}
        />
        <Bar
          label={t("impact_translator.vs_world.benchmark")}
          value={benchmark}
          max={max}
          tone="ink"
          fmt={fmt}
        />
      </div>

      <p className="text-caption text-ink-3">
        {t("impact_translator.vs_world.unit")} · {t("impact_translator.source_prefix")}{" "}
        {ACWI_WACI_SOURCE} · {ACWI_WACI_ASOF}
      </p>
      <ConfidenceBadge coverage={coverage} />
    </div>
  );
}

function Bar({
  label,
  value,
  max,
  tone,
  fmt,
}: {
  label: string;
  value: number;
  max: number;
  tone: "mint" | "alert" | "ink";
  fmt: (v: number) => string;
}) {
  const width = `${Math.max(2, Math.min(100, (value / max) * 100))}%`;
  const bg = tone === "mint" ? "bg-mint" : tone === "alert" ? "bg-alert" : "bg-ink";
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-caption text-ink-2">{label}</span>
        <span className="font-mono text-caption text-ink tabular-nums">{fmt(value)}</span>
      </div>
      <div className="h-2 rounded-full bg-paper-2 overflow-hidden">
        <div className={`h-full rounded-full ${bg}`} style={{ width }} />
      </div>
    </div>
  );
}

function Tangible({
  kg,
  equivalences,
  coverage,
  numLocale,
}: {
  kg: number;
  equivalences: { factorId: string; labelKey: string; unitKey: string; value: number }[];
  coverage: number;
  numLocale: string;
}) {
  const { t } = useTranslation();
  const inTonnes = kg >= 1000;
  const footprint = inTonnes ? kg / 1000 : kg;
  const unit = inTonnes ? "t" : "kg";
  const fmt = (v: number) =>
    v.toLocaleString(numLocale, {
      minimumFractionDigits: inTonnes ? 2 : 0,
      maximumFractionDigits: inTonnes ? 2 : 0,
    });

  return (
    <div className="space-y-4">
      <div>
        <p className="text-caption text-ink-3 uppercase tracking-wider">
          {t("impact_translator.tangible.footprint_label")}
        </p>
        <p className="font-value text-3xl text-ink mt-1">
          {fmt(footprint)} {unit}
          <span className="text-body-sm text-ink-3 font-normal ml-1">
            {t("impact_translator.tangible.per_year")}
          </span>
        </p>
      </div>

      <ul className="flex flex-col divide-y divide-paper-3 border-t border-b border-paper-3">
        {equivalences.slice(0, 4).map((e) => (
          <li key={e.factorId} className="flex items-center justify-between py-2.5">
            <span className="text-body-sm text-ink-2">{t(e.labelKey)}</span>
            <span className="font-mono text-body-sm text-ink tabular-nums">
              {Math.round(e.value).toLocaleString(numLocale)} {t(e.unitKey)}
            </span>
          </li>
        ))}
      </ul>

      <ConfidenceBadge coverage={coverage} />
    </div>
  );
}

function ConfidenceBadge({ coverage }: { coverage: number }) {
  const { t } = useTranslation();
  const tier = carbonConfidenceTier(coverage);
  const pct = Math.round(Math.max(0, Math.min(1, coverage)) * 100);
  const tone =
    tier === "high"
      ? "bg-mint/12 text-mint"
      : tier === "partial"
        ? "bg-solar-tint text-solar"
        : "bg-paper-2 text-ink-3";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-tag font-semibold uppercase tracking-[0.14em] ${tone}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden />
      {t(`impact_translator.confidence.${tier}`, { pct })}
    </span>
  );
}

function PendingState({ text }: { text: string }) {
  return <p className="text-body-sm text-ink-2 leading-relaxed">{text}</p>;
}
