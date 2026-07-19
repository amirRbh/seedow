import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { AppHeader } from "@/components/navigation/AppHeader";
import { BottomNavigation } from "@/components/navigation/BottomNavigation";
import { ComparatifPanel } from "@/components/portfolio/ComparatifPanel";
import { EmptyPortfolioState } from "@/components/portfolio/EmptyPortfolioState";
import { useActivePortfolio } from "@/hooks/useActivePortfolio";
import { useAuth } from "@/hooks/useAuth";
import { requireAuthedUser } from "@/lib/auth/requireAuthedUser";

export const Route = createFileRoute("/comparatif")({
  beforeLoad: () => requireAuthedUser("/comparatif"),
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
  const { user } = useAuth();
  const { portfolio, loading } = useActivePortfolio();

  if (loading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <p className="text-label text-ink-3">{t("comparison.loading")}</p>
      </div>
    );
  }

  if (!portfolio) {
    const userName =
      (user?.user_metadata as { display_name?: string; full_name?: string } | undefined)
        ?.display_name ?? user?.email?.split("@")[0] ?? "";
    return (
      <div className="min-h-screen bg-paper">
        <EmptyPortfolioState userName={userName} />
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
