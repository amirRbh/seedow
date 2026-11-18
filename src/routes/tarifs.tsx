import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowRight, Check } from "lucide-react";
import { PageHero, PublicPage } from "@/components/layout/PublicPage";
import { Reveal, RevealGroup } from "@/components/motion/Reveal";
import { Tilt } from "@/components/motion/Tilt";
import { Button } from "@/components/ui/button";

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
    <PublicPage accent="mint">
      <PageHero
        eyebrow={t("tarifs.eyebrow")}
        title={t("tarifs.title")}
        subtitle={
          <>
            <p>{t("tarifs.free_now")}</p>
            <p className="mt-3">{t("tarifs.future")}</p>
          </>
        }
      />

      <section className="px-5 pb-8">
        <Reveal className="mx-auto max-w-[480px]">
          <Tilt max={3}>
            <div className="hero-card spot p-8 md:p-10">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="chip chip--verified">
                    <span aria-hidden className="live-dot" />
                    {t("landing.rv.hero.eyebrow")}
                  </span>
                  <h2 className="mt-4 text-[clamp(24px,3vw,32px)]">{t("tarifs.table_title")}</h2>
                </div>
                <p className="font-display text-[56px] font-extrabold leading-none tracking-[-0.04em] text-mint-ink">
                  0&nbsp;€
                </p>
              </div>

              <RevealGroup as="ul" className="mt-8 flex flex-col gap-4">
                {FEATURES.map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-body-lg text-ink">
                    <CheckIcon />
                    <span>{feature}</span>
                  </li>
                ))}
              </RevealGroup>

              <Button asChild size="lg" className="mt-10 w-full">
                <Link to="/onboarding" search={{ guest: true }}>
                  {t("tarifs.cta")}
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
            </div>
          </Tilt>

          {/* L'engagement tarifaire, écrit en clair sous la carte : aucune
              surprise, et un préavis daté (CLAUDE.md §1.5 — aucun dark pattern). */}
          <p className="tile-accent accent-solar mt-5 px-5 py-4 text-body leading-relaxed text-ink-2">
            {t("tarifs.notice")}
          </p>

          <p className="mt-8 text-center text-body text-ink-2">
            {t("tarifs.faq_prefix")}{" "}
            <Link to="/aide" className="link-u font-bold text-mint-ink">
              {t("tarifs.faq_link")}
            </Link>
          </p>
        </Reveal>
      </section>
    </PublicPage>
  );
}

/** Coche mint — le label texte porte l'information, la couleur ne fait que la doubler (a11y). */
function CheckIcon() {
  return (
    <span
      aria-hidden
      className="inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-mint text-paper"
    >
      <Check className="size-3.5" strokeWidth={3} />
    </span>
  );
}
