import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useWrapped } from "@/hooks/useResolutions";
import { renderWrappedCard } from "@/lib/vote/wrappedCard";
import { downloadBlob } from "@/lib/vote/shareCard";
import { requireAuthedUser } from "@/lib/auth/requireAuthedUser";
import { useLang } from "@/hooks/useLang";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/wrapped")({
  beforeLoad: () => requireAuthedUser("/wrapped"),
  component: WrappedPage,
  head: () => ({
    meta: [{ title: "Ton bilan — seedow" }],
  }),
});

function WrappedPage() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const { wrapped, loading } = useWrapped();
  const [step, setStep] = useState(0);

  const nf = useMemo(() => new Intl.NumberFormat(lang === "en" ? "en-US" : "fr-FR"), [lang]);

  const slides = useMemo(() => {
    if (!wrapped || wrapped.totalVotes === 0) return [];
    const list: SlideContent[] = [
      { kind: "intro", title: t("wrapped.intro_title"), sub: t("wrapped.intro_sub") },
      {
        kind: "stat",
        big: nf.format(wrapped.totalVotes),
        label: t("wrapped.votes_label"),
      },
      {
        kind: "stat",
        big: nf.format(wrapped.refusals),
        label: t("wrapped.refusals_label"),
        chips: wrapped.refusedCompanies,
      },
    ];
    if (wrapped.biggestBloc) {
      list.push({
        kind: "stat",
        big: nf.format(wrapped.biggestBloc.total),
        label: t("wrapped.bloc_label", { company: wrapped.biggestBloc.company }),
      });
    }
    list.push({ kind: "final" });
    return list;
  }, [wrapped, t, nf]);

  const share = async () => {
    if (!wrapped) return;
    const blocLine = wrapped.biggestBloc
      ? t("wrapped.share.bloc_line", {
          total: nf.format(wrapped.biggestBloc.total),
          company: wrapped.biggestBloc.company,
        })
      : null;
    try {
      const blob = await renderWrappedCard({
        eyebrow: t("wrapped.card_eyebrow"),
        totalVotes: nf.format(wrapped.totalVotes),
        totalVotesLabel: t("wrapped.votes_label"),
        refusals: nf.format(wrapped.refusals),
        refusalsLabel: t("wrapped.refusals_label_short"),
        blocLine,
        tagline: t("wrapped.share.tagline"),
      });
      const file = new File([blob], "seedow-bilan.png", { type: "image/png" });
      const text = t("wrapped.share.text");
      if (
        typeof navigator !== "undefined" &&
        navigator.canShare?.({ files: [file] }) &&
        navigator.share
      ) {
        await navigator.share({ files: [file], text, title: "seedow" });
      } else {
        downloadBlob(blob, "seedow-bilan.png");
        if (typeof navigator !== "undefined" && navigator.clipboard) {
          await navigator.clipboard.writeText(text);
        }
      }
    } catch {
      // partage annulé — rien à signaler
    }
  };

  const total = slides.length;
  const current = slides[step];
  const advance = () => setStep((s) => Math.min(s + 1, total - 1));

  return (
    <div className="ink-section paper-grain ink-grain relative flex min-h-screen flex-col overflow-hidden rounded-none">
      <Link
        to="/le-fil"
        aria-label={t("wrapped.close")}
        className="absolute right-5 top-5 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-paper/20 text-paper/70 transition-colors hover:text-paper"
      >
        ✕
      </Link>

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="font-mono text-caption uppercase tracking-widest text-paper/60">
            {t("wrapped.loading")}
          </p>
        </div>
      ) : total === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <p className="font-value text-2xl text-paper">{t("wrapped.empty_title")}</p>
          <p className="mt-2 max-w-sm text-body-sm text-paper/70">{t("wrapped.empty_desc")}</p>
          <Link
            to="/vote"
            className="mt-6 rounded-full bg-mint px-6 py-3 text-body font-semibold text-paper transition-transform duration-300 hover:scale-[1.02]"
          >
            {t("wrapped.empty_cta")}
          </Link>
        </div>
      ) : (
        <>
          {/* Segments de progression (façon story) */}
          <div className="flex gap-1.5 px-4 pt-4">
            {slides.map((_, i) => (
              <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-paper/20">
                <div
                  className={cn(
                    "h-full rounded-full bg-mint transition-all duration-300",
                    i <= step ? "w-full" : "w-0",
                  )}
                />
              </div>
            ))}
          </div>

          {/* Zone tap : avance au clic (sauf slide finale) */}
          <button
            type="button"
            onClick={current?.kind === "final" ? undefined : advance}
            disabled={current?.kind === "final"}
            className="relative flex flex-1 cursor-pointer flex-col items-center justify-center px-8 text-center focus-visible:outline-none disabled:cursor-default"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
                className="flex flex-col items-center"
              >
                {current?.kind === "intro" && (
                  <>
                    <p className="font-mono text-tag uppercase tracking-[0.2em] text-mint-ink">
                      {t("wrapped.card_eyebrow")}
                    </p>
                    <h1 className="mt-4 font-value text-4xl leading-tight text-paper">
                      {current.title}
                    </h1>
                    <p className="mt-3 max-w-sm text-body text-paper/70">{current.sub}</p>
                  </>
                )}

                {current?.kind === "stat" && (
                  <>
                    <span className="font-mono text-[clamp(4rem,22vw,7rem)] font-bold leading-none tracking-tight text-paper tabular-nums">
                      {current.big}
                    </span>
                    <p className="mt-4 max-w-sm text-body-lg text-paper/80">{current.label}</p>
                    {current.chips && current.chips.length > 0 && (
                      <div className="mt-5 flex flex-wrap justify-center gap-2">
                        {current.chips.map((c) => (
                          <span
                            key={c}
                            className="rounded-full border border-paper/25 px-3 py-1 font-mono text-caption text-paper/80"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {current?.kind === "final" && (
                  <>
                    <p className="font-mono text-tag uppercase tracking-[0.2em] text-mint-ink">
                      {t("wrapped.card_eyebrow")}
                    </p>
                    <h2 className="mt-4 font-value text-3xl leading-tight text-paper">
                      {t("wrapped.final_title")}
                    </h2>
                    <p className="mt-3 max-w-sm text-body text-paper/70">
                      {t("wrapped.final_sub")}
                    </p>
                    <div className="mt-8 flex flex-col items-stretch gap-3">
                      <button
                        type="button"
                        onClick={share}
                        className="rounded-full bg-mint px-8 py-3.5 text-body font-semibold text-paper transition-transform duration-300 hover:scale-[1.02]"
                      >
                        {t("wrapped.share_cta")}
                      </button>
                      <Link
                        to="/vote"
                        className="rounded-full border border-paper/25 px-8 py-3.5 text-body font-semibold text-paper transition-colors hover:border-paper"
                      >
                        {t("wrapped.final_vote_cta")}
                      </Link>
                    </div>
                  </>
                )}
              </motion.div>
            </AnimatePresence>

            {current?.kind !== "final" && (
              <span className="absolute bottom-6 font-mono text-tag uppercase tracking-widest text-paper/40">
                {t("wrapped.tap_hint")}
              </span>
            )}
          </button>
        </>
      )}
    </div>
  );
}

type SlideContent =
  | { kind: "intro"; title: string; sub: string }
  | { kind: "stat"; big: string; label: string; chips?: string[] }
  | { kind: "final" };
