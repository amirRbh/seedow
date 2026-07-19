import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useActivePortfolio } from "@/hooks/useActivePortfolio";
import { usePortfolioValuation } from "@/hooks/usePortfolioValuation";
import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/hooks/useLang";
import { formatCurrency, formatDate } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { KPIFigure } from "@/components/ui/KPIFigure";
import { fireConfetti } from "@/lib/confetti";
import { esgToneFrom100, ESG_TONE_CLASSES } from "@/lib/esgTone";

export const Route = createFileRoute("/certificat")({
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth", search: { redirect: "/certificat", mode: "login" } });
    }
  },
  head: () => ({
    meta: [
      { title: "Certificat d'impact — Seedow" },
      { name: "description", content: "Édition personnelle du certificat d'impact Seedow." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CertificatPage,
});

function CertificatPage() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const { user } = useAuth();
  const { portfolio, loading } = useActivePortfolio();
  const valuation = usePortfolioValuation();

  useEffect(() => {
    if (!loading && portfolio) {
      const id = setTimeout(() => fireConfetti(), 250);
      return () => clearTimeout(id);
    }
  }, [loading, portfolio]);

  if (loading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <p className="text-label text-ink-3">{t("certificate.preparing")}</p>
      </div>
    );
  }
  if (!portfolio) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center px-6 text-center">
        <div>
          <p className="text-sm text-ink-2">{t("certificate.no_portfolio")}</p>
          <Link to="/portfolio" className="inline-block mt-4 text-label underline text-ink">
            {t("certificate.back_portfolio")}
          </Link>
        </div>
      </div>
    );
  }

  const totalInvested = valuation.totalInvested || portfolio.initial_amount;
  const totalValue = valuation.currentValue || totalInvested;

  const co2 = portfolio.metrics?.co2_avoided_tons
    ? Number(((portfolio.metrics.co2_avoided_tons * Math.max(totalInvested, 1)) / 10000).toFixed(2))
    : 0;
  const trees = Math.round(co2 * 45);
  const energy = Math.round(totalInvested / 5);
  const esgScore = portfolio.metrics?.esg_score ?? 0;

  const today = new Date();
  const dateLong = formatDate(today, lang, { day: "numeric", month: "long", year: "numeric" });
  const certNo = `SDW-${today.getFullYear()}-${portfolio.id.slice(0, 6).toUpperCase()}`;
  const holderName =
    (user?.user_metadata?.display_name as string | undefined) ??
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email?.split("@")[0] ??
    t("certificate.default_holder");
  const numLocale = lang === "en" ? "en-US" : "fr-FR";

  return (
    <div className="min-h-screen bg-paper">
      {/* Toolbar — masquée à l'impression */}
      <div className="print:hidden sticky top-0 z-10 bg-paper/90 backdrop-blur border-b border-paper-3">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <Link
            to="/portfolio"
            className="text-label uppercase tracking-[0.18em] text-ink-3 hover:text-ink"
          >
            {t("certificate.back_portfolio_short")}
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-ink text-paper text-label font-semibold uppercase tracking-[0.14em] hover:bg-ink-2 transition-colors"
            >
              {t("certificate.print_pdf")}
            </button>
          </div>
        </div>
      </div>

      {/* Feuille A4 paysage */}
      <article className="max-w-5xl mx-auto px-8 md:px-14 py-12 print:py-8">
        <div
          role="note"
          className="mb-6 flex items-center gap-2 border border-paper-3 bg-paper-2/60 px-4 py-2 text-caption uppercase tracking-[0.18em] text-ink-2"
        >
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-gold" aria-hidden />
          <span className="font-semibold">Bêta</span>
          <span className="normal-case tracking-normal text-label text-ink-3">
            capital virtuel · cours réels · aucun argent investi
          </span>
        </div>

        <header className="flex items-start justify-between gap-6 pb-6 border-b border-paper-3">
          <div>
            <p className="font-display text-2xl text-ink lowercase tracking-tight">seedow</p>
            <p className="eyebrow mt-3">{t("certificate.subtitle")}</p>
          </div>
          <div className="text-right">
            <p className="text-tag uppercase tracking-[0.22em] text-ink-3 font-semibold">
              {t("certificate.reference")}
            </p>
            <p className="font-display text-sm text-ink mt-1 tabular-nums">{certNo}</p>
            <p className="text-caption text-ink-3 mt-1">{dateLong}</p>
          </div>
        </header>

        <section className="mt-10">
          <p className="eyebrow">{t("certificate.holder")}</p>
          <h1 className="font-display text-3xl md:text-4xl text-ink mt-2">{holderName}</h1>
          <p className="text-sm text-ink-2 mt-2">
            {t("certificate.portfolio_line", {
              name: portfolio.name,
              value: formatCurrency(totalValue, lang),
            })}
          </p>
          <div className="gold-rule mt-6" />
        </section>

        <section className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-8">
          <KPIFigure
            label={t("certificate.kpi_co2")}
            value={co2 >= 1 ? co2.toFixed(2) : (co2 * 1000).toFixed(0)}
            unit={co2 >= 1 ? "t" : "kg"}
            size="lg"
            accent
          />
          <KPIFigure
            label={t("certificate.kpi_trees")}
            value={trees.toLocaleString(numLocale)}
            size="lg"
          />
          <KPIFigure
            label={t("certificate.kpi_energy")}
            value={energy >= 1000 ? (energy / 1000).toFixed(1) : energy.toLocaleString(numLocale)}
            unit={energy >= 1000 ? "MWh" : "kWh"}
            size="lg"
          />
          <KPIFigure
            label={t("certificate.kpi_impact")}
            value={esgScore.toFixed(0)}
            unit="/100"
            size="lg"
            valueClassName={ESG_TONE_CLASSES[esgToneFrom100(esgScore)].text}
          />
        </section>

        <p className="mt-4 text-caption text-ink-3 leading-relaxed max-w-3xl">
          Le CO₂ évité est une <span className="text-ink-2 font-medium">estimation indicative</span>{" "}
          dérivée du score ESG du portefeuille — ce n'est pas un chiffre réglementaire ni une mesure
          carbone certifiée.
        </p>

        <section className="mt-12">
          <p className="eyebrow">{t("certificate.methodology")}</p>
          <p className="mt-3 text-sm text-ink-2 leading-relaxed max-w-3xl">
            {t("certificate.methodology_body")}
          </p>
          <div className="gold-rule mt-6" />
        </section>

        <footer className="mt-12 flex flex-wrap items-end justify-between gap-4 text-caption text-ink-3">
          <p>
            {t("certificate.verification_label")}{" "}
            <span className="text-ink font-medium">seedow.life/methodologie</span>
          </p>
          <p>{t("certificate.issued_on", { date: dateLong })}</p>
        </footer>
      </article>

      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 12mm; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}
