import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { MarketingNav, MarketingFooter } from "@/components/layout/MarketingChrome";

export const Route = createFileRoute("/tarifs")({
  head: () => ({
    meta: [
      { title: "Tarifs — Seedow" },
      {
        name: "description",
        content:
          "Une tarification transparente. Seedow est gratuit pendant la bêta ouverte : aucune commission cachée, aucun vendeur.",
      },
    ],
  }),
  component: TarifsPage,
});

function TarifsPage() {
  const { t } = useTranslation();

  const FEATURES = [
    t("tarifs.features.simulation"),
    t("tarifs.features.ethi"),
    t("tarifs.features.certificat"),
    t("tarifs.features.cours"),
    t("tarifs.features.export"),
  ];

  return (
    <div className="apple-landing min-h-screen">
      <MarketingNav />

      <section className="px-6 pt-20 pb-16 md:pt-28">
        <div className="max-w-[820px] mx-auto text-center">
          <p className="apple-eyebrow" style={{ color: "var(--mint)" }}>
            {t("tarifs.eyebrow")}
          </p>
          <h1 className="apple-title mt-3">{t("tarifs.title")}</h1>
          <p className="apple-subtitle mx-auto max-w-[560px] mt-6">{t("tarifs.free_now")}</p>
          <p className="apple-subtitle mx-auto max-w-[560px] mt-4">{t("tarifs.future")}</p>
          <p className="apple-subtitle mx-auto max-w-[560px] mt-4">{t("tarifs.notice")}</p>
        </div>
      </section>

      <section className="px-6 pb-24">
        <div className="max-w-[440px] mx-auto">
          <div
            className="p-8 md:p-10"
            style={{
              background: "var(--paper-2)",
              border: "1px solid var(--paper-3)",
              borderRadius: 18,
            }}
          >
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="apple-title" style={{ fontSize: "clamp(24px, 3vw, 32px)" }}>
                {t("tarifs.table_title")}
              </h2>
              <span className="font-mono text-body-lg" style={{ color: "var(--mint)" }}>
                0 €
              </span>
            </div>

            <ul className="mt-8 flex flex-col gap-4">
              {FEATURES.map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-body-lg">
                  <CheckIcon />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <Link
              to="/onboarding"
              className="apple-btn-primary w-full mt-10"
              style={{ width: "100%" }}
            >
              {t("tarifs.cta")}
            </Link>
          </div>

          <p className="text-center text-body-sm text-[color:var(--apple-text-2)] mt-8">
            {t("tarifs.faq_prefix")}{" "}
            <Link to="/aide" className="apple-link text-body-sm">
              {t("tarifs.faq_link")}
            </Link>
          </p>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}

/** Coche mint — le label texte porte l'information, la couleur ne fait que la doubler (a11y). */
function CheckIcon() {
  return (
    <span
      aria-hidden
      className="inline-flex items-center justify-center flex-shrink-0"
      style={{ width: 22, height: 22, borderRadius: 100, background: "var(--mint)" }}
    >
      <svg
        viewBox="0 0 24 24"
        width={13}
        height={13}
        fill="none"
        stroke="#ffffff"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20 6 9 17l-5-5" />
      </svg>
    </span>
  );
}
