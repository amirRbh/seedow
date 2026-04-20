import type { ActivePortfolioMetrics } from "@/hooks/useActivePortfolio";
import { useViewMode } from "@/hooks/useViewMode";
import { MetricLabel } from "@/components/ui/MetricLabel";

interface Props {
  metrics: ActivePortfolioMetrics | null;
}

type Tone = "moss" | "ink" | "bloom" | "peach" | "sky";

interface Item {
  label: string;
  hint: string;
  value: string;
  sub: string;
  tone: Tone;
  expertOnly?: boolean;
}

export function PortfolioMetricsCard({ metrics }: Props) {
  const { isSimple } = useViewMode();
  if (!metrics) return null;

  const items: Item[] = [
    {
      label: "Croissance estimée",
      hint: "Combien ton jardin pourrait croître chaque année en moyenne. Estimation, pas une garantie.",
      value: `${(metrics.expected_return * 100).toFixed(1)}%`,
      sub: "par an",
      tone: "moss",
    },
    {
      label: "Score d'impact",
      hint: "Note ESG (Environnement, Social, Gouvernance) moyenne du portefeuille. Plus c'est haut, mieux c'est.",
      value: `${metrics.esg_score.toFixed(0)}`,
      sub: "sur 100",
      tone: "bloom",
    },
    {
      label: "CO₂ évité",
      hint: "Tonnes de CO₂ que ton investissement aide à éviter par tranche de 10 000 € investis chaque année.",
      value: `${metrics.co2_avoided_tons.toFixed(2)}t`,
      sub: "/ 10k€",
      tone: "moss",
    },
    {
      label: "Variations possibles",
      hint: "Volatilité : à quel point ton jardin peut bouger d'un mois à l'autre. Plus haut = plus de hauts et de bas.",
      value: `${(metrics.volatility * 100).toFixed(1)}%`,
      sub: "par an",
      tone: "peach",
      expertOnly: true,
    },
    {
      label: "Qualité du rendement",
      hint: "Ratio de Sharpe : mesure si la croissance vaut le risque pris. Au-dessus de 1 = très bon.",
      value: metrics.sharpe.toFixed(2),
      sub: "Sharpe",
      tone: "sky",
      expertOnly: true,
    },
    {
      label: "Frais annuels",
      hint: "TER : pourcentage prélevé chaque année par les fonds. Plus c'est bas, mieux c'est.",
      value: `${(metrics.ter * 100).toFixed(2)}%`,
      sub: "par an",
      tone: "ink",
      expertOnly: true,
    },
  ];

  const visible = isSimple ? items.filter((i) => !i.expertOnly) : items;

  const toneClasses: Record<Tone, { text: string; bg: string; border: string }> = {
    moss: { text: "text-moss-1", bg: "bg-moss-5", border: "border-moss-4" },
    bloom: { text: "text-bloom", bg: "bg-[oklch(0.96_0.04_310)]", border: "border-[oklch(0.88_0.07_310)]" },
    peach: { text: "text-rust", bg: "bg-[oklch(0.96_0.04_45)]", border: "border-[oklch(0.88_0.07_45)]" },
    sky: { text: "text-sky", bg: "bg-[oklch(0.96_0.03_230)]", border: "border-[oklch(0.88_0.06_230)]" },
    ink: { text: "text-ink", bg: "bg-paper-2", border: "border-paper-3" },
  };

  return (
    <div className={`grid gap-2.5 ${isSimple ? "grid-cols-3" : "grid-cols-3"}`}>
      {visible.map((it) => {
        const c = toneClasses[it.tone];
        return (
          <div
            key={it.label}
            className={`rounded-xl p-3 border ${c.bg} ${c.border} relative overflow-visible`}
          >
            <div className="text-[9px] uppercase tracking-wider text-ink-3 font-semibold leading-tight">
              <MetricLabel label={it.label} hint={it.hint} />
            </div>
            <p className={`font-value text-2xl mt-2 leading-none ${c.text}`}>{it.value}</p>
            <p className="text-[10px] text-ink-3 mt-1.5">{it.sub}</p>
          </div>
        );
      })}
    </div>
  );
}
