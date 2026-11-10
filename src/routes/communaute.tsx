import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { BottomNavigation } from "@/components/navigation/BottomNavigation";
import { AppHeader } from "@/components/navigation/AppHeader";
import { CommunityPanel } from "@/components/community/CommunityPanel";
import { requireAuthedUser } from "@/lib/auth/requireAuthedUser";

export const Route = createFileRoute("/communaute")({
  beforeLoad: () => requireAuthedUser("/communaute"),
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
    <div className="min-h-screen">
      <div className="page page--wide accent-volt">
        <AppHeader
          eyebrow={t("community.eyebrow")}
          title={t("community.section_title")}
          subtitle={t("community.section_kicker")}
        />
        <div className="px-5">
          <CommunityPanel />
        </div>
      </div>
      <BottomNavigation />
    </div>
  );
}
