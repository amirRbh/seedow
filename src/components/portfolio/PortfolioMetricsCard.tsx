import type { ActivePortfolioMetrics } from "@/hooks/useActivePortfolio";

interface Props {
  metrics: ActivePortfolioMetrics | null;
}

export function PortfolioMetricsCard({ metrics }: Props) {
  if (!metrics) return null;

  const items = [
    {
      label: "Rendement attendu",
      value: `${(metrics.expected_return * 100).toFixed(1)}%`,
      sub: "annuel",
      tone: "moss",
    },
    {
      label: "Volatilité",
      value: `${(metrics.volatility * 100).toFixed(1)}%`,
      sub: "annuelle",
      tone: "ink",
    },
    {
      label: "Sharpe",
      value: metrics.sharpe.toFixed(2),
      sub: "rendement / risque",
      tone: "ink",
    },
    {
      label: "Score ESG",
      value: `${metrics.esg_score.toFixed(0)}`,
      sub: "/ 100",
      tone: "moss",
    },
    {
      label: "Frais (TER)",
      value: `${(metrics.ter * 100).toFixed(2)}%`,
      sub: "par an",
      tone: "ink",
    },
    {
      label: "CO₂ évité",
      value: `${metrics.co2_avoided_tons.toFixed(2)}t`,
      sub: "par 10k€",
      tone: "moss",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2.5">
      {items.map((it) => (
        <div key={it.label} className="paper-card p-3">
          <p className="text-[9px] uppercase tracking-wider text-ink-3 font-semibold leading-tight">
            {it.label}
          </p>
          <p className={`font-value text-xl mt-1.5 leading-none ${it.tone === "moss" ? "text-moss-1" : "text-ink"}`}>
            {it.value}
          </p>
          <p className="text-[10px] text-ink-3 mt-1">{it.sub}</p>
        </div>
      ))}
    </div>
  );
}
