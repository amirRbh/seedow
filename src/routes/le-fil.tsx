import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { BottomNavigation } from "@/components/navigation/BottomNavigation";
import { HoldingDetailSheet } from "@/components/portfolio/HoldingDetailSheet";
import { EsgFloorRelaxedNotice } from "@/components/portfolio/EsgFloorRelaxedNotice";
import { EmptyPortfolioState } from "@/components/portfolio/EmptyPortfolioState";
import { ShareImpactButton } from "@/components/impact/ShareImpactButton";
import { AppHeader } from "@/components/navigation/AppHeader";
import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/hooks/useLang";
import type { Lang } from "@/i18n";
import { useActivePortfolio, type ActiveHolding } from "@/hooks/useActivePortfolio";
import { usePortfolioValuation } from "@/hooks/usePortfolioValuation";
import { AnimatedFigure } from "@/components/ui/AnimatedFigure";
import { formatCurrency, formatDate, formatPercent, formatPercentPoints } from "@/lib/format";
import { buildPortfolioImpact } from "@/lib/impact/portfolioImpact";
import type { MoneySummary } from "@/lib/portfolio/leFilSummary";
import {
  weightedImpactScore,
  dominantCategoryWeights,
  topHoldingsByWeight,
  summarizeMoney,
} from "@/lib/portfolio/leFilSummary";
import { assetClassColor } from "@/lib/portfolio/assetClasses";
import { requireAuthedUser } from "@/lib/auth/requireAuthedUser";
import { Provenance } from "@/components/ui/Provenance";
import { PortfolioAnalysisPanel } from "@/components/portfolio/PortfolioAnalysisPanel";
import { usePortfolioAnalysis } from "@/hooks/usePortfolioAnalysis";
import { readComposition, diffCompositions, type LineChange } from "@/lib/portfolio/lastChange";
import { describeConsequences, liteSnapshot } from "@/lib/portfolio/consequences";

// Référence de comparaison : ETF MSCI World (IWDA / EUNL). Rendement et
// volatilité annualisés (mêmes conventions que le comparatif détaillé).
const MSCI_WORLD = { expectedReturn: 0.072, volatility: 0.155 } as const;

export const Route = createFileRoute("/le-fil")({
  beforeLoad: () => requireAuthedUser("/le-fil"),
  component: LeFil,
});

/**
 * « Le Fil » — accueil nouvelle génération (concept Seedow 2.0).
 * On ne consulte plus des pages juxtaposées : on remonte un fil unique,
 * du concret (mon argent) vers le sens (le monde réel). Chaque nœud répond
 * à une seule question ; l'info secondaire se déplie ailleurs (Ethi, détail).
 */
