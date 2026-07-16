import { useState } from "react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { trackFundRejection, type FundRejectionReason } from "@/lib/preferences/tracking";
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

const fmtPct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;

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
            <span className="font-value text-label text-ink-3">{holding.ticker}</span>
          </div>
          <p className="text-caption text-ink-3">
            {CLASS_LABELS[holding.category] ?? holding.category}
            {holding.region && ` · ${holding.region}`}
          </p>
        </SheetHeader>

        {/* Performance bloc */}
        <div className="mt-5 paper-card p-4">
          <p className="text-tag uppercase tracking-wider text-ink-3 font-semibold mb-2">
            Évolution du prix
          </p>
          {hasQuote ? (
            <>
              <div className="flex items-baseline gap-2">
                <p className={`font-value text-2xl ${tone}`}>{fmtPct(valued!.returnPct)}</p>
                <p className={`text-body-sm ${tone}`}>
                  {valued!.pnl >= 0 ? "+" : ""}
                  {fmtEur(valued!.pnl)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-paper-3">
                <div>
                  <p className="text-tag uppercase tracking-wider text-ink-3">Prix d'entrée</p>
                  <p className="font-value text-body-sm text-ink mt-0.5">
                    {fmtPrice(valued!.entryPrice!)} €
                  </p>
                </div>
                <div>
                  <p className="text-tag uppercase tracking-wider text-ink-3">Prix actuel</p>
                  <p className="font-value text-body-sm text-ink mt-0.5">
                    {fmtPrice(valued!.currentPrice!)} €
                  </p>
                </div>
              </div>
              <p className="text-tag text-ink-3 mt-3">
                Dernière mise à jour : {fmtDate(valued?.quoteAt ?? null)}
              </p>
            </>
          ) : (
            <p className="text-label text-ink-3">
              Pas encore de cotation pour cet actif. La valorisation s'affichera après la prochaine
              mise à jour des prix.
            </p>
          )}
        </div>

        {/* Position bloc */}
        <div className="mt-3 paper-card p-4">
          <p className="text-tag uppercase tracking-wider text-ink-3 font-semibold mb-2">
            Ta position
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-tag uppercase tracking-wider text-ink-3">Allocation</p>
              <p className="font-value text-body-sm text-ink mt-0.5">
                {holding.allocationPct.toFixed(2)}%
              </p>
            </div>
            <div>
              <p className="text-tag uppercase tracking-wider text-ink-3">Capital investi</p>
              <p className="font-value text-body-sm text-ink mt-0.5">
                {fmtEur(valued?.invested ?? 0)}
              </p>
            </div>
            <div>
              <p className="text-tag uppercase tracking-wider text-ink-3">Valeur actuelle</p>
              <p className="font-value text-body-sm text-ink mt-0.5">
                {fmtEur(valued?.currentValue ?? 0)}
              </p>
            </div>
            <div>
              <p className="text-tag uppercase tracking-wider text-ink-3">Score d'impact</p>
              <p className="font-value text-body-sm text-moss-1 mt-0.5">
                {holding.esgScore.toFixed(0)}/100
              </p>
            </div>
          </div>
        </div>

        {/* Phase 1.3 — Rejet de fonds (signal de préférence révélée) */}
        <FundRejectionCard holding={holding} />
      </SheetContent>
    </Sheet>
  );
}

// ─────────────────────────────────────────────────────────
// Carte "Pas assez vert pour moi" — capture le rejet utilisateur
// pour alimenter le flywheel valeurs→portefeuille.
// ─────────────────────────────────────────────────────────
const REJECTION_REASONS: { id: FundRejectionReason; label: string }[] = [
  { id: "controversy", label: "Controverse(s) connue(s)" },
  { id: "excluded_sector", label: "Secteur exclu pour moi" },
  { id: "low_esg_score", label: "Score ESG insuffisant" },
  { id: "low_env_score", label: "Pilier environnemental faible" },
  { id: "low_social_score", label: "Pilier social faible" },
  { id: "low_gov_score", label: "Gouvernance faible" },
  { id: "high_carbon", label: "Empreinte carbone trop élevée" },
  { id: "opaque_holdings", label: "Holdings opaques" },
  { id: "other", label: "Autre raison" },
];

function FundRejectionCard({ holding }: { holding: ActiveHolding }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<FundRejectionReason | null>(null);
  const [detail, setDetail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);

  if (submitted) {
    return (
      <div className="mt-3 paper-card p-4 border border-paper-3">
        <p className="text-label text-ink leading-relaxed">
          Merci. Ton signal est enregistré — il alimentera la sélection automatique des fonds pour
          les profils proches du tien.
        </p>
      </div>
    );
  }

  if (!open) {
    return (
      <div className="mt-3 text-center">
        <button
          onClick={() => setOpen(true)}
          className="text-caption uppercase tracking-[0.18em] text-ink-3 hover:text-ink font-semibold transition-colors"
        >
          Pas assez vert pour moi ?
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 paper-card p-4 border border-paper-3">
      <p className="text-tag uppercase tracking-wider text-ink-3 font-semibold mb-2">
        Pourquoi ce fonds ne te convient pas
      </p>
      <p className="text-caption text-ink-3 mb-3">
        Ton retour reste privé. On s'en sert pour mieux composer les portefeuilles des utilisateurs
        qui partagent tes valeurs.
      </p>
      <div className="space-y-1.5">
        {REJECTION_REASONS.map((r) => (
          <label
            key={r.id}
            className={`flex items-center gap-2 p-2 rounded border cursor-pointer text-label ${
              reason === r.id ? "border-ink bg-ink/5" : "border-paper-3 hover:border-ink/40"
            }`}
          >
            <input
              type="radio"
              name="reject-reason"
              checked={reason === r.id}
              onChange={() => setReason(r.id)}
              className="accent-ink"
            />
            <span className="text-ink">{r.label}</span>
          </label>
        ))}
      </div>
      {reason && (
        <textarea
          value={detail}
          onChange={(e) => setDetail(e.target.value.slice(0, 280))}
          placeholder="Précise si tu veux (optionnel)…"
          className="mt-3 w-full px-3 py-2 text-label border border-paper-3 rounded resize-none focus:border-ink focus:outline-none"
          rows={2}
        />
      )}
      <div className="mt-3 flex items-center gap-2">
        <button
          disabled={!reason || busy}
          onClick={async () => {
            if (!reason) return;
            setBusy(true);
            await trackFundRejection({
              assetId: holding.id,
              reason,
              reasonDetail: detail.trim() || null,
              context: { ticker: holding.ticker, allocation_pct: holding.allocationPct },
            });
            setBusy(false);
            setSubmitted(true);
            toast.success("Signal enregistré");
          }}
          className="flex-1 py-2 rounded-full bg-ink text-paper text-label font-semibold hover:bg-moss-2 transition-colors disabled:opacity-30"
        >
          {busy ? "Envoi…" : "Valider"}
        </button>
        <button
          onClick={() => {
            setOpen(false);
            setReason(null);
            setDetail("");
          }}
          className="px-4 py-2 text-label text-ink-3 hover:text-ink transition-colors"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}
