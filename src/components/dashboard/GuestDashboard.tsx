import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

/**
 * Dashboard « invité » (?guest=true, pas encore de compte).
 *
 * Bascule produit « pool plutôt qu'allocation » : Seedow ne fabrique plus de
 * « simulation » pondérée stockée localement à afficher ici. L'invité explore,
 * puis COMPOSE son portefeuille (pool → builder) ; la création de compte n'arrive
 * qu'au moment de sauvegarder. Cet écran est donc une invitation claire à
 * composer, sans jamais montrer un portefeuille fictif ni un solde inventé.
 */
export function GuestDashboard() {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-paper-2 flex flex-col items-center justify-center px-6 text-center"
    >
      <p className="text-eyebrow uppercase tracking-[0.15em] text-ink-3">
        {t("dashboard.guest_dashboard.browse_eyebrow")}
      </p>
      <h1 className="mt-3 text-h2 text-ink max-w-[460px]">
        {t("dashboard.guest_dashboard.browse_title")}
      </h1>
      <p className="mt-4 text-body text-ink-2 max-w-[440px] leading-relaxed">
        {t("dashboard.guest_dashboard.browse_desc")}
      </p>
      <Button asChild variant="accent" size="pill" className="mt-8">
        <Link to="/onboarding" search={{ guest: true }}>
          {t("dashboard.guest_dashboard.browse_cta")}
        </Link>
      </Button>
      <Link
        to="/cours"
        className="mt-4 text-body-sm text-ink-2 underline underline-offset-4 hover:text-ink"
      >
        {t("dashboard.guest_dashboard.browse_secondary")}
      </Link>
    </motion.div>
  );
}
