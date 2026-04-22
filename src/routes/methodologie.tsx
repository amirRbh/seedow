import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import { simulatePortfolio } from "@/lib/portfolio/server.functions";
import type { CauseTag, ExclusionTag } from "@/lib/portfolio/types";

export const Route = createFileRoute("/methodologie")({
  head: () => ({
    meta: [
      { title: "Méthodologie — Construction de portefeuille" },
      { name: "description", content: "Pipeline de construction du portefeuille : exclusions, best-in-class, optimisation Markowitz contrainte, tilts par convictions." },
    ],
  }),
  component: MethodologyPage,
});

const CAUSES: { id: CauseTag; label: string }[] = [
  { id: "climat", label: "Climat" },
  { id: "biodiversite", label: "Biodiversité" },
  { id: "humain", label: "Droits humains" },
  { id: "egalite", label: "Égalité F/H" },
  { id: "tech", label: "Tech éthique" },
  { id: "circulaire", label: "Économie circulaire" },
];

const EXCLUSIONS: { id: ExclusionTag; label: string }[] = [
  { id: "fossiles", label: "Énergies fossiles" },
  { id: "armes", label: "Armement" },
  { id: "tabac", label: "Tabac" },
  { id: "jeux", label: "Jeux d'argent" },
  { id: "animaux", label: "Tests animaux" },
  { id: "fast-fashion", label: "Fast fashion" },
];

const STAGES = [
  { id: 1, name: "Profilage", desc: "Causes, exclusions, horizon, risque cible." },
  { id: 2, name: "Univers", desc: "~40 actifs multi-classes : actions, obligations vertes, thématiques, REIT, monétaire." },
  { id: 3, name: "Filtres", desc: "Exclusions sectorielles dures, puis best-in-class ESG (top 50% par classe — médiane)." },
  { id: 4, name: "Convictions", desc: "Ajustement linéaire des rendements attendus selon vos causes (≤ +1,5% par cause). Pas de Black-Litterman complet." },
  { id: 5, name: "Optimisation", desc: "Markowitz contraint : max rendement / variance, bornes par classe et plancher ESG composite pondéré E/S/G selon vos causes." },
];

type SimResult = Awaited<ReturnType<typeof simulatePortfolio>>;

