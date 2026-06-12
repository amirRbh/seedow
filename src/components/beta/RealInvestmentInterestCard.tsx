import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useActivePortfolio } from "@/hooks/useActivePortfolio";
import { submitRealInvestmentIntent } from "@/lib/beta/beta.functions";
import { callAuthed } from "@/lib/authedServerFn";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/**
 * Carte "Je veux investir pour de vrai" — capture la willingness to pay.
 * À placer sur le dashboard et la page portefeuille.
 */
export function RealInvestmentInterestCard() {
  const { user } = useAuth();
  const { portfolio } = useActivePortfolio();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(500);
  const [frequency, setFrequency] = useState<"one_shot" | "monthly">("monthly");
  const [contactEmail, setContactEmail] = useState(user?.email ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await callAuthed(submitRealInvestmentIntent, {
        amount,
        frequency,
        portfolioId: portfolio?.id ?? null,
        contactEmail: contactEmail || undefined,
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="px-5 pt-6">
      <div className="rounded-2xl border border-paper-3 bg-paper-2 p-5">
        <p className="text-[10px] uppercase tracking-[0.22em] text-gold font-semibold">
          Passer au réel
        </p>
        <h3 className="font-display text-lg text-ink mt-2 leading-snug">
          Tu veux investir pour de vrai cette allocation ?
        </h3>
        <p className="text-[12px] text-ink-3 mt-1.5 leading-relaxed">
          Indique ton intention — nous te préviendrons dès l'ouverture des comptes réels chez notre courtier partenaire.
        </p>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setDone(false); }}>
          <DialogTrigger asChild>
            <button className="btn-plant mt-4">
              Je veux investir pour de vrai
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            {done ? (
              <>
                <DialogHeader>
                  <DialogTitle>Merci — ton intention est enregistrée.</DialogTitle>
                  <DialogDescription>
                    Nous te contacterons par email dès que l'investissement réel sera disponible. Ton retour nous aide à prioriser le partenaire courtier.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <button onClick={() => setOpen(false)} className="btn-plant">Fermer</button>
                </DialogFooter>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle>Investir pour de vrai</DialogTitle>
                  <DialogDescription>
                    Pas de paiement maintenant — juste un signal pour qu'on prépare la suite.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-5 py-2">
                  <div>
                    <label className="text-[10px] uppercase tracking-[0.18em] text-ink-3 font-semibold">
                      Montant envisagé
                    </label>
                    <div className="flex items-center gap-3 mt-2">
                      <input
                        type="range"
                        min={100}
                        max={10000}
                        step={100}
                        value={amount}
                        onChange={(e) => setAmount(Number(e.target.value))}
                        className="flex-1 accent-gold"
                      />
                      <span className="font-value text-lg text-ink tabular-nums w-24 text-right">
                        {amount.toLocaleString("fr-FR")} €
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-[0.18em] text-ink-3 font-semibold">
                      Fréquence
                    </label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {([
                        { v: "one_shot", l: "Une fois" },
                        { v: "monthly", l: "Chaque mois" },
                      ] as const).map((opt) => (
                        <button
                          key={opt.v}
                          type="button"
                          onClick={() => setFrequency(opt.v)}
                          className={`py-2.5 rounded border text-[13px] transition-colors ${
                            frequency === opt.v
                              ? "border-ink bg-ink text-paper"
                              : "border-paper-3 text-ink hover:border-ink"
                          }`}
                        >
                          {opt.l}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-[0.18em] text-ink-3 font-semibold">
                      Email de contact
                    </label>
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      className="w-full mt-2 px-3 py-2.5 rounded border border-paper-3 bg-paper text-[13px] focus:border-ink focus:outline-none"
                    />
                  </div>

                  {error && <p className="text-[12px] text-rust">{error}</p>}
                </div>
                <DialogFooter>
                  <button
                    onClick={onSubmit}
                    disabled={submitting}
                    className="btn-plant w-full justify-center disabled:opacity-50"
                  >
                    {submitting ? "Envoi…" : "Envoyer mon intention"}
                  </button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
}
