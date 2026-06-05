import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { useActivePortfolio } from "@/hooks/useActivePortfolio";
import { usePortfolioValuation } from "@/hooks/usePortfolioValuation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { KPIFigure } from "@/components/ui/KPIFigure";
import { fireConfetti } from "@/lib/confetti";

export const Route = createFileRoute("/certificat")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
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
  const { user } = useAuth();
  const { portfolio, loading } = useActivePortfolio();
  const valuation = usePortfolioValuation();

  useEffect(() => {
    if (!loading && portfolio) {
      const t = setTimeout(() => fireConfetti(), 250);
      return () => clearTimeout(t);
    }
  }, [loading, portfolio]);

  if (loading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <p className="text-[12px] text-ink-3">Préparation du certificat…</p>
      </div>
    );
  }
  if (!portfolio) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center px-6 text-center">
        <div>
          <p className="text-sm text-ink-2">Aucun portefeuille actif — pas de certificat à éditer.</p>
          <Link to="/portfolio" className="inline-block mt-4 text-[12px] underline text-ink">
            Retour au portefeuille
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
  const dateLong = today.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const certNo = `SDW-${today.getFullYear()}-${portfolio.id.slice(0, 6).toUpperCase()}`;
  const holderName =
    (user?.user_metadata?.display_name as string | undefined) ??
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email?.split("@")[0] ??
    "Investisseur Seedow";

  return (
    <div className="min-h-screen bg-paper">
      {/* Toolbar — masquée à l'impression */}
      <div className="print:hidden sticky top-0 z-10 bg-paper/90 backdrop-blur border-b border-paper-3">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <Link to="/portfolio" className="text-[12px] uppercase tracking-[0.18em] text-ink-3 hover:text-ink">
            ← Portefeuille
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-ink text-paper text-[12px] font-semibold uppercase tracking-[0.14em] hover:bg-ink-2 transition-colors"
            >
              Imprimer / PDF
            </button>
          </div>
        </div>
      </div>

      {/* Feuille A4 paysage */}
      <article className="max-w-5xl mx-auto px-8 md:px-14 py-12 print:py-8">
        <header className="flex items-start justify-between gap-6 pb-6 border-b border-paper-3">
          <div>
            <p className="font-display text-2xl text-ink lowercase tracking-tight">seedow</p>
            <p className="eyebrow mt-3">Certificat d'impact · Édition personnelle</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.22em] text-ink-3 font-semibold">Référence</p>
            <p className="font-display text-sm text-ink mt-1 tabular-nums">{certNo}</p>
            <p className="text-[11px] text-ink-3 mt-1">{dateLong}</p>
          </div>
        </header>

        <section className="mt-10">
          <p className="eyebrow">Titulaire</p>
          <h1 className="font-display text-3xl md:text-4xl text-ink mt-2">{holderName}</h1>
          <p className="text-sm text-ink-2 mt-2">
            Portefeuille « {portfolio.name} » ·{" "}
            {totalValue.toLocaleString("fr-FR", {
              style: "currency",
              currency: "EUR",
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
          <div className="gold-rule mt-6" />
        </section>

        <section className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-8">
          <KPIFigure
            label="CO₂ évité"
            value={co2 >= 1 ? co2.toFixed(2) : (co2 * 1000).toFixed(0)}
            unit={co2 >= 1 ? "t" : "kg"}
            size="lg"
            accent
          />
          <KPIFigure
            label="Arbres équivalents"
            value={trees.toLocaleString("fr-FR")}
            size="lg"
          />
          <KPIFigure
            label="Énergie verte"
            value={energy >= 1000 ? (energy / 1000).toFixed(1) : energy.toLocaleString("fr-FR")}
            unit={energy >= 1000 ? "MWh" : "kWh"}
            size="lg"
          />
          <KPIFigure
            label="Score d'impact"
            value={esgScore.toFixed(0)}
            unit="/100"
            size="lg"
          />
        </section>

        <section className="mt-12">
          <p className="eyebrow">Méthodologie</p>
          <p className="mt-3 text-sm text-ink-2 leading-relaxed max-w-3xl">
            Les indicateurs sont calculés à partir de la composition réelle du portefeuille,
            pondérée par les expositions ESG des sous-jacents (filtre d'exclusions,
            sélection best-in-class, score composite E/S/G). Le CO₂ évité est une estimation
            indicative dérivée des scores ESG, non un chiffre réglementaire.
          </p>
          <div className="gold-rule mt-6" />
        </section>

        <footer className="mt-12 flex flex-wrap items-end justify-between gap-4 text-[11px] text-ink-3">
          <p>
            Vérification & méthodologie complète :{" "}
            <span className="text-ink font-medium">seedow.life/methodologie</span>
          </p>
          <p>Émis le {dateLong}</p>
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
