import { useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useActivePortfolio } from "@/hooks/useActivePortfolio";
import { usePortfolioValuation } from "@/hooks/usePortfolioValuation";
import { formatCurrency } from "@/lib/format";
import { useLang } from "@/hooks/useLang";
import { cn } from "@/lib/utils";

interface Props {
  trigger?: React.ReactNode;
  defaultAmount?: number;
  label?: string;
}

/**
 * Versement simulé : met à jour le capital déclaré du portefeuille, rien d'autre.
 *
 * Aucun moyen de paiement n'est demandé — ni carte, ni CVC, ni IBAN. Le
 * formulaire ne débitait rien et l'annonçait, mais réclamer un vrai numéro de
 * carte pour une maquette conduit une partie des utilisateurs à le saisir
 * vraiment ; le montant suffit à la simulation. Pour la même raison il n'y a
 * ni latence de traitement feinte, ni confettis : on ne met pas en scène une
 * transaction qui n'a pas lieu (CLAUDE.md §1.3 et §1.5).
 */
export function InvestDialog({ trigger, defaultAmount = 200, label }: Props) {
  const { t } = useTranslation();
  const { lang } = useLang();
  const resolvedLabel = label ?? t("invest_dialog.default_label");
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<number>(defaultAmount);
  const [submitting, setSubmitting] = useState(false);
  const { portfolio, refresh: refreshPortfolio } = useActivePortfolio();
  const valuation = usePortfolioValuation();

  const canSubmit = amount > 0 && !submitting && !!portfolio;

  const handleConfirm = async () => {
    if (!portfolio) return;
    setSubmitting(true);
    try {
      const newAmount = (portfolio.initial_amount || 0) + amount;
      const { error } = await supabase
        .from("portfolios")
        .update({ initial_amount: newAmount })
        .eq("id", portfolio.id);
      if (error) throw error;

      refreshPortfolio();
      valuation.refresh();

      toast.success(t("invest_dialog.toast_success", { amount: formatCurrency(amount, lang) }), {
        description: t("invest_dialog.toast_success_desc"),
      });
      setOpen(false);
    } catch (err) {
      toast.error(t("invest_dialog.toast_error"), {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger ?? <DefaultTrigger label={resolvedLabel} />}</DialogTrigger>
      <DialogContent className="bg-paper border-paper-3 sm:max-w-md">
        <DialogHeader>
          <p className="eyebrow">{t("invest_dialog.eyebrow")}</p>
          <DialogTitle className="font-display text-2xl text-ink mt-1">{resolvedLabel}</DialogTitle>
          <DialogDescription className="text-ink-3 text-body-sm">
            {t("invest_dialog.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-4">
          <div>
            <label
              htmlFor="invest-amount"
              className="text-caption uppercase tracking-[0.18em] text-ink-3 font-mono"
            >
              {t("invest_dialog.amount")}
            </label>
            <div className="mt-2 flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 text-sm">
                  €
                </span>
                <Input
                  id="invest-amount"
                  type="number"
                  inputMode="decimal"
                  min={10}
                  step={10}
                  value={amount}
                  onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))}
                  className="pl-7 font-display text-lg h-12"
                />
              </div>
              <div className="flex gap-1.5" role="group" aria-label={t("invest_dialog.presets")}>
                {[100, 250, 500].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setAmount(v)}
                    aria-pressed={amount === v}
                    className={cn(
                      "h-12 px-3 rounded-md text-label font-semibold border transition-colors",
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

          <p className="rounded-md border border-paper-3 bg-paper-2 px-3.5 py-3 text-body-sm text-ink-2 leading-relaxed">
            {t("invest_dialog.simulation_notice")}
          </p>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canSubmit}
            className={cn(
              "w-full h-12 rounded-full font-semibold text-body-sm uppercase tracking-[0.16em] transition-colors flex items-center justify-center gap-2",
              "bg-highlight-1 text-paper hover:bg-highlight-2",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            )}
          >
            {submitting ? (
              <Spinner />
            ) : (
              <>
                {t("invest_dialog.confirm")} {formatCurrency(amount, lang)}
              </>
            )}
          </button>

          <p className="text-tag text-ink-3 text-center leading-relaxed">
            {t("invest_dialog.footer_note")}
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
      className="inline-flex items-center gap-1.5 h-10 px-5 rounded-full bg-ink text-paper text-label font-semibold uppercase tracking-[0.14em] hover:bg-ink-2 transition-colors"
    >
      <svg
        viewBox="0 0 16 16"
        className="w-3.5 h-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.2}
        aria-hidden="true"
      >
        <path d="M8 3v10M3 8h10" />
      </svg>
      {label}
    </button>
  );
}

function Spinner() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-4 h-4 animate-spin"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 1 1-6.2-8.55" strokeLinecap="round" />
    </svg>
  );
}
