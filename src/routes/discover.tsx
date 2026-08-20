import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { BottomNavigation } from "@/components/navigation/BottomNavigation";
import { AppHeader } from "@/components/navigation/AppHeader";
import { AssetScreener } from "@/components/discover/AssetScreener";
import { CommunityPanel } from "@/components/community/CommunityPanel";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { THEME_OPTIONS } from "@/lib/discover/filters";
import { requireAuthedUser } from "@/lib/auth/requireAuthedUser";

export const Route = createFileRoute("/discover")({
  // `?theme=climat` pré-filtre l'explorer sur une conviction (deep-link depuis
  // Le Fil). On ne retient que les thèmes connus, sinon on ignore.
  validateSearch: (s: Record<string, unknown>): { theme?: string } => {
    const raw = typeof s.theme === "string" ? s.theme : undefined;
    return { theme: raw && (THEME_OPTIONS as readonly string[]).includes(raw) ? raw : undefined };
  },
  beforeLoad: () => requireAuthedUser("/discover"),
  component: Discover,
});

function Discover() {
  const { t } = useTranslation();
  const { theme } = Route.useSearch();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-paper-2"
    >
      <div className="max-w-lg mx-auto pb-28">
        <AppHeader eyebrow={t("discover.eyebrow")} title={t("discover.title")} />

        <div className="px-5 pt-2 pb-3">
          <Tabs defaultValue="explorer">
            <TabsList className="w-full grid grid-cols-2 h-auto bg-paper-2 p-1">
              <TabsTrigger value="explorer" className="text-caption uppercase tracking-[0.12em]">
                {t("discover.tab_explore")}
              </TabsTrigger>
              <TabsTrigger value="communaute" className="text-caption uppercase tracking-[0.12em]">
                {t("discover.tab_community")}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="communaute" className="pt-4">
              <CommunityPanel />
            </TabsContent>
            <TabsContent value="explorer" className="pt-2 -mx-5">
              <AssetScreener initialThemes={theme ? [theme] : undefined} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <BottomNavigation />
    </motion.div>
  );
}
