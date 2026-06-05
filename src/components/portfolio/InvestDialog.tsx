import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useActivePortfolio } from "@/hooks/useActivePortfolio";
import { usePortfolioValuation } from "@/hooks/usePortfolioValuation";
import { fireConfetti } from "@/lib/confetti";
import { cn } from "@/lib/utils";

type Method = "card" | "applepay" | "sepa";

interface Props {
  trigger?: React.ReactNode;
  defaultAmount?: number;
  /** Préfixe le bouton par défaut. */
  label?: string;
}

/**
 * InvestDialog — maquette UI réaliste pour investir, SANS débit réel.
 * Met à jour `portfolios.initial_amount` (capital déclaratif) pour simuler
 * le versement, puis rafraîchit le portefeuille actif et la valorisation.
 */
export function InvestDialog({ trigger, defaultAmount = 200, label = "Investir" }: Props) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<number>(defaultAmount);
  const [method, setMethod] = useState<Method>("card");
  const [submitting, setSubmitting] = useState(false);
  const { portfolio, refresh: refreshPortfolio } = useActivePortfolio();
  const valuation = usePortfolioValuation();

  // Champs carte (purement maquette)
  const [cardNumber, setCardNumber] = useState("");
  const [cardExp, setCardExp] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [iban, setIban] = useState("");

  const canSubmit =
    amount > 0 &&
    !submitting &&
    !!portfolio &&
    (method === "applepay" ||
      (method === "card" && cardNumber.replace(/\s/g, "").length >= 12 && cardExp.length >= 4 && cardCvc.length >= 3) ||
      (method === "sepa" && iban.replace(/\s/g, "").length >= 14));

  const handleConfirm = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!portfolio) return;
    setSubmitting(true);
    try {
      // Simule un délai réseau pour rendre l'expérience crédible
      await new Promise((r) => setTimeout(r, method === "applepay" ? 600 : 900));

      const newAmount = (portfolio.initial_amount || 0) + amount;
      const { error } = await supabase
        .from("portfolios")
        .update({ initial_amount: newAmount })
        .eq("id", portfolio.id);
      if (error) throw error;

      refreshPortfolio();
      valuation.refresh();

      const rect = e.currentTarget.getBoundingClientRect();
      fireConfetti({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });

      toast.success(
        `Investissement de ${amount.toLocaleString("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 })} enregistré`,
        { description: "Maquette : aucun débit réel n'a été effectué." },
      );
      setOpen(false);
      // Reset léger
      setCardNumber("");
      setCardExp("");
      setCardCvc("");
      setIban("");
    } catch (err) {
      toast.error("Impossible d'enregistrer l'investissement", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <DefaultTrigger label={label} />}
      </DialogTrigger>
      <DialogContent className="bg-paper border-paper-3 sm:max-w-md">
        <DialogHeader>
          <p className="eyebrow">Versement</p>
          <DialogTitle className="font-display text-2xl text-ink mt-1">{label}</DialogTitle>
          <DialogDescription className="text-ink-3 text-[13px]">
            Maquette d'expérience — aucun débit n'est réalisé. Le capital déclaré du portefeuille
            sera mis à jour pour refléter le versement.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-4">
          <div>
            <Label className="text-[11px] uppercase tracking-[0.18em] text-ink-3 font-semibold">
              Montant
            </Label>
            <div className="mt-2 flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 text-sm">€</span>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={10}
                  step={10}
                  value={amount}
                  onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))}
                  className="pl-7 font-display text-lg h-12"
                />
              </div>
              <div className="flex gap-1.5">
                {[100, 250, 500].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setAmount(v)}
                    className={cn(
                      "h-12 px-3 rounded-md text-[12px] font-semibold border transition-colors",
                      amount === v
                        ? "bg-ink text-paper border-ink"
                        : "bg-paper border-paper-3 text-ink-2 hover:border-ink-3",
                    )}
                  >
                    {v}€
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Tabs value={method} onValueChange={(v) => setMethod(v as Method)}>
            <TabsList className="grid grid-cols-3 w-full bg-paper-2 border border-paper-3">
              <TabsTrigger value="card" className="text-[12px]">
                Carte
              </TabsTrigger>
              <TabsTrigger value="applepay" className="text-[12px]">
                 Pay
              </TabsTrigger>
              <TabsTrigger value="sepa" className="text-[12px]">
                Virement
              </TabsTrigger>
            </TabsList>

            <TabsContent value="card" className="mt-4 space-y-3">
              <div>
                <Label className="text-[11px] text-ink-3">Numéro de carte</Label>
                <Input
                  inputMode="numeric"
                  autoComplete="cc-number"
                  placeholder="1234 5678 9012 3456"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCard(e.target.value))}
                  maxLength={19}
                  className="mt-1 font-mono tracking-wider"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px] text-ink-3">Expiration</Label>
                  <Input
                    inputMode="numeric"
                    autoComplete="cc-exp"
                    placeholder="MM/AA"
                    value={cardExp}
                    onChange={(e) => setCardExp(formatExp(e.target.value))}
                    maxLength={5}
                    className="mt-1 font-mono"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-ink-3">CVC</Label>
                  <Input
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    placeholder="123"
                    value={cardCvc}
                    onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    maxLength={4}
                    className="mt-1 font-mono"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="applepay" className="mt-4">
              <div className="rounded-md border border-paper-3 bg-paper-2 p-4 text-center">
                <p className="text-[11px] uppercase tracking-[0.18em] text-ink-3 font-semibold">
                  Paiement express
                </p>
                <p className="mt-2 text-sm text-ink-2">
                  Valide avec Face ID, Touch ID ou ton code après confirmation.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="sepa" className="mt-4 space-y-3">
              <div>
                <Label className="text-[11px] text-ink-3">IBAN</Label>
                <Input
                  placeholder="FR76 ____ ____ ____ ____ ____ ___"
                  value={iban}
                  onChange={(e) => setIban(formatIban(e.target.value))}
                  className="mt-1 font-mono tracking-wider"
                  maxLength={34}
                />
              </div>
              <p className="text-[11px] text-ink-3">
                Délai de règlement habituel : 1 à 2 jours ouvrés. Maquette uniquement.
              </p>
            </TabsContent>
          </Tabs>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canSubmit}
            className={cn(
              "w-full h-12 rounded-full font-semibold text-[13px] uppercase tracking-[0.16em] transition-colors flex items-center justify-center gap-2",
              method === "applepay"
                ? "bg-ink text-paper hover:bg-ink-2"
                : "bg-moss-1 text-paper hover:bg-moss-2",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            )}
          >
            {submitting ? (
              <Spinner />
            ) : method === "applepay" ? (
              <>
                <AppleLogo /> Payer
              </>
            ) : (
              <>
                Confirmer{" "}
                {amount.toLocaleString("fr-FR", {
                  style: "currency",
                  currency: "EUR",
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </>
            )}
          </button>

          <p className="text-[10px] text-ink-3 text-center leading-relaxed">
            Démo sans débit réel · Données chiffrées, jamais stockées
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DefaultTrigger({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1.5 h-10 px-5 rounded-full bg-ink text-paper text-[12px] font-semibold uppercase tracking-[0.14em] hover:bg-ink-2 transition-colors"
    >
      <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.2}>
        <path d="M8 3v10M3 8h10" />
      </svg>
      {label}
    </button>
  );
}

function Spinner() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path d="M21 12a9 9 0 1 1-6.2-8.55" strokeLinecap="round" />
    </svg>
  );
}

function AppleLogo() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden>
      <path d="M16.4 12.6c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.9-1.4-.1-2.8.8-3.6.8-.8 0-1.9-.8-3.1-.8-1.6 0-3 .9-3.9 2.4-1.7 2.9-.4 7.1 1.2 9.5.8 1.1 1.7 2.4 3 2.4 1.2 0 1.7-.8 3.2-.8 1.5 0 1.9.8 3.2.8 1.3 0 2.2-1.2 3-2.3.9-1.3 1.3-2.6 1.3-2.7-.1 0-2.7-1-2.7-3.9zM14 5.4c.7-.8 1.1-2 1-3.1-1 .1-2.2.7-2.9 1.5-.6.7-1.2 1.9-1.1 3 1.1.1 2.3-.5 3-1.4z" />
    </svg>
  );
}

function formatCard(v: string) {
  return v
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, "$1 ");
}
function formatExp(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 4);
  if (d.length < 3) return d;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
}
function formatIban(v: string) {
  return v
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 34)
    .replace(/(.{4})(?=.)/g, "$1 ");
}
