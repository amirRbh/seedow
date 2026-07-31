import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { AppHeader } from "@/components/navigation/AppHeader";
import { BottomNavigation } from "@/components/navigation/BottomNavigation";
import { EditorialSection } from "@/components/ui/EditorialSection";
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
    <div className="min-h-screen bg-paper pb-24 md:pb-12">
      <AppHeader eyebrow={t("vote.eyebrow")} title={t("vote.title")} hideViewToggle />
      <div className="mx-auto max-w-3xl px-4 md:px-8">
        <EditorialSection
          eyebrow={t("vote.section_eyebrow")}
          title={t("vote.section_title")}
          kicker={t("vote.section_kicker")}
          number="01"
        >
          {loading ? (
            <p className="text-body-sm text-ink-3">{t("vote.loading")}</p>
          ) : resolutions.length === 0 ? (
            <div className="rounded-lg border border-dashed border-paper-3 bg-paper p-10 text-center">
              <p className="font-value text-xl text-ink">{t("vote.empty_title")}</p>
              <p className="mt-2 text-body-sm text-ink-3">{t("vote.empty_desc")}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              {open.length > 0 && (
                <div className="flex flex-col gap-3">
                  <p className="text-tag font-mono uppercase tracking-[0.14em] text-ink-3">
                    {t("vote.open_heading")}
                  </p>
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
                  <p className="text-tag font-mono uppercase tracking-[0.14em] text-ink-3">
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

          <div className="gold-rule my-10" />
          <p className="text-caption leading-relaxed text-ink-3">{t("vote.disclaimer")}</p>
        </EditorialSection>
      </div>
      <BottomNavigation />
    </div>
  );
}
