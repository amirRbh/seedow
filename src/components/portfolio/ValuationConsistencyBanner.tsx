import type { ValuationConsistency } from "@/hooks/usePortfolioValuation";

interface Props {
  consistency: ValuationConsistency | null;
}

/**
 * Avertissement discret quand la valeur renvoyée par la vue SQL
 * `portfolio_holdings_valued` diverge du recalcul JS (poids × cours / cours d'entrée).
 * Au-delà du seuil (~0.5% du capital investi), on alerte : la vue est probablement
 * désynchronisée (quotes manquantes, prix d'entrée incohérent, vue à recréer…).
 */
export function ValuationConsistencyBanner({ consistency }: Props) {
  if (!consistency || !consistency.warn) return null;
  const fmt = (v: number) =>
    v.toLocaleString("fr-FR", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  return (
    <div className="mx-5 mt-3 rounded border border-[oklch(0.88_0.07_45)] bg-[oklch(0.96_0.04_45)] px-3 py-2">
      <p className="text-caption font-semibold uppercase tracking-[0.14em] text-rust">
        Écart de valorisation détecté
      </p>
      <p className="text-label text-ink-2 mt-1 leading-snug">
        La valeur calculée par la base ({fmt(consistency.viewValue)}) diffère du recalcul à partir
        des poids et des cours ({fmt(consistency.expectedValue)}) de{" "}
        <span className="font-semibold">{consistency.deltaPct.toFixed(2)}%</span> (seuil&nbsp;:{" "}
        {consistency.threshold}%). Rafraîchis les cours ; si l'écart persiste, la vue est
        probablement à reconstruire.
      </p>
    </div>
  );
}
