import { useState, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { InvestDialog } from "@/components/portfolio/InvestDialog";
import type { MockAsset } from "@/lib/mockGarden";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: MockAsset | null;
}

const RISK_LABELS: Record<number, { label: string; tone: string }> = {
  1: { label: "Très faible", tone: "text-moss-1" },
  2: { label: "Faible", tone: "text-moss-1" },
  3: { label: "Modéré", tone: "text-moss-2" },
  4: { label: "Équilibré", tone: "text-ink" },
  5: { label: "Élevé", tone: "text-rust" },
  6: { label: "Très élevé", tone: "text-rust" },
  7: { label: "Spéculatif", tone: "text-bloom" },
};

const fmtEur = (n: number) =>
  n.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

function impactFor(
  monthly: number,
  co2Factor: number,
  energyFactor: number
) {
  const annualK = (monthly * 12) / 1000;
  return {
    co2: co2Factor * annualK,
    kwh: energyFactor * annualK,
    trees: Math.round(annualK * 4.2),
  };
}

export function AssetDetailSheet({ open, onOpenChange, asset }: Props) {
  if (!asset) return null;

  const [monthly, setMonthly] = useState(100);

  const risk = asset.risk_level ?? 4;
  const riskInfo = RISK_LABELS[risk];

  // Risques propres au type d'actif
  const risksList = buildRisks(asset);

  const imp = impactFor(monthly, asset.co2_factor_per_1k_eur, asset.energy_factor_per_1k_eur);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto p-0">
        <div className="px-5 pt-5 pb-4 border-b border-paper-3 bg-paper-2/40">
          <SheetHeader className="text-left p-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-[0.18em] text-ink-3 font-semibold">
                  {asset.category} · {asset.ticker}
                </p>
                <SheetTitle className="font-value text-2xl text-ink mt-1 leading-tight">
                  {asset.name}
                </SheetTitle>
                <p className="font-value text-[15px] text-ink-2 mt-1">
                  {fmtEur(asset.current_price)}
                  <span className="text-[11px] text-ink-3 ml-1">/ part</span>
                </p>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-semibold text-moss-1 bg-moss-5 px-2 py-1 rounded-full border border-moss-4 flex-shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-moss-1" />
                ESG {asset.overall_esg_score.toFixed(1)}
              </div>
            </div>
          </SheetHeader>
        </div>

        <div className="px-5 py-5 space-y-6">
          {/* Résumé */}
          <section>
            <p className="text-[10px] uppercase tracking-[0.18em] text-ink-3 font-semibold mb-2">
              Résumé
            </p>
            <p className="text-[13px] text-ink-2 leading-relaxed">{asset.description}</p>
            {asset.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {asset.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] bg-moss-5 text-moss-1 font-semibold px-2 py-0.5 rounded-full capitalize border border-moss-4"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* Impact dynamique */}
          <section>
            <p className="text-[10px] uppercase tracking-[0.18em] text-ink-3 font-semibold mb-3">
              Aperçu de l'impact · versement mensuel sur 1 an
            </p>

            {/* Montant + slider */}
            <div className="bg-paper-2 rounded-xl p-4 border border-paper-3 mb-3">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] text-ink-3 font-medium">Versement mensuel</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={10}
                    max={500}
                    step={10}
                    value={monthly}
                    onChange={(e) => {
                      const v = Math.min(500, Math.max(10, Number(e.target.value) || 0));
                      setMonthly(v);
                    }}
                    className="w-20 h-8 text-right font-value text-[15px] text-ink bg-paper border border-paper-3 rounded-lg px-2 focus:outline-none focus:ring-1 focus:ring-ink-2"
                  />
                  <span className="text-[12px] text-ink-3 font-medium">€/mois</span>
                </div>
              </div>
              <Slider
                min={10}
                max={500}
                step={10}
                value={[monthly]}
                onValueChange={(val) => setMonthly(val[0])}
                className="[&_[data-orientation=horizontal]]:bg-paper-3 [&_[data-radix-slider-range]]:bg-moss-1 [&_[data-radix-slider-thumb]]:border-moss-2 [&_[data-radix-slider-thumb]]:bg-paper"
              />
              <div className="flex justify-between mt-2">
                <span className="text-[9px] text-ink-3 font-medium">10 €</span>
                <span className="text-[9px] text-ink-3 font-medium">500 €</span>
              </div>
            </div>

            {/* Résultat dynamique */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="bg-paper-2 rounded-xl p-3 border border-paper-3 text-center">
                <p className="font-value text-xl leading-none text-moss-1">
                  {imp.co2.toFixed(1)}
                  <span className="text-[9px] text-ink-3 ml-0.5 font-sans">kg</span>
                </p>
                <p className="text-[9px] text-ink-3 mt-1.5 font-medium uppercase tracking-wider">
                  CO₂ évité
                </p>
              </div>
              <div className="bg-paper-2 rounded-xl p-3 border border-paper-3 text-center">
                <p className="font-value text-xl leading-none text-ink">
                  {Math.round(imp.kwh)}
                  <span className="text-[9px] text-ink-3 ml-0.5 font-sans">kWh</span>
                </p>
                <p className="text-[9px] text-ink-3 mt-1.5 font-medium uppercase tracking-wider">
                  Énergie verte
                </p>
              </div>
              <div className="bg-paper-2 rounded-xl p-3 border border-paper-3 text-center">
                <p className="font-value text-xl leading-none text-ink">
                  ~{imp.trees}
                </p>
                <p className="text-[9px] text-ink-3 mt-1.5 font-medium uppercase tracking-wider">
                  Arbres équivalents
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5 mt-2.5">
              <MiniBar label="Climat" value={asset.climate_score} />
              <MiniBar label="Social" value={asset.social_score} />
              <MiniBar label="Éthique" value={asset.governance_score} />
            </div>
          </section>

          {/* Risques */}
          <section>
            <p className="text-[10px] uppercase tracking-[0.18em] text-ink-3 font-semibold mb-2">
              Risques à considérer
            </p>
            <div className="paper-card p-3.5">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-dashed border-paper-3">
                <span className="text-[11px] text-ink-3 font-medium">Niveau de risque</span>
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                      <span
                        key={n}
                        className={`w-1.5 h-3 rounded-sm ${
                          n <= risk ? "bg-ink" : "bg-paper-3"
                        }`}
                      />
                    ))}
                  </div>
                  <span className={`text-[11px] font-semibold ${riskInfo.tone}`}>
                    {risk}/7 · {riskInfo.label}
                  </span>
                </div>
              </div>
              <ul className="space-y-2">
                {risksList.map((r) => (
                  <li key={r.title} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rust mt-1.5 flex-shrink-0" />
                    <div className="text-[12px] leading-relaxed">
                      <span className="font-semibold text-ink">{r.title} · </span>
                      <span className="text-ink-2">{r.desc}</span>
                    </div>
                  </li>
                ))}
              </ul>
              {asset.exclusions && asset.exclusions.length > 0 && (
                <div className="mt-3 pt-3 border-t border-dashed border-paper-3">
                  <p className="text-[10px] uppercase tracking-wider text-ink-3 font-semibold mb-1.5">
                    Exclusions appliquées
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {asset.exclusions.map((e) => (
                      <span
                        key={e}
                        className="text-[10px] bg-rust/10 text-rust font-semibold px-2 py-0.5 rounded-full border border-rust/20"
                      >
                        ⊘ {e}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Carte d'identité */}
          <section>
            <p className="text-[10px] uppercase tracking-[0.18em] text-ink-3 font-semibold mb-2">
              Carte d'identité
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0 text-[12px]">
              {asset.issuer && <IdRow label="Émetteur" value={asset.issuer} />}
              {asset.domicile && <IdRow label="Domicile" value={asset.domicile} />}
              {asset.currency && <IdRow label="Devise" value={asset.currency} />}
              {typeof asset.ter_pct === "number" && (
                <IdRow label="Frais (TER)" value={`${asset.ter_pct.toFixed(2)} %`} />
              )}
              {asset.dividend_policy && (
                <IdRow
                  label="Dividendes"
                  value={
                    asset.dividend_policy +
                    (asset.dividend_yield_pct
                      ? ` · ${asset.dividend_yield_pct.toFixed(1)} %`
                      : "")
                  }
                />
              )}
              {asset.inception_year && (
                <IdRow label="Créé en" value={asset.inception_year.toString()} />
              )}
              {asset.benchmark && asset.benchmark !== "—" && (
                <IdRow label="Indice" value={asset.benchmark} />
              )}
              {typeof asset.holdings_count === "number" && (
                <IdRow label="Lignes" value={asset.holdings_count.toLocaleString("fr-FR")} />
              )}
            </div>
          </section>

          {asset.top_holdings && asset.top_holdings.length > 0 && (
            <section>
              <p className="text-[10px] uppercase tracking-[0.18em] text-ink-3 font-semibold mb-2">
                Principales positions
              </p>
              <div className="flex flex-wrap gap-1.5">
                {asset.top_holdings.map((h) => (
                  <span
                    key={h}
                    className="text-[11px] bg-paper-2 text-ink-2 font-medium px-2 py-1 rounded-full border border-paper-3"
                  >
                    {h}
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Footer CTA collant */}
        <div className="sticky bottom-0 left-0 right-0 bg-card/95 backdrop-blur border-t border-paper-3 px-5 py-3.5 flex items-center gap-3">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-11 px-4 rounded-full bg-paper-2 hover:bg-paper-3 border border-paper-3 text-[12px] font-semibold text-ink-2"
          >
            Fermer
          </button>
          <InvestDialog
            label={`Investir dans ${asset.ticker}`}
            defaultAmount={100}
            trigger={
              <button
                type="button"
                className="flex-1 h-11 rounded-full bg-ink text-paper text-[12px] font-semibold uppercase tracking-[0.14em] hover:bg-ink-2 transition-colors flex items-center justify-center gap-2"
              >
                <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.4}>
                  <path d="M8 3v10M3 8h10" />
                </svg>
                Investir maintenant
              </button>
            }
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function buildRisks(asset: MockAsset): { title: string; desc: string }[] {
  const cat = asset.category.toLowerCase();
  const risks: { title: string; desc: string }[] = [];

  risks.push({
    title: "Perte en capital",
    desc: "La valeur de cet actif peut baisser. Le capital investi n'est pas garanti.",
  });

  if (cat.includes("oblig")) {
    risks.push({
      title: "Risque de taux",
      desc: "La valeur baisse mécaniquement si les taux d'intérêt remontent.",
    });
    risks.push({
      title: "Risque de crédit",
      desc: "Un émetteur peut faire défaut sur le remboursement.",
    });
  } else if (cat.includes("etf")) {
    risks.push({
      title: "Risque de marché",
      desc: "L'ETF suit son indice : il baisse quand le marché global recule.",
    });
    if (asset.currency && asset.currency !== "EUR") {
      risks.push({
        title: "Risque de change",
        desc: `Cotation en ${asset.currency} — les variations face à l'euro impactent la performance.`,
      });
    }
  } else if (cat.includes("action")) {
    risks.push({
      title: "Risque spécifique",
      desc: "Une seule entreprise : la performance dépend fortement de ses résultats.",
    });
    risks.push({
      title: "Volatilité",
      desc: "Les actions individuelles peuvent connaître de forts mouvements à court terme.",
    });
  }

  if (asset.themes.includes("tech") || asset.tags.some((t) => /hydro|renouv|clean/i.test(t))) {
    risks.push({
      title: "Risque thématique",
      desc: "Secteur concentré et sensible à la réglementation et aux cycles d'innovation.",
    });
  }

  return risks.slice(0, 4);
}

function IdRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-dashed border-paper-3 py-1.5">
      <span className="text-ink-3 font-medium">{label}</span>
      <span className="text-ink font-semibold text-right truncate">{value}</span>
    </div>
  );
}

function StatTile({
  value,
  unit,
  label,
  tone,
}: {
  value: string;
  unit?: string;
  label: string;
  tone?: "moss" | "default";
}) {
  return (
    <div className="bg-paper-2 rounded-xl p-3 text-center border border-paper-3">
      <p className={`font-value text-xl leading-none ${tone === "moss" ? "text-moss-1" : "text-ink"}`}>
        {value}
        {unit && <span className="text-[11px] text-ink-3 ml-0.5 font-sans">{unit}</span>}
      </p>
      <p className="text-[9px] mt-1.5 text-ink-3 font-medium leading-tight uppercase tracking-wider">
        {label}
      </p>
    </div>
  );
}

function MiniBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-paper-2 rounded-xl p-2.5 border border-paper-3">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-[10px] text-ink-3 font-medium">{label}</span>
        <span className="text-[10px] font-bold text-ink">{value.toFixed(1)}</span>
      </div>
      <div className="h-1 bg-paper-3 rounded-full overflow-hidden">
        <div
          className="h-full bg-moss-1 rounded-full"
          style={{ width: `${value * 10}%` }}
        />
      </div>
    </div>
  );
}
