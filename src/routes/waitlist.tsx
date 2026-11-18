import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { joinWaitlist } from "@/lib/beta/beta.functions";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Wordmark } from "@/components/brand/Wordmark";
import { Aurora } from "@/components/motion/Aurora";
import { CountUp } from "@/components/motion/CountUp";
import { Button } from "@/components/ui/button";
import { siteUrl, socialMeta } from "@/lib/seo/socialMeta";

export const Route = createFileRoute("/waitlist")({
  head: () => ({
    meta: socialMeta({
      title: "Liste d'attente — Seedow",
      description:
        "La phase bêta de Seedow est complète. Inscris-toi sur la liste d'attente pour être notifié·e dès qu'une place se libère.",
      cardDescription: "Phase bêta complète. Inscris-toi pour la prochaine vague.",
      path: "/waitlist",
    }),
    links: [{ rel: "canonical", href: siteUrl("/waitlist") }],
  }),
  component: WaitlistPage,
});

function WaitlistPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [position, setPosition] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await joinWaitlist({ data: { email, source: "waitlist_page" } });
      setPosition(res.position);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-12">
      <Aurora />
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <Wordmark />
          <LanguageToggle />
        </div>
        <div className="paper-card animate-pop p-7 sm:p-9">
          <span className="chip chip--verified">
            <span aria-hidden className="live-dot" />
            {t("waitlist.eyebrow")}
          </span>
          <h1 className="mt-5 text-[clamp(28px,4vw,36px)]">{t("waitlist.title")}</h1>
          <p className="mt-3 text-body leading-relaxed text-ink-2">{t("waitlist.desc")}</p>

        {position !== null ? (
          <div className="hero-card mt-8 p-6 text-center">
            <p className="stamp">{t("waitlist.registered")}</p>
            <p className="mt-2 font-display text-[64px] font-extrabold leading-none tracking-[-0.04em] text-mint-ink">
              #<CountUp value={position} />
            </p>
            <p className="mt-3 text-body-sm text-ink-2">{t("waitlist.on_list")}</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-8 space-y-3">
            <input
              type="email"
              required
              placeholder={t("waitlist.email_placeholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field"
            />
            {error && <p className="text-label text-alert-ink">{error}</p>}
            <Button
              type="submit"
              size="lg"
              disabled={submitting}
              className="w-full justify-center"
            >
              {submitting ? t("waitlist.submitting") : t("waitlist.btn_join")}
            </Button>
          </form>
        )}
        </div>
        <Link
          to="/"
          className="link-u mt-6 inline-block text-body-sm font-semibold text-ink-2 hover:text-ink"
        >
          ← {t("common.back")}
        </Link>
      </div>
    </div>
  );
}