function LeFil() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { lang } = useLang();
  const { portfolio, loading } = useActivePortfolio();
  const valuation = usePortfolioValuation();

  const holdings = useMemo(() => portfolio?.holdings ?? [], [portfolio]);
  const totalInvested = valuation.totalInvested || (portfolio?.initial_amount ?? 0);
  const totalValue = valuation.currentValue || totalInvested;

  // Couverture RÉELLE des cours : part du portefeuille (en poids) dont la ligne
  // porte un cours. Le 100 % en dur affirmait une couverture totale même quand
  // une partie des lignes n'était pas cotée.
  const quoteCoverage = useMemo(() => {
    const lines = valuation.holdings;
    const total = lines.reduce((s, h) => s + h.weight, 0);
    if (total <= 0) return 0;
    const quoted = lines.reduce((s, h) => s + (h.quoteAt ? h.weight : 0), 0);
    return Math.round((quoted / total) * 100);
  }, [valuation.holdings]);

  // Analyse explicable du portefeuille affiché. Les poids repartent tels qu'ils
  // sont stockés (allocationPct est en points) — aucune renormalisation.
  const analysisInput = useMemo(
    () => ({
      weights: Object.fromEntries(holdings.map((h) => [h.id, (h.allocationPct ?? 0) / 100])),
      causes: portfolio?.causes ?? [],
      exclusions: portfolio?.exclusions ?? [],
      horizonYears: portfolio?.horizon_years ?? null,
    }),
    [holdings, portfolio],
  );
  const { analysis, loading: analysisLoading } = usePortfolioAnalysis(analysisInput);

  // « Mon argent » : le montant ET le pourcentage dérivent du même couple
  // (investi, valeur du jour), donc ils racontent forcément la même histoire.
  const money = useMemo(
    () => summarizeMoney(totalInvested, totalValue),
    [totalInvested, totalValue],
  );

  // Résumés du fil (logique pure testée dans lib/portfolio/leFilSummary).
  const impactScore = useMemo(() => weightedImpactScore(holdings), [holdings]);
  const convictions = useMemo(() => dominantCategoryWeights(holdings, 3), [holdings]);
  const topHoldings = useMemo(() => topHoldingsByWeight(holdings, 3), [holdings]);

  // Impact carbone réel via le moteur d'impact honnête : n'expose un écart
  // chiffré que si la couverture des données émetteurs est suffisante (sinon
  // `cleaner` reste faux / delta null). Aucun chiffre fabriqué.
  const impact = useMemo(() => {
    const m = portfolio?.metrics;
    if (!m) return null;
    return buildPortfolioImpact(m, totalInvested || totalValue);
  }, [portfolio, totalInvested, totalValue]);
  const carbonDelta = impact?.intensity?.cleaner ? impact.intensity.vsBenchmarkDeltaPct : null;

  const expectedReturn = portfolio?.metrics?.expected_return ?? null;
  const volatility = portfolio?.metrics?.volatility ?? null;

  const classCopy = useAssetClassCopy();

  // Fiche détaillée d'un actif (bottom sheet) — « pourquoi cet actif est là ».
  const [selectedHolding, setSelectedHolding] = useState<ActiveHolding | null>(null);

  // Ce que le dernier geste a changé. Lu APRÈS montage : `localStorage` n'existe
  // pas au rendu serveur, et une absence de mémoire ne s'invente pas — sans
  // enregistrement, le nœud ne s'affiche simplement pas.
  const [lastChange, setLastChange] = useState<{
    at: string;
    lines: LineChange[];
    consequences: ReturnType<typeof describeConsequences>;
  } | null>(null);
  useEffect(() => {
    const id = portfolio?.id;
    if (!id) return;
    const stored = readComposition(id);
    if (!stored?.previous) {
      setLastChange(null);
      return;
    }
    const toSnapshot = (c: NonNullable<typeof stored.previous>) =>
      liteSnapshot(c.lines.map((l) => ({ id: l.id, esgScore: l.esgScore, weight: l.amount })));
    setLastChange({
      at: stored.current.at,
      lines: diffCompositions(stored.previous, stored.current),
      consequences: describeConsequences(toSnapshot(stored.previous), toSnapshot(stored.current)),
    });
  }, [portfolio?.id]);

  const userName = user?.user_metadata?.name || user?.email?.split("@")[0] || "";

  const reveal = (i: number) => ({
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: 0.06 * i, duration: 0.4 },
  });

  const ethiActions = [
    { key: "le_fil.ethi_why", intent: "why", primary: true },
    { key: "le_fil.ethi_compare", intent: "compare", primary: false },
    { key: "le_fil.ethi_challenge", intent: "challenge", primary: false },
    { key: "le_fil.ethi_simulate", intent: "simulate", primary: false },
  ];

  // Personne n'a encore composé : le fil n'a rien à raconter. Depuis que Seedow
  // ne génère plus d'allocation à la place de l'utilisateur, un compte tout neuf
  // arrive ici SANS portefeuille — dérouler les quatre nœuds à zéro affichait un
  // accueil mort, sans issue. On pose la même entrée à deux intentions que
  // /portfolio (questionnaire ou page blanche), plutôt qu'un second état vide.
  if (!loading && !portfolio) {
    return (
      <div className="min-h-screen bg-paper-2">
        <EmptyPortfolioState userName={userName} />
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper-2">
      <div className="max-w-lg mx-auto pb-28">
        <AppHeader eyebrow={t("le_fil.eyebrow")} title={userName} showPortfolioSelector />

        <div className="relative px-5 pt-4">
          {/* Le fil vertical — c'est le rail de provenance de la DA V2 :
              chaque nœud s'y accroche par un ergot, comme un chiffre s'accroche
              à sa source (docs/DA-V2-PREUVE.md §4.4). */}
          <div aria-hidden className="absolute left-[26px] top-8 bottom-10 w-px bg-paper-3" />

          <div className="flex flex-col gap-4">
            {/* NŒUD 1 — MON ARGENT
                Fond papier (le pavé noir écrasait le reste du fil sans rien
                dire de plus) et une variation qui s'explique : un mot, un
                montant, un pourcentage dérivés du même couple, puis le repère
                de comparaison et la date des cours. */}
            <Node index={1} active {...reveal(1)}>
              <p className="stamp">{t("le_fil.money")}</p>
              <p className="mt-1.5 text-body-sm text-ink-2">{t("le_fil.money_today")}</p>
              <h2 className="mt-1 text-figure-hero leading-none text-ink">
                <AnimatedFigure
                  value={totalValue}
                  from={0}
                  format={(v) => formatCurrency(v, lang)}
                />
              </h2>

              <MoneyDelta money={money} lang={lang} />

              {/* Part non attribuée : un choix valide de l'utilisateur, donc une
                  information à donner — jamais un défaut à corriger pour lui. */}
              {valuation.unallocatedCash > 0.005 && (
                <p className="mt-2 text-body-sm leading-snug text-ink-2">
                  {t("le_fil.money_unallocated", {
                    amount: formatCurrency(valuation.unallocatedCash, lang),
                  })}
                </p>
              )}
              {totalInvested > 0 ? (
                <p className="mt-3 text-body-sm leading-snug text-ink-2">
                  {t("le_fil.money_since", { invested: formatCurrency(totalInvested, lang) })}
                </p>
              ) : (
                <p className="mt-3 text-body-sm leading-snug text-ink-2">
                  {t("le_fil.money_empty")}
                </p>
              )}
              {/* La valorisation porte sa provenance : source, heure de cours,
                  couverture (CLAUDE.md §1.2). L'horodatage garde la précision
                  à la minute — c'est la fraîcheur du cours qui compte ici.
                  Sans aucun cours derrière le chiffre, on ne signe pas
                  « vérifié · Yahoo Finance · couverture 100 % » : le montant
                  est alors ce que l'utilisateur a déclaré, et on le dit. */}
              {valuation.hasQuotes ? (
                <Provenance
                  className="mt-4"
                  status="verified"
                  source="Yahoo Finance"
                  asOf={
                    valuation.latestQuoteAt
                      ? formatDate(valuation.latestQuoteAt, lang, {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : t("le_fil.money_updated_pending")
                  }
                  coverage={quoteCoverage}
                />
              ) : (
                <Provenance className="mt-4" status="unknown" note={t("le_fil.money_declared")} />
              )}

              {/* Convictions rattachées au solde (moins de scroll : un seul nœud
                  « 3 secondes » = combien j'ai + ce que ça finance). Les codes
                  techniques (equity_dev…) ne sortent plus à l'écran : un
                  intitulé courant, la part réelle, et une phrase qui dit ce que
                  c'est — un néophyte ne devine pas « corporate_bond ». */}
              <div className="mt-5 border-t border-paper-3 pt-4">
                <SectionLabel>{t("le_fil.finance")}</SectionLabel>
                {convictions.length > 0 ? (
                  <>
                    <p className="mt-1 text-body-sm leading-snug text-ink-2">
                      {t("le_fil.finance_hint")}
                    </p>
                    <ul className="mt-3.5 flex flex-col gap-3.5">
                      {convictions.map((c) => (
                        <FinanceRow
                          key={c.category}
                          category={c.category}
                          weightPct={c.weightPct}
                          lang={lang}
                        />
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-ink-3">{t("le_fil.define_convictions")}</p>
                )}
                <Link
                  to="/discover"
                  search={{ theme: portfolio?.causes?.[0] }}
                  className="mt-4 inline-block text-body font-semibold text-mint-ink hover:underline underline-offset-4"
                >
                  {t("le_fil.explore_aligned")} →
                </Link>
              </div>
            </Node>

            {/* NŒUD 2 — MON IMPACT — remonté juste après l'argent : c'est
                la raison d'être du produit, pas une métrique reléguée en bas.
                Le chiffre mis en avant est l'écart carbone RÉEL quand il existe ;
                la note ESG reste affichée, mais nommée pour ce qu'elle est. */}
            <Node index={2} active {...reveal(2)}>
              <p className="stamp">{t("le_fil.impact")}</p>

              {/* Le chiffre de tête est l'écart carbone MESURÉ, pas la moyenne
                  ESG : c'est le seul des deux qui décrit un effet sur le monde.
                  Quand il n'est pas mesurable, on le dit au lieu de mettre la
                  note ESG à sa place — un score n'est pas un impact. */}
              {carbonDelta != null ? (
                <>
                  <p className="mt-1.5 text-body-sm text-ink-2">{t("le_fil.impact_carbon_lead")}</p>
                  <h2 className="mt-1 text-figure-hero leading-none text-mint-ink">
                    −{formatPercent(carbonDelta, lang, 0)}
                  </h2>
                  <p className="mt-2 text-body-sm leading-snug text-ink-2">
                    {t("le_fil.impact_carbon_desc")}
                  </p>
                </>
              ) : (
                <p className="mt-1.5 text-body-sm leading-snug text-ink-2">
                  {impactScore !== null
                    ? t("le_fil.impact_carbon_pending")
                    : t("le_fil.impact_empty")}
                </p>
              )}

              {/* La note ESG reste — nommée pour ce qu'elle est : une moyenne
                  des notes de tes lignes, pas une mesure d'impact. */}
              {impactScore !== null && (
                <div className="mt-4 flex items-center gap-4 border-t border-paper-3 pt-4">
                  <ImpactRing score={impactScore} />
                  <div className="text-body-sm leading-snug text-ink-2">
                    {t("le_fil.esg_average_desc")}
                    <br />
                    <Link
                      to="/certificat"
                      className="text-ice-ink underline underline-offset-4 hover:no-underline"
                    >
                      {t("le_fil.impact_link")} →
                    </Link>
                  </div>
                </div>
              )}
              {carbonDelta != null && (
                <Provenance
                  className="mt-3"
                  status="verified"
                  source={t("le_fil.carbon_source")}
                  coverage={
                    impact?.presentation
                      ? Math.round(impact.presentation.coverage * 100)
                      : undefined
                  }
                />
              )}
              {portfolio?.esg_floor_relaxed && (
                <div className="mt-3">
                  <EsgFloorRelaxedNotice relaxed />
                </div>
              )}
              {impactScore !== null && (
                <div className="mt-4 border-t border-paper-3 pt-3">
                  <ShareImpactButton metrics={portfolio?.metrics ?? null} variant="ghost" />
                </div>
              )}
              {/* Équivalences concrètes — affichées UNIQUEMENT si le moteur
                  d'impact le juge honnête (empreinte mesurée + couverture ≥ 50 %).
                  Sinon, état de repli honnête ET engageant (jamais de silence) :
                  on montre où on en est et ce qui manque pour débloquer le chiffre. */}
              {impact?.presentation?.show && impact.presentation.equivalences.length > 0 ? (
                <div className="mt-5 paper-card-inset p-4">
                  <SectionLabel>{t("le_fil.equivalences_title")}</SectionLabel>
                  <ul className="mt-2.5 flex flex-col gap-2">
                    {impact.presentation.equivalences.slice(0, 3).map((e) => (
                      <li key={e.factorId} className="flex items-baseline justify-between gap-3">
                        <span className="text-body text-ink-2">{t(e.labelKey)}</span>
                        <span className="shrink-0 font-value text-body text-mint-ink">
                          ≈ {Math.round(e.value).toLocaleString(lang, { maximumFractionDigits: 0 })}{" "}
                          {t(e.unitKey)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <Provenance
                    className="mt-3"
                    status="modelled"
                    source={impact.presentation.equivalences[0]?.source}
                    coverage={Math.round(impact.presentation.coverage * 100)}
                  />
                </div>
              ) : (
                impact?.presentation && (
                  <div className="mt-5 paper-card-inset p-4">
                    <SectionLabel>{t("le_fil.equivalences_title")}</SectionLabel>
                    <p className="mt-2 text-body text-ink-2 leading-snug">
                      {t(impact.presentation.reasonKey ?? "impact.reason.no_data", {
                        pct: Math.round(impact.presentation.coverage * 100),
                      })}
                    </p>
                    {impact.presentation.reasonKey === "impact.reason.low_coverage" && (
                      <div className="mt-2.5">
                        <div className="h-[3px] w-full bg-paper-3 overflow-hidden">
                          <div
                            className="h-full bg-ink"
                            style={{
                              width: `${Math.min(100, Math.round(impact.presentation.coverage * 100 * 2))}%`,
                            }}
                          />
                        </div>
                        <p className="mt-1.5 stamp">
                          {Math.round(impact.presentation.coverage * 100)}% / 50%
                        </p>
                      </div>
                    )}
                  </div>
                )
              )}
            </Node>

            {/* NŒUD 3 — MES INVESTISSEMENTS */}
            <Node index={3} active {...reveal(3)}>
              <div className="flex items-baseline justify-between gap-3">
                <SectionLabel>{t("le_fil.investments")}</SectionLabel>
                {holdings.length > 0 && (
                  <Link
                    to="/portfolio"
                    className="stamp text-ice-ink underline underline-offset-4 hover:no-underline"
                  >
                    {t("le_fil.see_all")} →
                  </Link>
                )}
              </div>
              {topHoldings.length > 0 ? (
                <ul className="mt-1 flex flex-col divide-y divide-paper-3/70">
                  {topHoldings.map((h) => (
                    <li key={h.id} className="group flex items-center gap-3 py-3">
                      <button
                        type="button"
                        onClick={() => setSelectedHolding(h)}
                        aria-label={t("le_fil.asset_detail", { name: h.name })}
                        className="min-w-0 flex-1 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-highlight-1"
                      >
                        <p className="truncate text-body font-semibold text-ink">{h.name}</p>
                        {/* `allocationPct` est en POINTS (0..100) : le passer
                            tel quel à `formatPercent` affichait « 6 200 % »
                            pour une ligne à 62 %. */}
                        <p className="mt-0.5 text-body-sm text-ink-3">
                          {classCopy.label(h.category ?? "other")} ·{" "}
                          {formatPercentPoints(h.allocationPct ?? 0, lang, 0)}
                        </p>
                      </button>
                      <span className="font-value text-body text-ink">
                        {formatCurrency(((h.allocationPct ?? 0) / 100) * totalValue, lang)}
                      </span>
                      <Link
                        to="/ethi"
                        search={{ intent: "why", q: h.ticker }}
                        aria-label={t("le_fil.why_asset", { name: h.name })}
                        className="shrink-0 stamp opacity-70 transition-opacity hover:text-ice-ink focus-visible:opacity-100 group-hover:opacity-100"
                      >
                        {t("le_fil.why")}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-ink-3">{t("le_fil.empty_holdings")}</p>
              )}
            </Node>

            {/* CE QUI A CHANGÉ — le geste qui a produit l'état ci-dessus, et ce
                qu'il a déplacé. Le Fil racontait un état sans jamais dire ce que
                l'utilisateur avait fait pour y arriver. Absent tant qu'il n'y a
                pas deux compositions à comparer : on ne fabrique pas d'histoire. */}
            {lastChange && (lastChange.lines.length > 0 || lastChange.consequences.length > 0) && (
              <Node index={4} active {...reveal(4)}>
                <SectionLabel>{t("le_fil.changed")}</SectionLabel>
                <p className="mt-1 text-body-sm leading-snug text-ink-2">
                  {t("le_fil.changed_when", {
                    date: formatDate(lastChange.at, lang, {
                      day: "numeric",
                      month: "long",
                    }),
                  })}
                </p>

                {lastChange.lines.length > 0 && (
                  <ul className="mt-3 flex flex-col gap-1.5">
                    {lastChange.lines.slice(0, 4).map((c) => (
                      <li
                        key={`${c.kind}-${c.name}`}
                        className="text-body-sm text-ink leading-snug"
                      >
                        {t(`le_fil.change.${c.kind}`, {
                          name: c.name,
                          from: formatCurrency(c.from, lang),
                          to: formatCurrency(c.to, lang),
                        })}
                      </li>
                    ))}
                  </ul>
                )}

                {lastChange.consequences.length > 0 && (
                  <>
                    <p className="mt-4 text-tag uppercase tracking-[0.14em] font-mono text-ink-3">
                      {t("le_fil.changed_effect")}
                    </p>
                    <ul className="mt-1.5 flex flex-col gap-1.5">
                      {lastChange.consequences.map((c) => (
                        <li
                          key={c.key}
                          className="flex items-start gap-2 text-body-sm text-ink-2 leading-snug"
                        >
                          {/* La direction est doublée d'un mot : jamais la couleur seule (§4). */}
                          <span
                            aria-hidden
                            className={
                              c.dir === "up"
                                ? "text-mint-ink"
                                : c.dir === "down"
                                  ? "text-solar-ink"
                                  : "text-ink-3"
                            }
                          >
                            {c.dir === "up" ? "↑" : c.dir === "down" ? "↓" : "="}
                          </span>
                          <span>{t(c.key, c.vars)}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                <Provenance className="mt-3" status="unknown" note={t("le_fil.changed_local")} />
              </Node>
            )}

            {/* NŒUD 5 — COMPRENDRE : ce que cette composition implique.
                Seedow explique les conséquences, il ne corrige pas les choix. */}
            {(analysis || analysisLoading) && (
              <Node index={5} active {...reveal(5)}>
                <SectionLabel>{t("le_fil.understand")}</SectionLabel>
                {analysis ? (
                  <>
                    <p className="mt-1 text-body-sm leading-snug text-ink-2">
                      {t("le_fil.understand_hint")}
                    </p>
                    <PortfolioAnalysisPanel className="mt-3" analysis={analysis} />
                  </>
                ) : (
                  <p role="status" className="mt-2 text-sm text-ink-3">
                    {t("le_fil.understand_loading")}
                  </p>
                )}
              </Node>
            )}

            {/* NŒUD 6 — ALLER PLUS LOIN : comparaison + monde réel, repliés par
                défaut pour limiter le scroll (divulgation progressive, Règle 2). */}
            <Node index={6} active={false} {...reveal(6)}>
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
                  <span className="stamp">{t("le_fil.more")}</span>
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4 flex-none text-ink-3 transition-transform duration-300 group-open:rotate-180"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </summary>

                <div className="mt-4 flex flex-col gap-4">
                  {/* Comparaison MSCI */}
                  <div>
                    <SectionLabel>{t("le_fil.compare_title")}</SectionLabel>
                    {expectedReturn != null && volatility != null ? (
                      <div className="mt-3 flex flex-col gap-3">
                        <CompareRow
                          label={t("le_fil.expected_return")}
                          mineLabel={t("le_fil.mine")}
                          mine={expectedReturn}
                          benchmark={MSCI_WORLD.expectedReturn}
                          lang={lang}
                          higherIsBetter
                        />
                        <CompareRow
                          label={t("le_fil.risk_vol")}
                          mineLabel={t("le_fil.mine")}
                          mine={volatility}
                          benchmark={MSCI_WORLD.volatility}
                          lang={lang}
                          higherIsBetter={false}
                        />
                        <Link
                          to="/comparatif"
                          className="stamp text-ice-ink underline underline-offset-4 hover:no-underline"
                        >
                          {t("le_fil.compare_detail")} →
                        </Link>
                        <Provenance status="modelled" note={t("le_fil.returns_disclaimer")} />
                      </div>
                    ) : (
                      <p className="text-sm text-ink-3 mt-2">{t("le_fil.compare_empty")}</p>
                    )}
                  </div>

                  {/* Le monde réel */}
                  <div className="border-t border-paper-3 pt-4">
                    <SectionLabel>{t("le_fil.real_world")}</SectionLabel>
                    <p className="text-body text-ink-2 mt-1.5">{t("le_fil.real_world_desc")}</p>
                    <Link to="/methodologie" className="inline-block mt-2.5 stamp hover:text-ink">
                      {t("le_fil.methodology")} →
                    </Link>
                  </div>
                </div>
              </details>
            </Node>
          </div>

          {/* Ethi — actions contextuelles, jamais un chat vide */}
          <motion.div {...reveal(7)} className="mt-6 pl-9">
            <SectionLabel>{t("le_fil.ask_ethi")}</SectionLabel>
            <div className="mt-3 flex flex-wrap gap-2">
              {ethiActions.map((a) => (
                <Link
                  key={a.intent}
                  to="/ethi"
                  search={{ intent: a.intent, q: undefined }}
                  className={`inline-flex h-10 items-center rounded-full px-4 text-body font-semibold transition-opacity ${
                    a.primary
                      ? "bg-ink text-paper hover:opacity-85"
                      : "bg-paper text-ink-2 hover:text-ink"
                  }`}
                >
                  {t(a.key)}
                </Link>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      <HoldingDetailSheet
        open={selectedHolding !== null}
        onClose={() => setSelectedHolding(null)}
        holding={selectedHolding}
      />

      <BottomNavigation />
    </div>
  );
}

/**
 * Intitulés courants des classes d'actifs. Repli en cascade : libellé néophyte
 * → libellé technique existant → code brut, pour qu'une classe ajoutée en base
 * n'affiche jamais une clé i18n. Les codes techniques (`equity_dev`,
 * `corporate_bond`…) ne doivent pas atteindre l'écran : personne hors finance
 * ne les décode.
 */
function useAssetClassCopy() {
  const { t } = useTranslation();
  return {
    label: (assetClass: string) =>
      t(`le_fil.classes.${assetClass}.label`, {
        defaultValue: t(`asset_class.${assetClass}`, { defaultValue: assetClass }),
      }),
    hint: (assetClass: string) => t(`le_fil.classes.${assetClass}.hint`, { defaultValue: "" }),
  };
}

/**
 * Variation de « Mon argent ». Trois signaux redondants — un mot, une flèche,
 * une couleur — parce qu'aucune information ne doit reposer sur la couleur
 * seule (CLAUDE.md §4). Montant et pourcentage sont affichés en valeur absolue :
 * le sens est déjà porté par le mot, un « -0,79 € · -0,70 % » derrière « En
 * baisse » empile les négations pour rien.
 */
function MoneyDelta({ money, lang }: { money: MoneySummary; lang: Lang }) {
  const { t } = useTranslation();
  const tone = {
    up: "border-mint/30 bg-mint/10 text-mint-ink",
    down: "border-alert/25 bg-alert/10 text-alert-ink",
    flat: "border-paper-3 bg-paper-2 text-ink-2",
  }[money.trend];
  const arrow = { up: "▲", down: "▼", flat: "→" }[money.trend];
  const label = t(`le_fil.money_trend_${money.trend}`);

  return (
    <p
      className={`mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-body-sm font-medium ${tone}`}
    >
      <span aria-hidden>{arrow}</span>
      <span>{label}</span>
      <span aria-hidden className="opacity-40">
        ·
      </span>
      <span className="font-mono tabular-nums">{formatCurrency(Math.abs(money.gain), lang)}</span>
      <span aria-hidden className="opacity-40">
        ·
      </span>
      <span className="font-mono tabular-nums">
        {formatPercentPoints(Math.abs(money.returnPoints), lang)}
      </span>
    </p>
  );
}

/**
 * Une famille d'actifs dans « Ce que je finance » : intitulé courant, part
 * réelle, et une phrase qui explique ce que c'est. La barre est décorative —
 * le pourcentage est écrit à côté.
 */
function FinanceRow({
  category,
  weightPct,
  lang,
}: {
  category: string;
  weightPct: number;
  lang: Lang;
}) {
  const { t } = useTranslation();
  const copy = useAssetClassCopy();
  const label = copy.label(category);
  const hint = copy.hint(category);
  const share = Math.max(0, Math.min(100, weightPct));

  return (
    <li>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-body font-medium text-ink">{label}</p>
        <span className="shrink-0 font-mono text-body-sm tabular-nums text-ink-2">
          {t("le_fil.finance_share", { pct: formatPercentPoints(share, lang, 0) })}
        </span>
      </div>
      <div aria-hidden className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-paper-2">
        <span
          className="block h-full rounded-full"
          style={{ width: `${share}%`, background: assetClassColor(category) }}
        />
      </div>
      {hint && <p className="mt-1.5 text-body-sm leading-snug text-ink-2">{hint}</p>}
    </li>
  );
}

/** Intitulé de section : traitement typographique unique dans tout le fil. */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="stamp">{children}</p>;
}

/** Un nœud du fil : puce sur la ligne + carte de contenu. */
function Node({
  index,
  active,
  children,
  ...motionProps
}: {
  index: number;
  active: boolean;
  children: React.ReactNode;
} & React.ComponentProps<typeof motion.div>) {
  return (
    <motion.div {...motionProps} className="relative pl-9">
      {/* Ergot sur le fil — une pastille discrète, alignée sur la carte. */}
      <span
        aria-hidden
        className={`absolute left-[18px] top-[26px] h-[9px] w-[9px] -translate-x-1/2 rounded-full ring-4 ring-paper-2 ${
          active ? "bg-mint" : "bg-paper-3"
        }`}
      />
      <div className="paper-card p-6">{children}</div>
    </motion.div>
  );
}

/**
 * Ligne de comparaison honnête : deux barres (mon Fil vs indice), la couleur
 * mint signalant simplement quel côté est le plus favorable pour cette métrique.
 */
function CompareRow({
  label,
  mineLabel,
  mine,
  benchmark,
  lang,
  higherIsBetter,
}: {
  label: string;
  mineLabel: string;
  mine: number;
  benchmark: number;
  lang: Parameters<typeof formatPercent>[1];
  higherIsBetter: boolean;
}) {
  const max = Math.max(mine, benchmark) || 1;
  const better = higherIsBetter ? mine >= benchmark : mine <= benchmark;
  return (
    <div className="flex flex-col gap-1.5">
      <p className="stamp">{label}</p>
      {/* Barres à coins vifs : la mienne pleine, la référence hachurée — le
          motif double la couleur (lisible en daltonisme, DA V2 §4.5). */}
      <div className="flex items-center gap-2">
        <span className="w-14 shrink-0 stamp">{mineLabel}</span>
        <div className="h-[6px] flex-1 bg-paper-3">
          <span
            className="block h-full"
            style={{
              width: `${(mine / max) * 100}%`,
              background: better ? "var(--color-mint)" : "var(--color-ink-3)",
            }}
          />
        </div>
        <span
          className={`w-14 shrink-0 text-right font-value text-caption ${better ? "text-mint-ink" : "text-ink-2"}`}
        >
          {formatPercent(mine, lang, 1)}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-14 shrink-0 stamp">MSCI</span>
        <div className="h-[6px] flex-1 bg-paper-3">
          <span
            className="hatch block h-full text-ink-3"
            style={{ width: `${(benchmark / max) * 100}%` }}
          />
        </div>
        <span className="w-14 shrink-0 text-right font-value text-caption text-ink-2">
          {formatPercent(benchmark, lang, 1)}
        </span>
      </div>
    </div>
  );
}

/**
 * Jauge d'impact — DA V2 : un instrument gradué, pas un anneau. Le chiffre en
 * chasse fixe, une réglure de 0 à 100 avec ses graduations, et le curseur
 * marqué par un trait d'encre. Jamais un badge A/B/C.
 */
function ImpactRing({ score }: { score: number | null }) {
  const pct = Math.max(0, Math.min(100, score ?? 0));
  return (
    <div className="w-[112px] shrink-0">
      <span className="font-value text-[30px] leading-none text-ink">
        {score === null ? (
          "—"
        ) : (
          <AnimatedFigure value={score} from={0} format={(v) => String(Math.round(v))} />
        )}
        <span className="text-ink-3 text-[0.45em] ml-1">/ 100</span>
      </span>
      <div className="relative mt-3 h-[18px]" aria-hidden>
        <div className="absolute inset-x-0 top-0 h-px bg-paper-3" />
        {[0, 25, 50, 75, 100].map((tick) => (
          <span
            key={tick}
            className="absolute top-0 w-px bg-paper-3"
            style={{ left: `${tick}%`, height: tick % 50 === 0 ? 7 : 4 }}
          />
        ))}
        {score !== null && (
          <span
            className="absolute top-0 h-[13px] w-[2px] bg-ink"
            style={{ left: `calc(${pct}% - 1px)` }}
          />
        )}
        <span className="absolute inset-x-0 top-[3px] h-px bg-ink" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
