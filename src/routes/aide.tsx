import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { ReactNode } from "react";
import { Mail, Plus } from "lucide-react";
import { PageHero, PublicPage } from "@/components/layout/PublicPage";
import { RevealGroup } from "@/components/motion/Reveal";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/aide")({
  head: () => ({
    meta: [
      { title: "Centre d'aide — Seedow" },
      {
        name: "description",
        content:
          "Les réponses aux questions les plus fréquentes sur Seedow, en français simple : simulation, gratuité, données, Ethi.",
      },
    ],
  }),
  component: AidePage,
});

function AidePage() {
  const { t } = useTranslation();

  // Chaque réponse est un ReactNode : la plupart sont du texte simple, quelques-unes
  // portent un lien contextuel (réglages, méthodologie).
  const FAQ: { q: string; a: ReactNode }[] = [
    { q: t("aide.q1_q"), a: t("aide.q1_a") },
    { q: t("aide.q2_q"), a: t("aide.q2_a") },
    { q: t("aide.q3_q"), a: t("aide.q3_a") },
    {
      q: t("aide.q4_q"),
      a: (
        <>
          {t("aide.q4_a")}{" "}
          <Link to="/reglages" className="link-u font-bold text-mint-ink">
            {t("aide.q4_a_link")} <span aria-hidden>›</span>
          </Link>
        </>
      ),
    },
    { q: t("aide.q5_q"), a: t("aide.q5_a") },
    {
      q: t("aide.q6_q"),
      a: (
        <>
          {t("aide.q6_a")}{" "}
          <Link to="/methodologie" className="link-u font-bold text-mint-ink">
            {t("aide.q6_a_link")} <span aria-hidden>›</span>
          </Link>
        </>
      ),
    },
    {
      q: t("aide.q7_q"),
      a: (
        <>
          {t("aide.q7_a")}{" "}
          <Link to="/reglages" className="link-u font-bold text-mint-ink">
            {t("aide.q7_a_link")} <span aria-hidden>›</span>
          </Link>
        </>
      ),
    },
    {
      q: t("aide.q8_q"),
      a: (
        <>
          {t("aide.q8_a")}{" "}
          <a href="mailto:support@seedow.life" className="link-u font-bold text-mint-ink">
            support@seedow.life
          </a>
        </>
      ),
    },
  ];

  return (
    <PublicPage accent="ice">
      <PageHero eyebrow={t("aide.eyebrow")} title={t("aide.title")} subtitle={t("aide.subtitle")} />

      <section className="px-5 pb-10">
        <RevealGroup className="mx-auto flex max-w-[760px] flex-col gap-3">
          {FAQ.map((item, i) => (
            <FaqItem key={i} question={item.q} answer={item.a} />
          ))}
        </RevealGroup>
      </section>

      <section className="px-5 pb-8">
        <div className="tile-accent mx-auto flex max-w-[760px] flex-col items-center gap-4 px-6 py-8 text-center sm:flex-row sm:text-left">
          <span className="icon-badge">
            <Mail aria-hidden />
          </span>
          <p className="flex-1 text-body-lg text-ink">{t("aide.contact_prefix")}</p>
          <Button asChild variant="outline">
            <a href="mailto:support@seedow.life">{t("aide.contact_link")}</a>
          </Button>
        </div>
      </section>
    </PublicPage>
  );
}

/**
 * Accordéon accessible bâti sur `<details>/<summary>` natif : ouverture au
 * clavier et au clic sans dépendance. DA V4 : la carte se soulève au survol,
 * le « + » pivote en « × », et la réponse monte à l'ouverture (`.faq`).
 */
function FaqItem({ question, answer }: { question: string; answer: ReactNode }) {
  return (
    <details className="faq paper-card group overflow-hidden">
      <summary className="flex min-h-[64px] cursor-pointer list-none items-center justify-between gap-4 px-6 py-4 text-body-lg font-bold text-ink outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-mint [&::-webkit-details-marker]:hidden">
        <span>{question}</span>
        <span
          aria-hidden
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-paper-2 text-ink-2 transition-[transform,background-color,color] duration-300 ease-brand group-open:rotate-45 group-open:bg-ink group-open:text-paper group-hover:bg-paper-inset motion-reduce:transition-none"
        >
          <Plus className="size-4" strokeWidth={2.5} />
        </span>
      </summary>
      <div className="faq-body px-6 pb-6 text-body-lg leading-[1.6] text-ink-2">{answer}</div>
    </details>
  );
}
