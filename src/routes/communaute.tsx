import { createFileRoute, redirect } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { BottomNavigation } from "@/components/navigation/BottomNavigation";
import { AppHeader } from "@/components/navigation/AppHeader";
import { EditorialSection } from "@/components/ui/EditorialSection";
import { CommunityPanel } from "@/components/community/CommunityPanel";

export const Route = createFileRoute("/communaute")({
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth", search: { redirect: "/communaute", mode: "login" } });
    }
  },
  component: CommunautePage,
  head: () => ({
    meta: [
      { title: "Communauté — seedow" },
      {
        name: "description",
        content: "Compare ta stratégie d'investissement responsable avec la communauté seedow.",
      },
    ],
  }),
});

function CommunautePage() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-paper pb-24 md:pb-12">
      <AppHeader eyebrow={t("community.eyebrow")} title={t("community.title")} />
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <EditorialSection
          eyebrow={t("community.eyebrow")}
          title={t("community.section_title")}
          kicker={t("community.section_kicker")}
          number="01"
        >
          <CommunityPanel />
        </EditorialSection>
      </div>
      <BottomNavigation />
    </div>
  );
}
