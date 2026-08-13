import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Leaf, TrendingUp, Gauge, Coins } from "lucide-react";
import { useTranslation } from "react-i18next";
import { KPIFigure } from "@/components/ui/KPIFigure";
import { WhyEthi } from "@/components/ethi/WhyEthi";
import { Glossary, GLOSSARY } from "@/components/ui/Glossary";
import { useViewMode } from "@/hooks/useViewMode";
import { useActivePortfolio } from "@/hooks/useActivePortfolio";
import { usePortfolioValuation } from "@/hooks/usePortfolioValuation";
import { buildPortfolioImpact } from "@/lib/impact/portfolioImpact";
import { cn } from "@/lib/utils";

/**
 * Benchmark de référence — ETF MSCI World grand public (UCITS, EUR).
 */
const MSCI_WORLD = {
  name: "ETF MSCI World",
  ticker: "IWDA / EUNL",
  expectedReturn: 0.072,
  volatility: 0.155,
  ter: 0.002,
  esgScore: 52,
  carbonIntensityGperEur: 165,
  sfdr: "Article 6",
} as const;

/**
 * S&P 500 — proxy réel : iShares Core S&P 500 UCITS ETF (CSPX.AS, IE00B5BMR087).
 * Rendement annualisé et volatilité annualisée calculés sur 10 ans de cours
 * mensuels ajustés (Yahoo Finance, arrêtés au 02/08/2026). TER officiel 0,07 %.
 * Aucun score ESG / intensité carbone publié pour cet indice parent → null,
 * on n'invente pas (contrat de transparence).
 */
const SP500 = {
  name: "ETF S&P 500",
  ticker: "CSPX",
  expectedReturn: 0.1429,
  volatility: 0.1425,
  ter: 0.0007,
  esgScore: null,
  carbonIntensityGperEur: null,
  sfdr: "Article 6",
} as const;

/**
 * CAC 40 — proxy réel : Amundi CAC 40 UCITS ETF (CAC.PA, FR0007052782).
 * Mêmes conventions de calcul que ci-dessus. TER officiel 0,25 %.
 */
const CAC40 = {
  name: "ETF CAC 40",
  ticker: "CAC",
  expectedReturn: 0.0973,
  volatility: 0.1553,
  ter: 0.0025,
  esgScore: null,
  carbonIntensityGperEur: null,
  sfdr: "Article 6",
} as const;

interface BenchmarkData {
  name: string;
  ticker: string;
  expectedReturn: number;
  volatility: number;
  ter: number;
  esgScore: number | null;
  carbonIntensityGperEur: number | null;
  sfdr: string;
}

/**
 * Références de comparaison disponibles. Chaque référence s'appuie sur un ETF
 * réel et des séries de cours réelles ; les métriques ESG absentes restent à
 * `null` et s'affichent comme non disponibles plutôt que fabriquées.
 */
interface BenchmarkOption {
  id: "msci_world" | "sp500" | "cac40";
  labelKey: string;
  data: BenchmarkData | null;
}

const BENCHMARK_OPTIONS: BenchmarkOption[] = [
  { id: "msci_world", labelKey: "comparatif_panel.benchmark_msci_world", data: MSCI_WORLD },
  { id: "sp500", labelKey: "comparatif_panel.benchmark_sp500", data: SP500 },
  { id: "cac40", labelKey: "comparatif_panel.benchmark_cac40", data: CAC40 },
];

function PerfMedaillon({ value, max, accent }: { value: number; max: number; accent?: boolean }) {
  const w = Math.max(4, Math.min(100, (Math.abs(value) / max) * 100));
  return (
    <div className="h-1 w-full bg-paper-3 rounded-full overflow-hidden mt-2">
      <div
        className={cn("h-full rounded-full", accent ? "bg-gold" : "bg-highlight-1")}
        style={{ width: `${w}%` }}
      />
    </div>
  );
}

/**
 * Section repliable du comparatif (refonte mobile §8/§14) : le verdict scannable
 * en tête suffit à comprendre la différence ; le détail chiffré (à risque
 * comparable, scénario baissier, tableau complet) se déplie à la demande au lieu
 * d'empiler plusieurs écrans de scroll. `<details>` natif = accessible, sans state.
 */
function ComparatifSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="group mt-10">
      <summary className="list-none cursor-pointer [&::-webkit-details-marker]:hidden">
        <div className="gold-rule mb-5" />
        <div className="flex items-center justify-between gap-3">
          <span className="text-tag uppercase tracking-[0.22em] text-gold font-mono">{title}</span>
          <svg
            viewBox="0 0 16 16"
            className="w-4 h-4 flex-none text-ink-3 transition-transform duration-200 group-open:rotate-180"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            aria-hidden
          >
            <path d="M4 6l4 4 4-4" />
          </svg>
        </div>
      </summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}

/**
 * Panneau Comparatif — utilisable standalone (/comparatif) ou en onglet (/portfolio).
 */
export function ComparatifPanel() {
  const { t } = useTranslation();
  const { portfolio } = useActivePortfolio();
  const valuation = usePortfolioValuation();
  const [benchmarkId, setBenchmarkId] = useState<BenchmarkOption["id"]>("msci_world");

  if (!portfolio) {
    return <p className="text-label text-ink-3">{t("comparatif_panel.no_active")}</p>;
  }

  const benchmark = BENCHMARK_OPTIONS.find((b) => b.id === benchmarkId) ?? BENCHMARK_OPTIONS[0];
  const ref = benchmark.data;

  const metrics = portfolio.metrics;
  const seedow = {
    name: portfolio.name,
    expectedReturn: metrics?.expected_return ?? 0.06,
    volatility: metrics?.volatility ?? 0.12,
    ter: metrics?.ter ?? 0.0025,
    esgScore: metrics?.esg_score ?? 0,
    sfdr: "Article 8 / 9",
  };

  // Intensité carbone RÉELLE (WACI émetteurs) vs indice — plus de « CO₂ évité »
  // fabriqué à partir du score ESG (méthodo §0/§6). Verdict chiffré seulement si
  // la couverture des données est représentative, sinon « en cours de mesure ».
  const impact = metrics ? buildPortfolioImpact(metrics, 0) : null;
  const carbonDelta = impact?.intensity?.vsBenchmarkDeltaPct ?? null;

  const capital = valuation.totalInvested || portfolio.initial_amount || 10_000;
  const project = (r: number) => capital * Math.pow(1 + r, 10);
  const seedow10y = project(seedow.expectedReturn);
  const ref10y = ref ? project(ref.expectedReturn) : null;
  const delta10y = ref10y !== null ? seedow10y - ref10y : null;

  // ── Comparaison à risque comparable ────────────────────────────────────────
  // Un portefeuille multi-actifs à 6 % de vol face à un indice actions à 14 %
  // n'est pas comparable en l'état. On ramène le benchmark au niveau de risque
  // du portefeuille : exposition partielle k = vol_portefeuille / vol_benchmark,
  // le reste du capital n'étant pas rémunéré (hypothèse conservatrice, pas de
  // taux sans risque inventé). k est borné à 1 (on ne « leverage » pas l'indice).
  const riskRatio = ref && ref.volatility > 0 ? Math.min(1, seedow.volatility / ref.volatility) : 1;
  const refScaledReturn = ref ? ref.expectedReturn * riskRatio : null;
  const refScaled10y = refScaledReturn !== null ? project(refScaledReturn) : null;
  const deltaScaled10y = refScaled10y !== null ? seedow10y - refScaled10y : null;

  const rewardRisk = seedow.volatility > 0 ? seedow.expectedReturn / seedow.volatility : 0;
  const refRewardRisk = ref && ref.volatility > 0 ? ref.expectedReturn / ref.volatility : null;

  // ── Scénario baissier ──────────────────────────────────────────────────────
  // −30 % sur le benchmark, répercuté proportionnellement aux volatilités.
  const BENCH_DROP = 0.3;
  const seedowDrop = Math.min(1, BENCH_DROP * riskRatio);
  const seedowAfterDrop = capital * (1 - seedowDrop);
  const refAfterDrop = capital * (1 - BENCH_DROP);

  const eur0 = (v: number) =>
    v.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const BenchmarkSelector = (
    <div
      className="flex flex-wrap gap-2 mb-6"
      role="tablist"
      aria-label={t("comparatif_panel.benchmark_label")}
    >
      {BENCHMARK_OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          role="tab"
          aria-selected={benchmarkId === opt.id}
          onClick={() => setBenchmarkId(opt.id)}
          className={cn(
            "px-3 py-1.5 rounded-full text-caption uppercase tracking-wider font-mono border transition-colors",
            benchmarkId === opt.id
              ? "bg-ink text-paper border-ink"
              : "bg-transparent text-ink-3 border-paper-3 hover:border-ink-2",
          )}
        >
          {t(opt.labelKey)}
          {!opt.data && <span aria-hidden> ·</span>}
        </button>
      ))}
    </div>
  );

  if (!ref) {
    return (
      <div>
        <p className="text-caption uppercase tracking-wider text-ink-3 mb-3">
          {t("comparatif_panel.benchmark_label")}
        </p>
        {BenchmarkSelector}
        <div className="border border-paper-3 rounded-2xl p-6 text-center">
          <p className="text-body font-semibold text-ink">
            {t("comparatif_panel.benchmark_no_data_title")}
          </p>
          <p className="mt-2 text-label text-ink-3 leading-relaxed">
            {t("comparatif_panel.benchmark_no_data_body")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="text-caption uppercase tracking-wider text-ink-3 mb-3">
        {t("comparatif_panel.benchmark_label")}
      </p>
      {BenchmarkSelector}

      {/* Verdict scannable (analyse UX §08) : comprendre la différence AVANT de
          lire le détail. Mot + icône, jamais couleur seule (a11y §4). */}
      <VerdictSummary items={buildVerdicts(seedow, ref, t)} vs={t(benchmark.labelKey)} />

      {/* « Pourquoi cet écart ? » — réponse Ethi en un clic (§11/§24). */}
      <div className="-mt-3 mb-6">
        <WhyEthi
          label={t("comparatif_panel.why_gap")}
          question={t("comparatif_panel.why_gap_q", { bench: t(benchmark.labelKey) })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <KPIFigure
          size="sm"
          label={t("comparatif_panel.simulated_10y")}
          value={seedow10y.toLocaleString("fr-FR", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })}
          unit="€"
          tone="ice"
          hint={t("comparatif_panel.on_invested", {
            amount: capital.toLocaleString("fr-FR", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }),
          })}
        />
        <KPIFigure
          size="sm"
          label={t("comparatif_panel.gap_msci")}
          value={`${delta10y! >= 0 ? "+" : ""}${delta10y!.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          unit="€"
          hint={
            delta10y! >= 0
              ? t("comparatif_panel.above_benchmark")
              : t("comparatif_panel.below_benchmark")
          }
        />
      </div>
      <p className="mt-3 text-caption text-ink-3 leading-relaxed">
        {t("comparatif_panel.projection_disclaimer")}
      </p>
      <p className="mt-2 text-caption text-ink-3 leading-relaxed">
        Référence : {ref.name} ({ref.ticker}). Rendement et volatilité annualisés sur 10 ans de
        cours mensuels ajustés (Yahoo Finance, arrêtés au 02/08/2026) ; TER issu du DIC de
        l&apos;émetteur.
      </p>
      <p className="mt-2 text-caption text-ink-3 leading-relaxed">
        {t("comparatif_panel.window_note")}
      </p>

      {/* À risque comparable — repliée (refonte mobile §8/§14) : le verdict en tête
          donne l'essentiel ; ce détail chiffré se déplie à la demande. */}
      <ComparatifSection title={t("comparatif_panel.risk_adjusted_title")}>
        <p className="text-label text-ink-2 leading-relaxed">
          {t("comparatif_panel.risk_adjusted_body", {
            bench: t(benchmark.labelKey),
            vol: (seedow.volatility * 100).toFixed(1),
          })}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-4">
          <KPIFigure
            size="sm"
            label={t("comparatif_panel.risk_adjusted_you")}
            value={eur0(seedow10y)}
            unit="€"
            tone="ice"
            hint={`${(seedow.expectedReturn * 100).toFixed(1)} % / an · vol ${(seedow.volatility * 100).toFixed(1)} %`}
          />
          <KPIFigure
            size="sm"
            label={t("comparatif_panel.risk_adjusted_bench", { bench: t(benchmark.labelKey) })}
            value={refScaled10y !== null ? eur0(refScaled10y) : "n.d."}
            unit="€"
            hint={
              refScaledReturn !== null
                ? `${(refScaledReturn * 100).toFixed(1)} % / an · vol ${(seedow.volatility * 100).toFixed(1)} %`
                : undefined
            }
          />
        </div>
        <div className="mt-4 border-t border-paper-3 pt-4 flex items-baseline justify-between gap-4">
          <span className="text-caption uppercase tracking-wider text-ink-3">
            {t("comparatif_panel.reward_risk")}
          </span>
          <span className="font-value text-label text-ink">
            {rewardRisk.toFixed(2)}
            <span className="text-ink-3">
              {" "}
              · {t(benchmark.labelKey)} {refRewardRisk !== null ? refRewardRisk.toFixed(2) : "n.d."}
            </span>
          </span>
        </div>
        <p className="mt-2 text-caption text-ink-3 leading-relaxed">
          {t("comparatif_panel.reward_risk_note")}
        </p>
      </ComparatifSection>

      {/* Le prix de l'alignement — nommé en euros, jamais dissimulé (reste visible). */}
      {deltaScaled10y !== null && (
        <div className="mt-10 border border-paper-3 rounded-2xl p-5">
          <p className="text-tag uppercase tracking-[0.22em] text-ink-3 font-mono mb-2">
            {t("comparatif_panel.price_title")}
          </p>
          <p className="text-label text-ink-2 leading-relaxed">
            {t(deltaScaled10y < 0 ? "comparatif_panel.price_cost" : "comparatif_panel.price_gain", {
              delta: eur0(Math.abs(deltaScaled10y)),
              bench: t(benchmark.labelKey),
              capital: eur0(capital),
            })}
          </p>
        </div>
      )}

      {/* Scénario baissier — replié : on montre la volatilité à qui veut la voir. */}
      <ComparatifSection title={t("comparatif_panel.downside_title")}>
        <p className="text-label text-ink-2 leading-relaxed">
          {t("comparatif_panel.downside_body", {
            bench: t(benchmark.labelKey),
            drop: `−${(seedowDrop * 100).toFixed(0)}`,
            capital: eur0(capital),
          })}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-4">
          <KPIFigure
            size="sm"
            label={t("comparatif_panel.downside_you")}
            value={eur0(seedowAfterDrop)}
            unit="€"
            tone="ice"
            hint={`−${(seedowDrop * 100).toFixed(0)} %`}
          />
          <KPIFigure
            size="sm"
            label={t(benchmark.labelKey)}
            value={eur0(refAfterDrop)}
            unit="€"
            hint="−30 %"
          />
        </div>
        <p className="mt-3 text-caption text-ink-3 leading-relaxed">
          {t("comparatif_panel.downside_note")}
        </p>
      </ComparatifSection>

      {/* Face à face — le tableau chiffré (niveau 3) replié derrière le verdict
          scannable du haut (refonte mobile §14 : pas un mur de tableau). */}
      <ComparatifSection title={t("comparatif_panel.face_to_face")}>
        <h2 className="font-value text-2xl text-ink leading-tight">
          {t("comparatif_panel.no_filter")}
        </h2>

        <div className="mt-6 border-t border-b border-paper-3 divide-y divide-paper-3">
          <CompareRow
            benchmarkLabel={t(benchmark.labelKey)}
            label={t("comparatif_panel.expected_perf")}
            term="MSCIWorld"
            seedowValue={`${(seedow.expectedReturn * 100).toFixed(1)} %`}
            msciValue={`${(ref.expectedReturn * 100).toFixed(1)} %`}
            seedowWins={seedow.expectedReturn >= ref.expectedReturn}
            bar={
              <PerfMedaillon
                value={seedow.expectedReturn}
                max={Math.max(seedow.expectedReturn, ref.expectedReturn)}
                accent
              />
            }
          />
          <CompareRow
            benchmarkLabel={t(benchmark.labelKey)}
            label={t("comparatif_panel.volatility")}
            term="Volatilite"
            seedowValue={`${(seedow.volatility * 100).toFixed(1)} %`}
            msciValue={`${(ref.volatility * 100).toFixed(1)} %`}
            seedowWins={seedow.volatility <= ref.volatility}
            note={t("comparatif_panel.lower_stable")}
          />
          <CompareRow
            benchmarkLabel={t(benchmark.labelKey)}
            label={t("comparatif_panel.annual_fees")}
            term="TER"
            seedowValue={`${(seedow.ter * 100).toFixed(2)} %`}
            msciValue={`${(ref.ter * 100).toFixed(2)} %`}
            seedowWins={seedow.ter <= ref.ter}
            note={t("comparatif_panel.lower_net")}
          />
          <CompareRow
            benchmarkLabel={t(benchmark.labelKey)}
            label={t("comparatif_panel.impact_score")}
            term="ESG"
            seedowValue={`${seedow.esgScore.toFixed(0)} / 100`}
            msciValue={ref.esgScore != null ? `${ref.esgScore} / 100` : "n.d."}
            seedowWins={ref.esgScore != null && seedow.esgScore >= ref.esgScore}
            note={t("comparatif_panel.higher_durable")}
          />
          <CompareRow
            benchmarkLabel={t(benchmark.labelKey)}
            label={t("comparatif_panel.carbon_intensity")}
            term="CO2"
            seedowValue={
              impact?.measured && impact.intensityGco2ePerEur != null
                ? `${impact.intensityGco2ePerEur.toFixed(0)} g/€`
                : t("portfolio_metrics.measuring")
            }
            msciValue={
              ref.carbonIntensityGperEur != null ? `${ref.carbonIntensityGperEur} g/€` : "n.d."
            }
            seedowWins={Boolean(
              impact?.measured &&
                impact.intensityGco2ePerEur != null &&
                ref.carbonIntensityGperEur != null &&
                impact.intensityGco2ePerEur <= ref.carbonIntensityGperEur,
            )}
            note={t("comparatif_panel.per_euro")}
          />

          <CompareRow
            benchmarkLabel={t(benchmark.labelKey)}
            label={t("comparatif_panel.classification")}
            term="SFDR"
            seedowValue={seedow.sfdr}
            msciValue={ref.sfdr}
            seedowWins={seedow.sfdr.includes("8") || seedow.sfdr.includes("9")}
          />
        </div>
      </ComparatifSection>

      <div className="mt-10">
        <div className="gold-rule mb-5" />
        <p className="text-tag uppercase tracking-[0.22em] text-gold font-mono mb-3">
          {t("comparatif_panel.concrete_impact")}
        </p>
        <h2 className="font-value text-2xl text-ink leading-tight">
          {t("comparatif_panel.avoided_per_year")}
        </h2>
        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-paper-3 pt-5">
          {carbonDelta != null && (
            <KPIFigure
              size="md"
              label={t("comparatif_panel.carbon_intensity")}
              value={`${carbonDelta >= 0 ? "−" : "+"}${Math.round(Math.abs(carbonDelta) * 100)}`}
              unit="% vs ETF Monde"
              tone="mint"
              hint={t("comparatif_panel.carbon_intensity_hint")}
            />
          )}

          <KPIFigure
            size="md"
            label={t("comparatif_panel.saved_fees")}
            value={`${Math.max(0, (ref.ter - seedow.ter) * capital).toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
            unit="€/an"
            hint={t("comparatif_panel.for_invested", {
              amount: capital.toLocaleString("fr-FR", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }),
            })}
          />
        </div>
      </div>

      <div className="mt-10 border-t border-paper-3 pt-5">
        <p className="text-caption uppercase tracking-wider text-ink-3 font-mono mb-2">
          {t("comparatif_panel.methodology")}
        </p>
        <p className="text-label text-ink-2 leading-relaxed">
          {t("comparatif_panel.methodology_body")}
        </p>
        <Link
          to="/methodologie"
          className="mt-3 inline-flex items-center gap-2 text-caption font-semibold uppercase tracking-[0.18em] text-ink hover:text-highlight-1 transition-colors"
        >
          Lire la méthodologie complète
          <svg
            viewBox="0 0 24 24"
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}

// ── Verdict « en un coup d'œil » ─────────────────────────────────────────────
type VerdictTone = "good" | "neutral" | "caution";
interface VerdictItem {
  key: string;
  icon: React.ReactNode;
  label: string;
  word: string;
  tone: VerdictTone;
}

/** Classe un écart en trois états, avec zone morte « similaire » (eps). */
function classify(delta: number, eps: number): "better" | "similar" | "worse" {
  if (Math.abs(delta) <= eps) return "similar";
  return delta > 0 ? "better" : "worse";
}

const STATE_TONE: Record<"better" | "similar" | "worse", VerdictTone> = {
  better: "good",
  similar: "neutral",
  worse: "caution",
};

/**
 * Dérive les 4 verdicts (Impact / Performance / Risque / Frais) des mêmes chiffres
 * que le détail — aucune donnée nouvelle. Impact & performance : plus haut = mieux ;
 * risque & frais : plus bas = mieux (on passe donc `ref − seedow`).
 */
function buildVerdicts(
  seedow: { esgScore: number; expectedReturn: number; volatility: number; ter: number },
  ref: BenchmarkData,
  t: (key: string, options?: Record<string, unknown>) => string,
): VerdictItem[] {
  const icon = "h-4 w-4";
  // Pour risque & frais, « better » (écart favorable) = « plus bas ».
  const LH = { better: "lower", similar: "similar", worse: "higher" } as const;
  const impact = ref.esgScore == null ? "better" : classify(seedow.esgScore - ref.esgScore, 3);
  const perf = classify(seedow.expectedReturn - ref.expectedReturn, 0.01);
  const risk = classify(ref.volatility - seedow.volatility, 0.01);
  const fees = classify(ref.ter - seedow.ter, 0.0005);
  return [
    {
      key: "impact",
      icon: <Leaf className={icon} strokeWidth={1.8} aria-hidden />,
      label: t("comparatif_panel.verdict.impact"),
      word: t(`comparatif_panel.verdict.impact_${impact}`),
      tone: STATE_TONE[impact],
    },
    {
      key: "performance",
      icon: <TrendingUp className={icon} strokeWidth={1.8} aria-hidden />,
      label: t("comparatif_panel.verdict.performance"),
      word: t(`comparatif_panel.verdict.perf_${perf}`),
      tone: STATE_TONE[perf],
    },
    {
      key: "risk",
      icon: <Gauge className={icon} strokeWidth={1.8} aria-hidden />,
      label: t("comparatif_panel.verdict.risk"),
      word: t(`comparatif_panel.verdict.risk_${LH[risk]}`),
      tone: STATE_TONE[risk],
    },
    {
      key: "fees",
      icon: <Coins className={icon} strokeWidth={1.8} aria-hidden />,
      label: t("comparatif_panel.verdict.fees"),
      word: t(`comparatif_panel.verdict.fees_${LH[fees]}`),
      tone: STATE_TONE[fees],
    },
  ];
}

function VerdictSummary({ items, vs }: { items: VerdictItem[]; vs: string }) {
  const { t } = useTranslation();
  const toneClass: Record<VerdictTone, string> = {
    good: "text-mint-ink",
    neutral: "text-ink-2",
    caution: "text-solar-ink",
  };
  return (
    <div className="mb-6 rounded-2xl border border-paper-3 bg-paper-2 p-4">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <p className="text-tag uppercase tracking-[0.16em] text-ink-3 font-mono">
          {t("comparatif_panel.verdict.title")}
        </p>
        <p className="font-mono text-tag uppercase tracking-[0.1em] text-ink-3">
          {t("comparatif_panel.verdict.vs", { bench: vs })}
        </p>
      </div>
      <ul className="grid grid-cols-2 gap-2.5">
        {items.map((it) => (
          <li key={it.key} className="flex items-center gap-2">
            <span className={toneClass[it.tone]}>{it.icon}</span>
            <span className="text-caption text-ink-2">{it.label}</span>
            <span className={cn("ml-auto text-body-sm font-semibold", toneClass[it.tone])}>
              {it.word}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface RowProps {
  label: string;
  /** Libellé de la référence comparée (benchmark sélectionné), déjà traduit. */
  benchmarkLabel: string;
  term: "MSCIWorld" | "Volatilite" | "TER" | "ESG" | "CO2" | "SFDR";
  seedowValue: string;
  msciValue: string;
  seedowWins: boolean;
  note?: string;
  bar?: React.ReactNode;
}

function CompareRow({
  label,
  benchmarkLabel,
  term,
  seedowValue,
  msciValue,
  seedowWins,
  note,
  bar,
}: RowProps) {
  const { isSimple } = useViewMode();
  // Mode Simple : le libellé de ligne passe en langage clair. Mode Expert :
  // on garde le libellé éditorial d'origine. Le ⓘ ouvre la définition complète.
  const rowLabel = isSimple ? GLOSSARY[term].simple : label;
  return (
    <div className="py-4">
      <div className="flex items-baseline justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <p className="text-caption uppercase tracking-wider text-ink-3 font-mono">{rowLabel}</p>
          <Glossary term={term} variant="icon" />
        </div>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-4">
        <div>
          <p className="text-tag uppercase tracking-[0.18em] text-gold font-mono mb-1">Seedow</p>
          <p
            className={cn(
              "kpi-figure text-xl tabular-nums",
              seedowWins ? "text-ink" : "text-ink-2",
            )}
          >
            {seedowValue}
            {seedowWins && (
              <span aria-hidden="true" className="ml-1.5 text-gold text-xs">
                ●
              </span>
            )}
          </p>
        </div>
        <div>
          <p className="text-tag uppercase tracking-[0.18em] text-ink-3 font-mono mb-1">
            {benchmarkLabel}
          </p>
          <p className="kpi-figure text-xl text-ink-2 tabular-nums">{msciValue}</p>
        </div>
      </div>
      {bar}
      {note && <p className="text-caption text-ink-3 mt-2">{note}</p>}
    </div>
  );
}
