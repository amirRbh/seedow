import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
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
    <div className="min-h-screen bg-paper pb-24 md:pb-12">
      <AppHeader eyebrow={t("reveil.eyebrow")} title={t("reveil.title")} hideViewToggle />
      <div className="mx-auto max-w-3xl px-4 pt-6 md:px-8">
        <p className="mb-6 max-w-prose text-body text-ink-2">
          {loading
            ? t("reveil.loading")
            : dispatches.length > 0
              ? t("reveil.subtitle", { n: dispatches.length })
              : t("reveil.subtitle_empty")}
        </p>

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
        ) : dispatches.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-paper-3 bg-paper p-10 text-center">
            <p className="font-value text-xl text-ink">{t("reveil.empty_title")}</p>
            <p className="mt-2 text-body-sm text-ink-3">{t("reveil.empty_desc")}</p>
            <Link
              to="/discover"
              className="mt-6 inline-block rounded-full border border-ink px-4 py-2 text-label font-medium transition-colors hover:bg-ink hover:text-paper"
            >
              {t("reveil.empty_cta")}
            </Link>
          </div>
        ) : (
          <ReveilFeed
            dispatches={dispatches}
            onAssetClick={(id) => setDetail(assetsById.get(id) ?? null)}
          />
        )}
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
