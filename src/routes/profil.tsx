import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/navigation/AppHeader";
import { BottomNavigation } from "@/components/navigation/BottomNavigation";
import { JourneySteps } from "@/components/navigation/JourneySteps";
import { KPIFigure } from "@/components/ui/KPIFigure";
import { useAuth } from "@/hooks/useAuth";
import { useActivePortfolio } from "@/hooks/useActivePortfolio";
import { useUserPortfolios } from "@/hooks/useUserPortfolios";
import { usePortfolioValuation } from "@/hooks/usePortfolioValuation";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/profil")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/auth", search: { redirect: "/profil", mode: "login" } });
    }
  },
  head: () => ({
    meta: [
      { title: "Mon profil d'investisseur — Seedow" },
      {
        name: "description",
        content:
          "Vue d'ensemble de tes valeurs, ton portefeuille et ta progression sur Seedow.",
      },
    ],
  }),
  component: ProfilPage,
});

const CAUSE_LABELS: Record<string, string> = {
  climat: "Climat",
  biodiversite: "Biodiversité",
  humain: "Droits humains",
  egalite: "Égalité F/H",
  tech: "Tech éthique",
  circulaire: "Économie circulaire",
  eau: "Eau",
  social: "Humain",
  governance: "Éthique",
};

const EXCLUSION_LABELS: Record<string, string> = {
  fossiles: "Énergies fossiles",
  armes: "Armement",
  tabac: "Tabac",
  jeux: "Jeux d'argent",
  animaux: "Tests animaux",
  "fast-fashion": "Fast fashion",
};

interface ProfileMeta {
  causes: string[];
  exclusions: string[];
  risk_target: number;
  horizon_years: number;
}

