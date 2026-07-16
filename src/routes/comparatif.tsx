import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { AppHeader } from "@/components/navigation/AppHeader";
import { BottomNavigation } from "@/components/navigation/BottomNavigation";
import { ComparatifPanel } from "@/components/portfolio/ComparatifPanel";
import { useActivePortfolio } from "@/hooks/useActivePortfolio";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/comparatif")({
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth", search: { redirect: "/comparatif", mode: "login" } });
    }
  },
  head: () => ({
    meta: [
      { title: "Comparatif — Seedow" },
      {
        name: "description",
        content:
          "Compare ton portefeuille Seedow à un ETF MSCI World classique : performance, frais, score d'impact, CO₂.",
      },
    ],
  }),
  component: ComparatifPage,
});

function ComparatifPage() {
  const { t } = useTranslation();
  const { portfolio, loading } = useActivePortfolio();

  if (loading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <p className="text-label text-ink-3">{t("comparison.loading")}</p>
      </div>
    );
  }

  if (!portfolio) {
    return (
      <div className="min-h-screen bg-paper">
        <div className="max-w-lg mx-auto pb-28">
          <AppHeader eyebrow={t("comparison.eyebrow")} title={t("comparison.no_active")} />
          <div className="px-5 pt-8">
            <Link
              to="/onboarding"
              search={{ new: undefined }}
              className="inline-block px-4 py-2 text-label font-medium border border-ink rounded hover:bg-ink hover:text-paper transition-colors"
            >
              {t("comparison.start")}
            </Link>
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-paper">
      <div className="max-w-lg mx-auto pb-28">
        <AppHeader
          eyebrow={t("comparison.eyebrow")}
          title={t("comparison.title")}
          subtitle={t("comparison.subtitle")}
          showPortfolioSelector
        />
        <section className="px-5 pt-6">
          <ComparatifPanel />
        </section>
      </div>
      <BottomNavigation />
    </motion.div>
  );
}
