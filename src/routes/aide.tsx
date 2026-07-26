import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { ReactNode } from "react";
import { MarketingNav, MarketingFooter } from "@/components/layout/MarketingChrome";

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
          <Link to="/reglages" className="apple-link text-body">
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
          <Link to="/methodologie" className="apple-link text-body">
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
          <Link to="/reglages" className="apple-link text-body">
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
          <a href="mailto:support@seedow.life" className="apple-link text-body">
            support@seedow.life
          </a>
        </>
      ),
    },
  ];

  return (
    <div className="apple-landing min-h-screen">
      <MarketingNav />

      <section className="px-6 pt-20 pb-12 md:pt-28">
        <div className="max-w-[720px] mx-auto text-center">
          <p className="apple-eyebrow" style={{ color: "var(--ice)" }}>
            {t("aide.eyebrow")}
          </p>
          <h1 className="apple-title mt-3">{t("aide.title")}</h1>
          <p className="apple-subtitle mx-auto max-w-[520px] mt-6">{t("aide.subtitle")}</p>
        </div>
      </section>

      <section className="px-6 pb-16">
        <div className="max-w-[720px] mx-auto flex flex-col gap-3">
          {FAQ.map((item, i) => (
            <FaqItem key={i} question={item.q} answer={item.a} />
          ))}
        </div>
      </section>

      <section className="px-6 pb-24">
        <p className="text-center text-body text-[color:var(--apple-text-2)]">
          {t("aide.contact_prefix")}{" "}
          <a href="mailto:support@seedow.life" className="apple-link text-body">
            {t("aide.contact_link")}
          </a>
        </p>
      </section>

      <MarketingFooter />
    </div>
  );
}

/**
 * Accordéon accessible bâti sur `<details>/<summary>` natif : ouverture au
 * clavier et au clic sans dépendance ni JS, radius 14, fond --paper-2.
 */
function FaqItem({ question, answer }: { question: string; answer: ReactNode }) {
  return (
    <details
      className="group overflow-hidden"
      style={{
        background: "var(--paper-2)",
        border: "1px solid var(--paper-3)",
        borderRadius: 14,
      }}
    >
      <summary className="flex items-center justify-between gap-4 cursor-pointer list-none px-5 py-4 text-body-lg font-semibold text-[color:var(--apple-text)] focus-visible:outline-2 focus-visible:outline-[color:var(--apple-text)]">
        <span>{question}</span>
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          width={18}
          height={18}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="flex-shrink-0 transition-transform duration-300 group-open:rotate-180"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>
      <div className="px-5 pb-5 -mt-1 text-body-lg leading-[1.55] text-[color:var(--apple-text-2)]">
        {answer}
      </div>
    </details>
  );
}
