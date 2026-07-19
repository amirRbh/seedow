import { useState } from "react";
import { useTranslation } from "react-i18next";
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
import { useLang } from "@/hooks/useLang";
import { formatCurrency, formatNumber } from "@/lib/format";
import { Button } from "@/components/ui/button";

export function RealInvestmentInterestCard() {
  const { t } = useTranslation();
  const { lang } = useLang();
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
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="px-5 pt-6">
      <div className="rounded-2xl border border-paper-3 bg-paper-2 p-5">
        <p className="text-tag uppercase tracking-[0.22em] text-gold font-semibold">
          {t("real_invest_interest.eyebrow")}
        </p>
        <h3 className="font-display text-lg text-ink mt-2 leading-snug">
          {t("real_invest_interest.title")}
        </h3>
        <p className="text-label text-ink-3 mt-1.5 leading-relaxed">
          {t("real_invest_interest.description")}
        </p>
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) setDone(false);
          }}
        >
          <DialogTrigger asChild>
            <Button size="pill" className="mt-4">
              {t("real_invest_interest.cta")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            {done ? (
              <>
                <DialogHeader>
                  <DialogTitle>{t("real_invest_interest.success_title")}</DialogTitle>
                  <DialogDescription>{t("real_invest_interest.success_desc")}</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button size="pill" onClick={() => setOpen(false)}>
                    {t("common.close")}
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle>{t("real_invest_interest.dialog_title")}</DialogTitle>
                  <DialogDescription>{t("real_invest_interest.dialog_desc")}</DialogDescription>
                </DialogHeader>
                <div className="space-y-5 py-2">
                  <div>
                    <label className="text-tag uppercase tracking-[0.18em] text-ink-3 font-semibold">
                      {t("real_invest_interest.envisaged_amount")}
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
                        {formatCurrency(amount, lang)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-tag uppercase tracking-[0.18em] text-ink-3 font-semibold">
                      {t("real_invest_interest.frequency")}
                    </label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {(
                        [
                          { v: "one_shot", l: t("real_invest_interest.one_shot") },
                          { v: "monthly", l: t("real_invest_interest.monthly") },
                        ] as const
                      ).map((opt) => (
                        <button
                          key={opt.v}
                          type="button"
                          onClick={() => setFrequency(opt.v)}
                          className={`py-2.5 rounded border text-body-sm transition-colors ${
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
                    <label className="text-tag uppercase tracking-[0.18em] text-ink-3 font-semibold">
                      {t("real_invest_interest.contact_email")}
                    </label>
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      className="w-full mt-2 px-3 py-2.5 rounded border border-paper-3 bg-paper text-body-sm focus:border-ink focus:outline-none"
                    />
                  </div>

                  {error && <p className="text-label text-rust">{error}</p>}
                </div>
                <DialogFooter>
                  <Button
                    size="pill"
                    onClick={onSubmit}
                    disabled={submitting}
                    className="w-full justify-center disabled:opacity-50"
                  >
                    {submitting ? t("common.sending") : t("real_invest_interest.submit")}
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
}
