import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { KPIFigure } from "@/components/ui/KPIFigure";
import { trackAppEvent } from "@/lib/analytics/appEvents";

/**
 * Mini-visite guidée de la landing : « je comprends → je vois → je compare ».
 * Objectif : réduire l'abandon avant l'aperçu en montrant, en 3 clics et sans
 * compte, ce que l'utilisateur obtiendra réellement dans le simulateur.
 * Purement présentationnel — aucune donnée réelle n'est appelée ici, les
 * visuels reprennent la forme des écrans produit existants.
 */
const STEP_KEYS = ["understand", "see", "compare"] as const;
type StepKey = (typeof STEP_KEYS)[number];

/** `embedded` : rendu sans en-tête ni padding de section, pour être posé
 *  à l'intérieur d'une carte showcase qui porte déjà titre et accent. */
export function LandingTour({ embedded = false }: { embedded?: boolean } = {}) {
  const { t } = useTranslation();
  const [active, setActive] = useState<StepKey>("understand");

  const select = (key: StepKey) => {
    setActive(key);
    void trackAppEvent("landing_tour_step_viewed", { step: key });
  };

  return (
    <section className={embedded ? "accent-ice" : "accent-ice px-6 py-20 md:py-28"}>
      <div className={embedded ? "" : "max-w-[980px] mx-auto"}>
        {!embedded && (
          <div className="text-center">
            <p className="apple-eyebrow" style={{ color: "var(--section-accent)" }}>
              {t("landing.tour.eyebrow")}
            </p>
            <h2 className="apple-title mx-auto max-w-[720px] mt-3">{t("landing.tour.title")}</h2>
            <p className="apple-subtitle mx-auto max-w-[560px] mt-5">
              {t("landing.tour.subtitle")}
            </p>
          </div>
        )}


        {/* Sélecteur d'étapes — chaque étape est un état, pas une navigation */}
        <div
          role="tablist"
          aria-label={t("landing.tour.title")}
          className={embedded ? "grid md:grid-cols-3 gap-3" : "mt-12 grid md:grid-cols-3 gap-3"}
        >
          {STEP_KEYS.map((key, i) => {
            const isActive = key === active;
            return (
              <button
                key={key}
                role="tab"
                type="button"
                aria-selected={isActive}
                aria-controls={`tour-panel-${key}`}
                onClick={() => select(key)}
                className="text-left p-5 transition-colors"
                style={{
                  background: isActive ? "var(--apple-text)" : "var(--apple-bg)",
                  color: isActive ? "var(--apple-bg)" : "var(--apple-text)",
                  border: `1px solid ${isActive ? "var(--apple-text)" : "var(--paper-3)"}`,
                  borderRadius: 14,
                }}
              >
                <span
                  className="font-mono text-caption uppercase tracking-[0.16em]"
                  style={{ opacity: isActive ? 0.7 : 0.55 }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="mt-2 block text-body-lg font-semibold">
                  {t(`landing.tour.${key}.tab`)}
                </span>
                <span
                  className="mt-1 block text-body-sm leading-[1.45]"
                  style={{ opacity: isActive ? 0.75 : 0.6 }}
                >
                  {t(`landing.tour.${key}.tagline`)}
                </span>
              </button>
            );
          })}
        </div>

        {/* Panneau de l'étape active */}
        <div
          id={`tour-panel-${active}`}
          role="tabpanel"
          className="mt-6 apple-card grid md:grid-cols-2 gap-8 items-center"
          style={{ border: "1px solid var(--paper-3)", padding: "28px" }}
        >
          <div>
            <h3 className="text-body-lg font-semibold text-[color:var(--apple-text)]">
              {t(`landing.tour.${active}.title`)}
            </h3>
            <p className="mt-3 text-body-sm leading-[1.55] text-[color:var(--apple-text-2)]">
              {t(`landing.tour.${active}.desc`)}
            </p>
            <p className="mt-4 text-caption text-[color:var(--apple-text-2)]">
              {t(`landing.tour.${active}.note`)}
            </p>
          </div>

          <div aria-hidden>
            <TourVisual step={active} t={t} />
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/onboarding"
            search={{ guest: true }}
            onClick={() => {
              void trackAppEvent("landing_cta_clicked", {
                placement: "tour",
                destination: "preview",
                step: active,
              });
            }}
            className="apple-btn-primary"
          >
            {t("landing.tour.cta")}
          </Link>
          <p className="text-caption text-[color:var(--apple-text-2)]">
            {t("landing.tour.cta_note")}
          </p>
        </div>
      </div>
    </section>
  );
}

function TourVisual({
  step,
  t,
}: {
  step: StepKey;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  if (step === "understand") {
    return (
      <div
        className="p-5"
        style={{ background: "var(--apple-surface)", border: "1px solid var(--paper-3)", borderRadius: 14 }}
      >
        <p className="font-mono text-caption uppercase tracking-[0.16em] text-[color:var(--apple-text-2)]">
          {t("landing.tour.understand.visual_label")}
        </p>
        <div className="mt-4 flex flex-col gap-2">
          {["climate", "biodiversity", "human_rights"].map((c, i) => (
            <div
              key={c}
              className="flex items-center justify-between px-4 py-3 text-body-sm"
              style={{
                background: "var(--apple-bg)",
                border: `1px solid ${i === 0 ? "var(--section-accent)" : "var(--paper-3)"}`,
                borderRadius: 100,
                color: "var(--apple-text)",
              }}
            >
              {t(`landing.tour.understand.conviction_${i + 1}`)}
              <span
                className="font-mono text-caption"
                style={{ color: i === 0 ? "var(--section-accent)" : "var(--apple-text-2)" }}
              >
                {i === 0 ? "ON" : "OFF"}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (step === "see") {
    return (
      <div
        className="p-5"
        style={{ background: "var(--apple-surface)", border: "1px solid var(--paper-3)", borderRadius: 14 }}
      >
        <p className="font-mono text-caption uppercase tracking-[0.16em] text-[color:var(--apple-text-2)]">
          {t("landing.tour.see.visual_label")}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <KPIFigure size="sm" label={t("landing.tour.see.kpi_esg")} value="74 / 100" accent />
          <KPIFigure size="sm" label={t("landing.tour.see.kpi_carbon")} value="-38 %" />
        </div>
        <div className="mt-4 flex h-2 overflow-hidden" style={{ borderRadius: 100 }}>
          <span style={{ background: "var(--section-accent)", width: "46%" }} />
          <span style={{ background: "var(--volt)", width: "31%" }} />
          <span style={{ background: "var(--paper-3)", width: "23%" }} />
        </div>
        <p className="mt-3 text-caption text-[color:var(--apple-text-2)]">
          {t("landing.tour.see.visual_note")}
        </p>
      </div>
    );
  }

  return (
    <div
      className="p-5"
      style={{ background: "var(--apple-surface)", border: "1px solid var(--paper-3)", borderRadius: 14 }}
    >
      <p className="font-mono text-caption uppercase tracking-[0.16em] text-[color:var(--apple-text-2)]">
        {t("landing.tour.compare.visual_label")}
      </p>
      <div className="mt-4 flex flex-col gap-3">
        {[
          { label: t("landing.tour.compare.row_seedow"), value: "24 180 €", width: "100%", mint: true },
          { label: t("landing.tour.compare.row_etf"), value: "23 940 €", width: "94%", mint: false },
        ].map((row) => (
          <div key={row.label}>
            <div className="flex items-baseline justify-between text-body-sm text-[color:var(--apple-text)]">
              <span>{row.label}</span>
              <span className="font-mono">{row.value}</span>
            </div>
            <div
              className="mt-2 h-2"
              style={{
                width: row.width,
                background: row.mint ? "var(--section-accent)" : "var(--paper-3)",
                borderRadius: 100,
              }}
            />
          </div>
        ))}
      </div>
      <p className="mt-4 text-caption text-[color:var(--apple-text-2)]">
        {t("landing.tour.compare.visual_note")}
      </p>
    </div>
  );
}
