import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { AppHeader } from "@/components/navigation/AppHeader";
import { BottomNavigation } from "@/components/navigation/BottomNavigation";
import { VotePanel } from "@/components/vote/VotePanel";
import { BlocMeter } from "@/components/vote/BlocMeter";
import { ResolutionResult } from "@/components/vote/ResolutionResult";
import { useMyVotes, useCastVote } from "@/hooks/useResolutions";
import { getResolution } from "@/lib/vote/vote.functions";
import { requireAuthedUser } from "@/lib/auth/requireAuthedUser";
import { daysUntilClose, type VoteChoice } from "@/lib/vote/bloc";
import { renderBlocShareCard, downloadBlob } from "@/lib/vote/shareCard";
import { formatDate } from "@/lib/format";
import { useLang } from "@/hooks/useLang";

export const Route = createFileRoute("/vote/$resolutionId")({
  beforeLoad: ({ params }) => requireAuthedUser(`/vote/${params.resolutionId}`),
  component: ResolutionPage,
  head: () => ({
    meta: [{ title: "Le Vote — seedow" }],
  }),
});

function ResolutionPage() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const { resolutionId } = Route.useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["resolution", resolutionId],
    queryFn: () => getResolution({ data: { id: resolutionId } }),
    staleTime: 15_000,
  });

  const myVotes = useMyVotes();
  const { submit, casting } = useCastVote();

  const myChoice: VoteChoice | null = myVotes[resolutionId] ?? null;

  // Partage du Bloc : une image PNG à la DA (le moment viral), via le partage
  // natif si dispo, sinon téléchargement + lien copié.
  const share = async () => {
    if (!data) return;
    const r = data.resolution;
    const b = data.bloc;
    const url = typeof window !== "undefined" ? window.location.href : "";
    const text = t("vote.share_text", { title: r.title });
    const nf = new Intl.NumberFormat(lang === "en" ? "en-US" : "fr-FR");
    const featured = myChoice ? b[myChoice] : b.total;
    const subline = myChoice
      ? t("vote.share.subline_choice", { choice: t(`vote.choice_${myChoice}`) })
      : t("vote.share.subline_total");

    try {
      const blob = await renderBlocShareCard({
        eyebrow: t("vote.bloc.live"),
        wordmarkRight: t("vote.title"),
        bigNumber: nf.format(Math.max(featured, myChoice ? 1 : 0)),
        subline,
        company: r.company,
        title: r.title,
        tagline: t("vote.share.tagline"),
      });
      const file = new File([blob], "seedow-vote.png", { type: "image/png" });

      if (
        typeof navigator !== "undefined" &&
        navigator.canShare?.({ files: [file] }) &&
        navigator.share
      ) {
        await navigator.share({ files: [file], text, title: "seedow" });
      } else if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: "seedow", text, url });
      } else {
        downloadBlob(blob, "seedow-vote.png");
        if (typeof navigator !== "undefined" && navigator.clipboard) {
          await navigator.clipboard.writeText(`${text} ${url}`.trim());
        }
      }
    } catch {
      // partage annulé par l'utilisateur — rien à signaler
    }
  };

  const meetingLine = useMemo(() => {
    if (!data) return null;
    return formatDate(new Date(data.resolution.meetingDate), lang, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, [data, lang]);

  const resolution = data?.resolution ?? null;
  const bloc = data?.bloc ?? { for: 0, against: 0, abstain: 0, total: 0 };
  const days = resolution ? daysUntilClose(resolution.closesAt) : null;

  return (
    <div className="min-h-screen bg-paper pb-24 md:pb-12">
      <AppHeader
        eyebrow={t("vote.eyebrow")}
        title={resolution ? resolution.company : t("vote.title")}
        hideViewToggle
      />
      <div className="mx-auto max-w-2xl px-4 md:px-8">
        <div className="pt-6">
          <Link
            to="/vote"
            className="inline-flex items-center gap-1.5 font-mono text-tag uppercase tracking-[0.12em] text-ink-3 transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight-1"
          >
            ← {t("vote.back")}
          </Link>
        </div>

        {isLoading ? (
          <p className="pt-10 text-body-sm text-ink-3">{t("vote.loading")}</p>
        ) : !resolution ? (
          <div className="pt-10 text-center">
            <p className="font-value text-xl text-ink">{t("vote.not_found_title")}</p>
            <p className="mt-2 text-body-sm text-ink-3">{t("vote.not_found_desc")}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6 pt-6">
            {/* Titre de la résolution + méta */}
            <div>
              <div className="flex flex-wrap items-center gap-2 font-mono text-tag uppercase tracking-[0.1em] text-ink-3">
                {resolution.theme && (
                  <span className="rounded-full bg-paper-2 px-2.5 py-1 text-ink-2">
                    {resolution.theme}
                  </span>
                )}
                <span>{meetingLine}</span>
                {resolution.status === "open" && days != null && (
                  <span className="inline-flex items-center gap-1.5 text-ink">
                    <span aria-hidden="true" className="apple-live" />
                    {days === 0
                      ? t("vote.status.last_day")
                      : t("vote.status.days_left", { n: days })}
                  </span>
                )}
              </div>
              <h2 className="mt-3 font-value text-2xl leading-tight text-ink">
                {resolution.title}
              </h2>
            </div>

            {resolution.status === "closed" ? (
              <ResolutionResult resolution={resolution} bloc={bloc} />
            ) : myChoice ? (
              <div className="flex flex-col gap-5">
                <div className="flex items-center gap-2 rounded-lg bg-paper-2 px-4 py-3 text-body-sm text-ink">
                  <CheckIcon />
                  {t("vote.voted_confirm", { choice: t(`vote.choice_${myChoice}`) })}
                </div>
                <BlocMeter bloc={bloc} myChoice={myChoice} onShare={share} />
                <button
                  type="button"
                  disabled={casting}
                  onClick={() => submit(resolutionId, myChoice === "for" ? "against" : "for")}
                  className="mx-auto text-caption uppercase tracking-[0.16em] text-ink-3 underline-offset-4 transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight-1 disabled:opacity-50"
                >
                  {t("vote.change_vote")}
                </button>
              </div>
            ) : (
              <VotePanel
                resolution={resolution}
                casting={casting}
                onVote={(choice) => submit(resolutionId, choice)}
              />
            )}
          </div>
        )}
      </div>
      <BottomNavigation />
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 flex-none text-mint"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
