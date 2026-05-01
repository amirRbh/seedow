import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { ActiveHolding } from "@/hooks/useActivePortfolio";
import type { ValuedHolding } from "@/hooks/usePortfolioValuation";

interface Props {
  open: boolean;
  onClose: () => void;
  holding: ActiveHolding | null;
  valued?: ValuedHolding | null;
}

const CLASS_LABELS: Record<string, string> = {
  equity_dev: "Grandes entreprises",
  equity_em: "Marchés émergents",
  thematic: "Thématique impact",
  green_bond: "Obligations vertes",
  social_bond: "Obligations sociales",
  sov_bond: "Obligations d'État",
  reit: "Immobilier durable",
  commodity: "Matières premières",
  cash: "Réserve sécurisée",
};

const fmtEur = (n: number) =>
  n.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const fmtPct = (n: number) =>
  `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;

const fmtPrice = (n: number) =>
  n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 4 });

const fmtDate = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export function HoldingDetailSheet({ open, onClose, holding, valued }: Props) {
  if (!holding) return null;

  const hasQuote =
    valued?.currentPrice != null && valued?.entryPrice != null && valued.entryPrice > 0;
  const isUp = (valued?.pnl ?? 0) >= 0;
  const tone = isUp ? "text-moss-1" : "text-bloom";

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
        <SheetHeader className="text-left">
          <div className="flex items-baseline gap-2">
            <SheetTitle className="text-lg">{holding.name}</SheetTitle>
            <span className="font-value text-[12px] text-ink-3">{holding.ticker}</span>
          </div>
          <p className="text-[11px] text-ink-3">
            {CLASS_LABELS[holding.category] ?? holding.category}
            {holding.region && ` · ${holding.region}`}
          </p>
        </SheetHeader>

        {/* Performance bloc */}
        <div className="mt-5 paper-card p-4">
          <p className="text-[10px] uppercase tracking-wider text-ink-3 font-semibold mb-2">
            Évolution du prix
          </p>
          {hasQuote ? (
            <>
              <div className="flex items-baseline gap-2">
                <p className={`font-value text-2xl ${tone}`}>
                  {fmtPct(valued!.returnPct)}
                </p>
                <p className={`text-[13px] ${tone}`}>
                  {valued!.pnl >= 0 ? "+" : ""}
                  {fmtEur(valued!.pnl)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-paper-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-ink-3">Prix d'entrée</p>
                  <p className="font-value text-[13px] text-ink mt-0.5">
                    {fmtPrice(valued!.entryPrice!)} €
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-ink-3">Prix actuel</p>
                  <p className="font-value text-[13px] text-ink mt-0.5">
                    {fmtPrice(valued!.currentPrice!)} €
                  </p>
                </div>
              </div>
              <p className="text-[10px] text-ink-3 mt-3">
                Dernière mise à jour : {fmtDate(valued?.quoteAt ?? null)}
              </p>
            </>
          ) : (
            <p className="text-[12px] text-ink-3">
              Pas encore de cotation pour cet actif. La valorisation s'affichera après la prochaine
              mise à jour des prix.
            </p>
          )}
        </div>

        {/* Position bloc */}
        <div className="mt-3 paper-card p-4">
          <p className="text-[10px] uppercase tracking-wider text-ink-3 font-semibold mb-2">
            Ta position
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-ink-3">Allocation</p>
              <p className="font-value text-[13px] text-ink mt-0.5">
                {holding.allocationPct.toFixed(2)}%
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-ink-3">Capital investi</p>
              <p className="font-value text-[13px] text-ink mt-0.5">
                {fmtEur(valued?.invested ?? 0)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-ink-3">Valeur actuelle</p>
              <p className="font-value text-[13px] text-ink mt-0.5">
                {fmtEur(valued?.currentValue ?? 0)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-ink-3">Score d'impact</p>
              <p className="font-value text-[13px] text-moss-1 mt-0.5">
                {holding.esgScore.toFixed(0)}/100
              </p>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