function ProfilPage() {
  const { user } = useAuth();
  const { portfolio } = useActivePortfolio();
  const { portfolios } = useUserPortfolios();
  const valuation = usePortfolioValuation();
  const [meta, setMeta] = useState<ProfileMeta | null>(null);

  // Récupère causes/exclusions/risque du portefeuille actif
  useEffect(() => {
    if (!user || !portfolio?.id) {
      setMeta(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("portfolios")
        .select("causes, exclusions, risk_target, horizon_years")
        .eq("id", portfolio.id)
        .maybeSingle();
      if (cancelled || !data) return;
      setMeta({
        causes: (data.causes ?? []) as string[],
        exclusions: (data.exclusions ?? []) as string[],
        risk_target: Number(data.risk_target ?? 0),
        horizon_years: Number(data.horizon_years ?? 0),
      });
    })();
    return () => { cancelled = true; };
  }, [user, portfolio?.id]);

  const userName = useMemo(() => {
    const m = user?.user_metadata as { display_name?: string; full_name?: string } | undefined;
    return m?.display_name || m?.full_name || user?.email?.split("@")[0] || "Investisseur";
  }, [user]);

  const totalInvested = valuation.totalInvested || (portfolio?.initial_amount ?? 0);
  const currentValue = valuation.currentValue || totalInvested;
  const returnPct = valuation.returnPct;
  const esg = portfolio?.metrics?.esg_score ?? 0;
  const positions = portfolio?.holdings.length ?? 0;
  const riskPct = meta ? (meta.risk_target * 100).toFixed(1) : "—";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-paper"
    >
      <div className="max-w-lg mx-auto pb-28">
        <AppHeader
          eyebrow="Ton profil"
          title={userName}
          subtitle="Tes valeurs, ton portefeuille et ta progression — vue d'ensemble."
        />

        <div className="pt-2">
          <JourneySteps active="values" />
        </div>

        {/* Vue d'ensemble — KPI signature */}
        <section className="px-5 pt-6">
          <div className="grid grid-cols-2 gap-4 border-t border-paper-3 pt-5">
            <KPIFigure
              size="sm"
              label="Capital investi"
              value={totalInvested.toLocaleString("fr-FR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
              unit="€"
            />
            <KPIFigure
              size="sm"
              label="Performance"
              value={`${returnPct >= 0 ? "+" : ""}${returnPct.toFixed(2)}`}
              unit="%"
              accent={returnPct >= 0}
            />
            <KPIFigure
              size="sm"
              label="Score d'impact"
              value={esg.toFixed(0)}
              unit="/100"
            />
            <KPIFigure
              size="sm"
              label="Positions"
              value={positions}
              unit={positions > 1 ? "actifs" : "actif"}
            />
          </div>
        </section>

        {/* Tes valeurs */}
        <section className="px-5 pt-10">
          <div className="gold-rule mb-5" />
          <p className="text-[10px] uppercase tracking-[0.22em] text-gold font-semibold mb-3">
            01 · Tes valeurs
          </p>
          <h2 className="font-value text-2xl text-ink leading-tight">
            Ce que tu finances — et ce que tu refuses
          </h2>

          <div className="mt-5">
            <p className="text-[11px] uppercase tracking-wider text-ink-3 font-semibold mb-2">
              Causes soutenues
            </p>
            {meta && meta.causes.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {meta.causes.map((c) => (
                  <span
                    key={c}
                    className="px-3 py-1.5 text-[12px] font-medium border border-moss-3 text-moss-1 rounded-full"
                  >
                    {CAUSE_LABELS[c] ?? c}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink-3">Aucune cause définie pour ce portefeuille.</p>
            )}
          </div>

          <div className="mt-5">
            <p className="text-[11px] uppercase tracking-wider text-ink-3 font-semibold mb-2">
              Exclusions
            </p>
            {meta && meta.exclusions.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {meta.exclusions.map((e) => (
                  <span
                    key={e}
                    className="px-3 py-1.5 text-[12px] font-medium border border-paper-3 text-ink-2 rounded-full line-through decoration-rust/60"
                  >
                    {EXCLUSION_LABELS[e] ?? e}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink-3">Aucune exclusion définie.</p>
            )}
          </div>

          <Link
            to="/onboarding"
            search={{ new: 1 }}
            className="mt-6 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink hover:text-moss-1 transition-colors"
          >
            Ajuster mes valeurs
            <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </Link>
        </section>

        {/* Ton portefeuille */}
        <section className="px-5 pt-10">
          <div className="gold-rule mb-5" />
          <p className="text-[10px] uppercase tracking-[0.22em] text-gold font-semibold mb-3">
            02 · Ton portefeuille
          </p>
          <h2 className="font-value text-2xl text-ink leading-tight">
            Structure et niveau de risque
          </h2>

          <dl className="mt-5 divide-y divide-paper-3 border-t border-b border-paper-3">
            <Row label="Portefeuille actif" value={portfolio?.name ?? "—"} />
            <Row label="Nombre de portefeuilles" value={`${portfolios.length} / 3`} />
            <Row label="Volatilité cible" value={`${riskPct} %`} />
            <Row
              label="Horizon"
              value={meta ? `${meta.horizon_years} ans` : "—"}
            />
          </dl>

          <Link
            to="/portfolio"
            className="mt-5 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink hover:text-moss-1 transition-colors"
          >
            Voir l'allocation détaillée
            <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </Link>
        </section>

        {/* Ta progression */}
        <section className="px-5 pt-10">
          <div className="gold-rule mb-5" />
          <p className="text-[10px] uppercase tracking-[0.22em] text-gold font-semibold mb-3">
            03 · Ta progression
          </p>
          <h2 className="font-value text-2xl text-ink leading-tight">
            Là où tu en es
          </h2>

          <ul className="mt-5 space-y-3">
            <ProgressItem
              done
              label="Tes valeurs sont définies"
              detail={`${meta?.causes.length ?? 0} causes · ${meta?.exclusions.length ?? 0} exclusions`}
            />
            <ProgressItem
              done={positions > 0}
              label="Ton portefeuille est constitué"
              detail={positions > 0 ? `${positions} positions actives` : "Constitue ton premier portefeuille"}
            />
            <ProgressItem
              done={currentValue > totalInvested}
              label="Ta performance est positive"
              detail={`${returnPct >= 0 ? "+" : ""}${returnPct.toFixed(2)} % depuis le départ`}
            />
          </ul>
        </section>
      </div>

      <BottomNavigation />
    </motion.div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between py-3 gap-4">
      <dt className="text-[11px] uppercase tracking-wider text-ink-3 font-medium">{label}</dt>
      <dd className="text-sm text-ink font-medium tabular-nums truncate">{value}</dd>
    </div>
  );
}

function ProgressItem({
  done,
  label,
  detail,
}: {
  done: boolean;
  label: string;
  detail: string;
}) {
  return (
    <li className="flex items-start gap-3">
      <span
        aria-hidden="true"
        className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
          done ? "bg-moss-1 text-paper" : "border border-paper-3 text-ink-3"
        }`}
      >
        {done ? (
          <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3,8 7,12 13,4" />
          </svg>
        ) : (
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium ${done ? "text-ink" : "text-ink-2"}`}>{label}</p>
        <p className="text-xs text-ink-3 mt-0.5">{detail}</p>
      </div>
    </li>
  );
}
