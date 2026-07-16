import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { joinWaitlist } from "@/lib/beta/beta.functions";
import { LanguageToggle } from "@/components/LanguageToggle";

export const Route = createFileRoute("/waitlist")({
  head: () => ({
    meta: [
      { title: "Liste d'attente — Seedow" },
      {
        name: "description",
        content: "La phase bêta de Seedow est complète. Inscris-toi sur la liste d'attente pour être notifié·e dès qu'une place se libère.",
      },
      { property: "og:title", content: "Liste d'attente — Seedow" },
      { property: "og:description", content: "Phase bêta complète. Inscris-toi pour la prochaine vague." },
    ],
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
    <div className="min-h-screen bg-paper flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <Link to="/" className="block text-tag uppercase tracking-[0.22em] text-ink-3 font-medium hover:text-ink transition-colors">
            ← {t("common.back")}
          </Link>
          <LanguageToggle />
        </div>
        <p className="text-tag uppercase tracking-[0.22em] text-gold font-semibold mb-3">
          {t("waitlist.eyebrow")}
        </p>
        <h1 className="font-display text-3xl text-ink leading-tight">
          {t("waitlist.title")}
        </h1>
        <p className="text-body-sm text-ink-2 mt-3 leading-relaxed">
          {t("waitlist.desc")}
        </p>

        {position !== null ? (
          <div className="mt-8 p-6 border border-paper-3 rounded-2xl bg-paper-2">
            <p className="text-tag uppercase tracking-[0.22em] text-ink-3 font-semibold">
              {t("waitlist.registered")}
            </p>
            <p className="font-value text-4xl text-ink mt-2">#{position}</p>
            <p className="text-label text-ink-3 mt-2">{t("waitlist.on_list")}</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-8 space-y-3">
            <input
              type="email"
              required
              placeholder={t("waitlist.email_placeholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 rounded border border-paper-3 bg-paper text-body-sm focus:border-ink focus:outline-none"
            />
            {error && <p className="text-label text-rust">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="btn-plant w-full justify-center disabled:opacity-50"
            >
              {submitting ? t("waitlist.submitting") : t("waitlist.btn_join")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
