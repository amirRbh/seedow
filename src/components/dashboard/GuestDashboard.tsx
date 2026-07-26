import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useLang } from "@/hooks/useLang";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { AllocationList, type AllocationHolding } from "@/components/portfolio/AllocationList";
import { GuestBanner } from "@/components/dashboard/GuestBanner";
import { readGuestSimulation, type GuestSimulation } from "@/lib/beta/guest";

/**
 * Dashboard « invité » : rendu à partir de la simulation stockée localement
 * (aucune requête base / valorisation live — c'est un instantané statique, pas
 * un portefeuille réel). Cadre « Simulation » assumé, et invitation claire à
 * créer un compte pour sauvegarder. N'utilise aucun hook lié à la base pour
 * rester découplé du dashboard authentifié.
 */
export function GuestDashboard() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const navigate = useNavigate();

  // Lecture client-only (localStorage indisponible en SSR).
  const [sim, setSim] = useState<GuestSimulation | null | undefined>(undefined);
  useEffect(() => {
    setSim(readGuestSimulation());
  }, []);

  const holdings: AllocationHolding[] = useMemo(() => {
    if (!sim) return [];
    return sim.allocation.map((h, i) => ({
      id: h.ticker || String(i),
      ticker: h.ticker,
      name: h.name,
      allocationPct: h.allocationPct,
      performancePct: 0,
      esgScore: 0,
      category: "equity_dev",
    }));
  }, [sim]);

  // Chargement (avant lecture localStorage) : évite un flash d'état vide.
  if (sim === undefined) {
    return <div className="min-h-screen bg-paper" aria-hidden />;
  }

  // Simulation expirée / absente : proposer d'en relancer une.
  if (sim === null) {
    return (
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center px-6 text-center">
        <p className="text-body text-ink-2 max-w-[300px]">
          {t("dashboard.guest_dashboard.expired_title")}
        </p>
        <Button asChild variant="accent" size="pill" className="mt-6">
          <Link to="/onboarding" search={{ guest: true }}>
            {t("dashboard.guest_dashboard.expired_cta")}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-paper">
      <GuestBanner guestParam />

      <div className="max-w-lg mx-auto px-5 pb-28">
        <header className="pt-8">
          <p className="text-tag uppercase tracking-[0.16em] text-ink-3 font-medium">
            {t("dashboard.guest_dashboard.eyebrow")}
          </p>
          <p className="text-caption uppercase tracking-wider text-ink-3 font-medium mt-4">
            {t("dashboard.guest_dashboard.value_label")}
          </p>
          <h1 className="font-value text-6xl text-ink leading-none mt-1">
            {formatCurrency(sim.amount, lang)}
          </h1>
        </header>

        {/* Cadre simulation — jamais confondre avec un portefeuille réel */}
        <div className="mt-4 inline-flex items-center gap-2 rounded-[14px] bg-paper-2 border border-paper-3 px-3 py-2">
          <span aria-hidden className="inline-block w-2 h-2 rounded-full flex-shrink-0 bg-ice" />
          <span className="text-body-sm text-ink-2">{t("landing.badge_simulation")}</span>
        </div>

        <section className="pt-8">
          <AllocationList
            holdings={holdings}
            maxSlots={Math.max(5, holdings.length)}
            onEmptySlotClick={() => navigate({ to: "/onboarding", search: { guest: true } })}
          />
        </section>

        {/* Conversion — créer un compte pour sauvegarder */}
        <section className="pt-8">
          <div className="rounded-[18px] bg-ink text-paper p-6 text-center">
            <p className="font-value text-lg">{t("dashboard.guest_dashboard.save_title")}</p>
            <Button asChild variant="accent" size="pill" className="mt-4">
              <Link to="/onboarding" search={{ new: undefined }}>
                {t("dashboard.guest_dashboard.save_cta")}
              </Link>
            </Button>
            <p className="text-caption text-paper/60 mt-3">
              {t("dashboard.guest_dashboard.save_hint")}
            </p>
          </div>
        </section>
      </div>
    </motion.div>
  );
}