function MethodologyPage() {
  const simulate = useServerFn(simulatePortfolio);

  // Default state
  const [causes, setCauses] = useState<CauseTag[]>(["climat", "biodiversite"]);
  const [intensity, setIntensity] = useState<Record<string, number>>({
    climat: 0.7, biodiversite: 0.5,
  });
  const [exclusions, setExclusions] = useState<ExclusionTag[]>(["fossiles", "armes"]);
  const [risk, setRisk] = useState(0.09);
  const [horizon, setHorizon] = useState(10);

  const [result, setResult] = useState<SimResult | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced simulation
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setLoading(true);
    debounceRef.current = setTimeout(() => {
      simulate({
        data: {
          causes,
          cause_intensity: intensity,
          exclusions,
          risk_target: risk,
          horizon_years: horizon,
          initial_amount: 1000,
        },
      })
        .then((r) => setResult(r))
        .catch((e) => console.error("simulate", e))
        .finally(() => setLoading(false));
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [causes, intensity, exclusions, risk, horizon, simulate]);

  const toggleCause = (id: CauseTag) => {
    setCauses((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((x) => x !== id);
        const newInt = { ...intensity };
        delete newInt[id];
        setIntensity(newInt);
        return next;
      }
      setIntensity({ ...intensity, [id]: 0.5 });
      return [...prev, id];
    });
  };

  const toggleExclusion = (id: ExclusionTag) => {
    setExclusions((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const sortedWeights = useMemo(() => {
    if (!result) return [];
    return Object.entries(result.weights)
      .map(([id, w]) => {
        const a = result.selected.find((x) => x.id === id);
        return { id, weight: w, asset: a };
      })
      .filter((x) => x.asset)
      .sort((a, b) => b.weight - a.weight);
  }, [result]);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="max-w-6xl mx-auto px-6 pt-10 pb-8 border-b border-paper-3">
        <Link to="/dashboard" className="text-[10px] uppercase tracking-[0.18em] text-ink-3 hover:text-ink transition-colors">
          ← Tableau de bord
        </Link>
        <h1 className="font-value text-4xl mt-4">Méthodologie</h1>
        <p className="text-[14px] text-ink-2 mt-3 max-w-2xl leading-relaxed">
          Cinq étapes, transparentes et reproductibles. Ajustez les paramètres en bas de page pour observer le portefeuille recomposé en direct.
        </p>
      </header>

      {/* Pipeline visualization */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        <p className="text-[10px] uppercase tracking-[0.18em] text-ink-3 font-medium mb-8">
          Pipeline de construction
        </p>
        <ol className="grid grid-cols-1 md:grid-cols-5 gap-px bg-paper-3 border border-paper-3">
          {STAGES.map((s) => (
            <li key={s.id} className="bg-paper p-5">
              <span className="font-value text-[11px] text-ink-3 tabular-nums">0{s.id}</span>
              <h3 className="font-value text-[16px] text-ink mt-1">{s.name}</h3>
              <p className="text-[12px] text-ink-2 mt-2 leading-relaxed">{s.desc}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Simulator */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="border-t border-paper-3 pt-10">
          <p className="text-[10px] uppercase tracking-[0.18em] text-ink-3 font-medium">
            Simulateur interactif
          </p>
          <h2 className="font-value text-3xl mt-2">Composez votre portefeuille</h2>
          <p className="text-[13px] text-ink-2 mt-2 max-w-2xl">
            Toute modification ci-dessous recalcule l'allocation selon le pipeline complet.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-10 mt-10">
          {/* Controls */}
          <div className="space-y-8">
            {/* Causes */}
            <Block title="Causes & intensité">
              <div className="space-y-3">
                {CAUSES.map((c) => {
                  const active = causes.includes(c.id);
                  return (
                    <div key={c.id} className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => toggleCause(c.id)}
                        className={`w-4 h-4 rounded-sm border flex items-center justify-center flex-shrink-0 transition-colors ${
                          active ? "bg-ink border-ink" : "bg-paper border-paper-3 hover:border-ink"
                        }`}
                      >
                        {active && <svg width="10" height="8" viewBox="0 0 10 8"><path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                      </button>
                      <label className="text-[13px] text-ink min-w-[140px]">{c.label}</label>
                      {active && (
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.05}
                          value={intensity[c.id] ?? 0.5}
                          onChange={(e) => setIntensity({ ...intensity, [c.id]: Number(e.target.value) })}
                          className="flex-1 accent-ink h-1"
                        />
                      )}
                      {active && (
                        <span className="text-[11px] text-ink-3 tabular-nums w-10 text-right">
                          {Math.round((intensity[c.id] ?? 0.5) * 100)}%
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </Block>

            {/* Exclusions */}
            <Block title="Exclusions sectorielles">
              <div className="grid grid-cols-2 gap-2">
                {EXCLUSIONS.map((e) => {
                  const active = exclusions.includes(e.id);
                  return (
                    <button
                      key={e.id}
                      onClick={() => toggleExclusion(e.id)}
                      className={`flex items-center gap-2 p-2.5 rounded border text-left text-[12px] transition-colors ${
                        active ? "bg-ink/5 border-ink text-ink" : "bg-paper border-paper-3 text-ink-2 hover:border-ink-3"
                      }`}
                    >
                      <span className={`w-3 h-3 rounded-sm border flex-shrink-0 ${active ? "bg-ink border-ink" : "border-paper-3"}`} />
                      {e.label}
                    </button>
                  );
                })}
              </div>
            </Block>

            {/* Risk & horizon */}
            <Block title="Risque cible">
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-[12px] text-ink-2">Volatilité annuelle visée</span>
                <span className="text-[13px] font-medium tabular-nums">{(risk * 100).toFixed(1)}%</span>
              </div>
              <input
                type="range"
                min={0.04}
                max={0.18}
                step={0.005}
                value={risk}
                onChange={(e) => setRisk(Number(e.target.value))}
                className="w-full accent-ink"
              />
              <div className="flex justify-between text-[10px] text-ink-3 mt-1">
                <span>Prudent</span>
                <span>Équilibré</span>
                <span>Dynamique</span>
              </div>
            </Block>

            <Block title="Horizon">
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-[12px] text-ink-2">Durée d'investissement</span>
                <span className="text-[13px] font-medium tabular-nums">{horizon} ans</span>
              </div>
              <input
                type="range"
                min={1}
                max={30}
                step={1}
                value={horizon}
                onChange={(e) => setHorizon(Number(e.target.value))}
                className="w-full accent-ink"
              />
            </Block>
          </div>

          {/* Result */}
          <div className="lg:sticky lg:top-6 lg:self-start space-y-6">
            {/* ESG floor warning */}
            {result?.esg_floor_relaxed && (
              <div className="border border-rust/30 bg-rust/5 px-4 py-3 text-[12px] text-ink-2 leading-relaxed">
                <p className="font-value text-[13px] text-rust mb-1">Plancher ESG relâché</p>
                Avec ces contraintes, l'optimiseur n'a pas trouvé de portefeuille satisfaisant le score ESG minimum de 70/100.
                Le plancher a été levé pour produire une allocation viable. Le score affiché ci-dessous est le score réel obtenu.
              </div>
            )}
            {/* Metrics */}
            <div className="border-t border-b border-paper-3 divide-y divide-paper-3">
              <MetricRow label="Rendement attendu" value={result ? `${(result.metrics.expected_return * 100).toFixed(2)}%` : "—"} hint="Brut, annualisé" />
              <MetricRow label="Volatilité estimée" value={result ? `${(result.metrics.volatility * 100).toFixed(2)}%` : "—"} hint="Annualisée" />
              <MetricRow label="Ratio de Sharpe" value={result ? result.metrics.sharpe.toFixed(2) : "—"} hint="Net de frais et taux sans risque" />
              <MetricRow label="Score ESG" value={result ? `${result.metrics.esg_score.toFixed(0)} / 100` : "—"} hint="Composite E/S/G pondéré par causes" />
              <MetricRow label="Frais courants" value={result ? `${(result.metrics.ter * 100).toFixed(2)}%` : "—"} hint="TER moyen pondéré" />
              <MetricRow label="CO₂ évité (heuristique)" value={result ? `${result.metrics.co2_avoided_tons.toFixed(2)} t / 10k€` : "—"} hint="Estimation indicative basée sur l'ESG" />
              <MetricRow
                label="Intensité carbone réelle"
                value={
                  result?.metrics.carbon_intensity_gco2e_per_eur != null
                    ? `${result.metrics.carbon_intensity_gco2e_per_eur.toFixed(0)} gCO₂e/€/an`
                    : "Donnée indisponible"
                }
                hint={
                  result?.metrics.carbon_intensity_coverage
                    ? `Couverture : ${(result.metrics.carbon_intensity_coverage * 100).toFixed(0)}% du portefeuille`
                    : "À renseigner depuis MSCI / Trucost / Yahoo"
                }
              />
            </div>

            {/* Holdings */}
            <div>
              <div className="flex items-baseline justify-between border-b border-paper-3 pb-2">
                <p className="text-[10px] uppercase tracking-[0.12em] text-ink-3 font-medium">Allocation</p>
                <p className="text-[10px] text-ink-3">
                  {loading ? "Recalcul…" : `${sortedWeights.length} positions`}
                </p>
              </div>
              <ul className="divide-y divide-paper-3">
                {sortedWeights.map((row, i) => (
                  <motion.li
                    key={row.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="py-2.5"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="flex items-baseline gap-2 min-w-0">
                        <span className="font-value text-[13px] text-ink">{row.asset!.ticker}</span>
                        <span className="text-[11px] text-ink-3 truncate">{row.asset!.name}</span>
                      </div>
                      <span className="text-[12px] tabular-nums font-medium">{(row.weight * 100).toFixed(1)}%</span>
                    </div>
                    <div className="mt-1 h-px bg-paper-3 relative">
                      <div className="absolute inset-y-0 left-0 bg-ink" style={{ width: `${row.weight * 100}%`, height: "1px" }} />
                    </div>
                  </motion.li>
                ))}
                {!loading && sortedWeights.length === 0 && (
                  <li className="py-6 text-center text-[12px] text-ink-3">
                    Aucune position retenue avec ces contraintes.
                  </li>
                )}
              </ul>
            </div>

            {/* Class breakdown */}
            {result && (
              <div>
                <p className="text-[10px] uppercase tracking-[0.12em] text-ink-3 font-medium border-b border-paper-3 pb-2 mb-3">
                  Répartition par classe
                </p>
                <ul className="space-y-1.5">
                  {Object.entries(result.metrics.by_class)
                    .filter(([, w]) => w > 0.005)
                    .sort(([, a], [, b]) => b - a)
                    .map(([cls, w]) => (
                      <li key={cls} className="flex items-baseline justify-between text-[12px]">
                        <span className="text-ink-2">{ASSET_CLASS_LABEL[cls] ?? cls}</span>
                        <span className="tabular-nums">{(w * 100).toFixed(1)}%</span>
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

const ASSET_CLASS_LABEL: Record<string, string> = {
  equity_dev: "Actions développées",
  equity_em: "Actions émergentes",
  thematic: "Thématiques",
  green_bond: "Obligations vertes",
  social_bond: "Obligations sociales",
  sov_bond: "Obligations souveraines",
  reit: "Immobilier",
  commodity: "Matières premières",
  cash: "Monétaire",
};

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.15em] text-ink-3 font-medium border-b border-paper-3 pb-2 mb-3">
        {title}
      </p>
      {children}
    </div>
  );
}

function MetricRow({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between py-2.5">
      <div>
        <p className="text-[12px] text-ink">{label}</p>
        {hint && <p className="text-[10px] text-ink-3 mt-0.5">{hint}</p>}
      </div>
      <span className="font-value text-[15px] tabular-nums">{value}</span>
    </div>
  );
}
