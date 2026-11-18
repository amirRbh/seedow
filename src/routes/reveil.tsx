import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Sunrise } from "lucide-react";
import { useTranslation } from "react-i18next";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/navigation/AppHeader";
import { BottomNavigation } from "@/components/navigation/BottomNavigation";
import { ReveilFeed } from "@/components/reveil/ReveilFeed";
import { AssetDetailSheet } from "@/components/discover/AssetDetailSheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useReveil } from "@/hooks/useReveil";
import { requireAuthedUser } from "@/lib/auth/requireAuthedUser";
import type { DiscoverAsset } from "@/lib/discover/types";

export const Route = createFileRoute("/reveil")({
  beforeLoad: () => requireAuthedUser("/reveil"),
  component: ReveilPage,
  head: () => ({
    meta: [
      { title: "Le Réveil — seedow" },
      {
        name: "description",
        content: "Ce que la donnée dit, aujourd'hui, des entreprises que tu détiens et suis.",
      },
    ],
  }),
});

function ReveilPage() {
  const { t } = useTranslation();
  const { dispatches, loading, assetsById } = useReveil();
  const [detail, setDetail] = useState<DiscoverAsset | null>(null);

  return (
    <div className="min-h-screen">
      <div className="page accent-solar">
        <AppHeader
          eyebrow={t("reveil.eyebrow")}
          title={t("reveil.title")}
          subtitle={
            loading
              ? t("reveil.loading")
              : dispatches.length > 0
                ? t("reveil.subtitle", { n: dispatches.length })
                : t("reveil.subtitle_empty")
          }
          hideViewToggle
        />
        <div className="px-5">
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-[24px]" />
              ))}
            </div>
          ) : dispatches.length === 0 ? (
            <EmptyState
              icon={Sunrise}
              title={t("reveil.empty_title")}
              description={t("reveil.empty_desc")}
              action={
                <Button asChild variant="outline">
                  <Link to="/discover">{t("reveil.empty_cta")}</Link>
                </Button>
              }
            />
          ) : (
            <ReveilFeed
              dispatches={dispatches}
              onAssetClick={(id) => setDetail(assetsById.get(id) ?? null)}
            />
          )}
        </div>
      </div>

      <AssetDetailSheet
        open={detail !== null}
        onOpenChange={(o) => !o && setDetail(null)}
        asset={detail}
      />
      <BottomNavigation />
    </div>
  );
}
