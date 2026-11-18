import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { AppHeader } from "@/components/navigation/AppHeader";
import { BottomNavigation } from "@/components/navigation/BottomNavigation";
import { Vote } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { ResolutionListItem } from "@/components/vote/ResolutionListItem";
import { useResolutions, useMyVotes } from "@/hooks/useResolutions";
import { requireAuthedUser } from "@/lib/auth/requireAuthedUser";

export const Route = createFileRoute("/vote")({
  beforeLoad: () => requireAuthedUser("/vote"),
  component: VotePage,
  head: () => ({
    meta: [
      { title: "Le Vote — seedow" },
      {
        name: "description",
        content:
          "Ton argent te donne un droit de vote aux assemblées générales. Exerce-le, rejoins le Bloc.",
      },
    ],
  }),
});

function VotePage() {
  const { t } = useTranslation();
  const { resolutions, loading } = useResolutions();
  const myVotes = useMyVotes();

  const open = resolutions.filter((r) => r.resolution.status === "open");
  const closed = resolutions.filter((r) => r.resolution.status === "closed");

  return (
    <div className="min-h-screen">
      <div className="page accent-volt">
        <AppHeader
          eyebrow={t("vote.eyebrow")}
          title={t("vote.section_title")}
          subtitle={t("vote.section_kicker")}
          hideViewToggle
        />
        <div className="px-5">
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-[24px]" />
              ))}
            </div>
          ) : resolutions.length === 0 ? (
            <EmptyState
              icon={Vote}
              title={t("vote.empty_title")}
              description={t("vote.empty_desc")}
            />
          ) : (
            <div className="flex flex-col gap-8">
              {open.length > 0 && (
                <div className="flex flex-col gap-3">
                  <p className="text-caption font-semibold text-ink-3">{t("vote.open_heading")}</p>
                  {open.map((item) => (
                    <ResolutionListItem
                      key={item.resolution.id}
                      resolution={item.resolution}
                      bloc={item.bloc}
                      myChoice={myVotes[item.resolution.id] ?? null}
                    />
                  ))}
                </div>
              )}

              {closed.length > 0 && (
                <div className="flex flex-col gap-3">
                  <p className="text-caption font-semibold text-ink-3">
                    {t("vote.closed_heading")}
                  </p>
                  {closed.map((item) => (
                    <ResolutionListItem
                      key={item.resolution.id}
                      resolution={item.resolution}
                      bloc={item.bloc}
                      myChoice={myVotes[item.resolution.id] ?? null}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          <p className="mt-10 text-body-sm leading-relaxed text-ink-3">{t("vote.disclaimer")}</p>
        </div>
      </div>
      <BottomNavigation />
    </div>
  );
}
