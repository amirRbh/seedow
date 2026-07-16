import { createFileRoute, redirect } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { BottomNavigation } from "@/components/navigation/BottomNavigation";
import { AppHeader } from "@/components/navigation/AppHeader";
import { AssetScreener } from "@/components/discover/AssetScreener";
import { CommunityPanel } from "@/components/community/CommunityPanel";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/discover")({
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth", search: { redirect: "/discover", mode: "login" } });
    }
  },
  component: Discover,
});

function Discover() {
  const { t } = useTranslation();

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-paper">
      <div className="max-w-lg mx-auto pb-28">
        <AppHeader eyebrow={t("discover.eyebrow")} title={t("discover.title")} />

        <div className="px-5 pt-2 pb-3">
          <Tabs defaultValue="explorer">
            <TabsList className="w-full grid grid-cols-2 h-auto bg-paper-2 p-1">
              <TabsTrigger value="explorer" className="text-[11px] uppercase tracking-[0.12em]">
                {t("discover.tab_explore")}
              </TabsTrigger>
              <TabsTrigger value="communaute" className="text-[11px] uppercase tracking-[0.12em]">
                {t("discover.tab_community")}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="communaute" className="pt-4">
              <CommunityPanel />
            </TabsContent>
            <TabsContent value="explorer" className="pt-2 -mx-5">
              <AssetScreener />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <BottomNavigation />
    </motion.div>
  );
}
