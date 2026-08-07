import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { BottomNavigation } from "@/components/navigation/BottomNavigation";
import { AppHeader } from "@/components/navigation/AppHeader";
import { BlankCanvasBuilder } from "@/components/portfolio/BlankCanvasBuilder";
import { requireAuthedUser } from "@/lib/auth/requireAuthedUser";

export const Route = createFileRoute("/construire")({
  beforeLoad: () => requireAuthedUser("/construire"),
  component: ConstruirePage,
  head: () => ({
    meta: [
      { title: "Construire mon portefeuille — seedow" },
      {
        name: "description",
        content: "Composez votre portefeuille vous-même, pas à pas. Seedow vous accompagne.",
      },
    ],
  }),
});

function ConstruirePage() {
  const { t } = useTranslation();
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-paper">
      <div className="max-w-lg mx-auto pb-28">
        <AppHeader eyebrow={t("blank_builder.eyebrow")} title={t("blank_builder.title")} />
        <section className="px-5 pt-4">
          <BlankCanvasBuilder />
        </section>
      </div>
      <BottomNavigation />
    </motion.div>
  );
}
