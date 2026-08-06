import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { EsgQuickCheck } from "@/components/landing/EsgQuickCheck";
import { LandingCourses } from "@/components/landing/LandingCourses";
import { LandingTour } from "@/components/landing/LandingTour";
import { KPIFigure } from "@/components/ui/KPIFigure";
import { trackAppEvent } from "@/lib/analytics/appEvents";
import { useBetaCapacity } from "@/hooks/useBetaCapacity";

const SITE_URL = "https://seedow.life";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Seedow — Votre argent façonne déjà le monde" },
      {
        name: "description",
        content:
          "Seedow vous montre ce que votre argent finance vraiment. Investissement ESG, visualisé clairement, expliqué par une IA qui ne vous vend rien.",
      },
      { property: "og:title", content: "Seedow — Votre argent façonne déjà le monde" },
      {
        property: "og:description",
        content: "Seedow vous montre ce que votre argent finance vraiment.",
      },
      { property: "og:url", content: SITE_URL },
      { property: "og:type", content: "website" },
      { property: "og:image", content: `${SITE_URL}/og-seedow.jpg` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: `${SITE_URL}/og-seedow.jpg` },
    ],

    links: [{ rel: "canonical", href: SITE_URL }],
  }),
  component: Landing,
});

function Landing() {
  const { t } = useTranslation();
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);
  const { capacity } = useBetaCapacity();
  const betaLeft = capacity && capacity.status === "open" ? capacity.slotsLeft : null;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setIsAuthed(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setIsAuthed(!!session));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    void trackAppEvent("landing_viewed");
  }, []);

  const onCta = (placement: string, destination: "preview" | "signup" | "login") => () => {
    void trackAppEvent("landing_cta_clicked", { placement, destination });
  };

  const STATS: { figure: string; text: string; src: string }[] = [
    {
      figure: "0%",
      text: t("landing.stats.visibility"),
      src: t("landing.stats.visibility_src"),
    },
    {
      figure: "∞",
      text: t("landing.stats.jargon"),
      src: t("landing.stats.jargon_src"),
    },
    {
      figure: "1",
      text: t("landing.stats.only_app"),
      src: t("landing.stats.only_app_src"),
    },
  ];

  return (
    <div className="apple-landing min-h-screen">
      {/* NAV */}
      <nav
        className="sticky top-0 z-50 backdrop-blur-xl"
        style={{ background: "rgba(255,255,255,0.72)", borderBottom: "1px solid #d2d2d7" }}
      >
        <div className="max-w-[1100px] mx-auto px-6 h-12 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-[22px] font-bold text-[color:var(--apple-text)]"
            style={{ letterSpacing: "-0.02em" }}
          >
            SEEDOW
            <span
              aria-hidden
              className="inline-block w-[6px] h-[6px] rounded-full"
              style={{ background: "var(--mint)" }}
            />
          </Link>

          <div className="flex items-center gap-6 text-body-sm text-[color:var(--apple-text)]">
            <Link to="/cours" className="hidden md:inline opacity-90 hover:opacity-100">
              {t("landing.nav.courses")}
            </Link>
            <Link to="/methodologie" className="hidden md:inline opacity-90 hover:opacity-100">
              {t("landing.nav.methodology")}
            </Link>
            {isAuthed ? (
              <Link to="/dashboard" className="apple-btn-primary apple-btn-primary--sm">
                {t("landing.nav.my_space")}
              </Link>
            ) : (
              <>
                <Link
                  to="/auth"
                  search={{ redirect: "/dashboard", mode: "login" }}
                  onClick={onCta("nav", "login")}
                  className="opacity-90 hover:opacity-100"
                >
                  {t("landing.nav.login")}
                </Link>
                <Link
                  to="/onboarding"
                  search={{ guest: true }}
                  onClick={onCta("nav", "preview")}
                  className="apple-btn-primary apple-btn-primary--sm"
                >
                  {t("landing.nav.simulate_cta")}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* HERO — sombre, plein écran, un seul message */}
      <section className="rv-hero px-6 pt-20 pb-24 md:pt-28 md:pb-32">
        <div aria-hidden className="rv-hero-glow" />
        <div aria-hidden className="rv-hero-glow rv-hero-glow--ice" />

        <div className="relative z-10 max-w-[1100px] mx-auto grid lg:grid-cols-[1.05fr_0.95fr] gap-14 lg:gap-16 items-center">
          <div className="text-center lg:text-left flex flex-col items-center lg:items-start">
            <span
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 font-mono"
              style={{
                fontSize: 12,
                letterSpacing: "0.06em",
                color: "#e6e6ea",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.16)",
              }}
            >
              <span aria-hidden className="apple-live" />
              {t("landing.rv.hero.eyebrow")}
            </span>

            <h1 className="rv-section-title mt-7 max-w-[620px]">
              {t("landing.rv.hero.title_line1")}
              <br />
              <span style={{ color: "var(--mint)" }}>{t("landing.rv.hero.title_accent")}</span>
            </h1>

            <p className="apple-subtitle mt-6 max-w-[540px]">{t("landing.rv.hero.subtitle")}</p>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 mt-9">
              {isAuthed ? (
                <Link to="/dashboard" className="apple-btn-primary btn-on-ink">
                  {t("landing.rv.hero.cta_authed")}
                </Link>
              ) : (
                <>
                  <Link
                    to="/onboarding"
                    search={{ guest: true }}
                    onClick={onCta("hero", "preview")}
                    className="apple-btn-primary"
                    style={{ background: "var(--mint)", color: "#ffffff" }}
                  >
                    {t("landing.rv.hero.cta_primary")}
                  </Link>
                  <Link
                    to="/auth"
                    onClick={onCta("hero", "signup")}
                    className="apple-btn-secondary"
                    style={{
                      background: "rgba(255,255,255,0.10)",
                      color: "#ffffff",
                      border: "1px solid rgba(255,255,255,0.22)",
                    }}
                  >
                    {t("landing.rv.hero.cta_secondary")}
                  </Link>
                </>
              )}
            </div>

            <p className="mt-5 text-body-sm" style={{ color: "#a1a1a6" }}>
              {t("landing.rv.hero.note")}
            </p>
          </div>

          <HeroPreview t={t} />
        </div>
      </section>

      {/* BANDEAU PREUVE — chiffres réels et sourcés */}
      <section className="px-6 py-10 md:py-12">
        <Reveal>
          <div className="max-w-[1100px] mx-auto rv-proof">
            <span className="rv-proof-item">
              <Trans i18nKey="landing.rv.proof.funds" components={{ b: <b /> }} />
            </span>
            <span className="rv-proof-item">
              <Trans i18nKey="landing.rv.proof.sources" components={{ b: <b /> }} />
            </span>
            <span className="rv-proof-item">
              <Trans i18nKey="landing.rv.proof.no_advice" components={{ b: <b /> }} />
            </span>
            <span className="rv-proof-item">
              <Trans i18nKey="landing.rv.proof.free" components={{ b: <b /> }} />
            </span>
            {betaLeft !== null && (
              <span className="rv-proof-item">
                <span aria-hidden className="apple-live" />
                <Trans
                  i18nKey="landing.rv.proof.beta"
                  count={betaLeft}
                  components={{ b: <b /> }}
                />
              </span>
            )}
          </div>
        </Reveal>
      </section>

      {/* CARTES PRODUIT — enchaînement narratif façon fintech */}
      <div className="px-6 pb-6 flex flex-col gap-6 max-w-[1100px] mx-auto">
        {/* 1 · Simulateur (ice) */}
        <Reveal>
          <ShowcaseCard
            accent="accent-ice"
            eyebrow={t("landing.rv.cards.simulate.eyebrow")}
            title={t("landing.rv.cards.simulate.title")}
            desc={t("landing.rv.cards.simulate.desc")}
            action={
              <Link
                to="/onboarding"
                search={{ guest: true }}
                onClick={onCta("card_simulate", "preview")}
                className="apple-btn-primary mt-8"
              >
                {t("landing.rv.cards.simulate.cta")}
              </Link>
            }
            visual={<LandingTour />}
            stacked
          />
        </Reveal>

        {/* 2 · Impact (mint) */}
        <Reveal>
          <ShowcaseCard
            accent="accent-mint"
            eyebrow={t("landing.rv.cards.impact.eyebrow")}
            title={t("landing.rv.cards.impact.title")}
            desc={t("landing.rv.cards.impact.desc")}
            action={
              <Link to="/methodologie" className="apple-link mt-7">
                {t("landing.rv.cards.impact.cta")} <span aria-hidden>›</span>
              </Link>
            }
            visual={
              <div
                className="apple-card w-full"
                style={{ border: "1px solid var(--paper-3)", padding: "22px" }}
                aria-hidden
              >
                <div className="grid grid-cols-2 gap-5">
                  <KPIFigure
                    size="sm"
                    label={t("comparatif_panel.impact_score")}
                    value="74 / 100"
                    tone="mint"
                  />
                  <KPIFigure
                    size="sm"
                    label={t("landing.hero2.preview.kpi_carbon")}
                    value="−58 %"
                    tone="mint"
                  />
                  <KPIFigure
                    size="sm"
                    label={t("comparatif_panel.simulated_10y")}
                    value="24 180"
                    unit="€"
                    tone="ice"
                    hint={t("comparatif_panel.on_invested", { amount: "10 000" })}
                  />
                  <KPIFigure
                    size="sm"
                    label={t("landing.hero2.preview.kpi_esg")}
                    value="AA"
                    tone="mint"
                  />
                </div>
                <p className="mt-5 text-caption leading-[1.45] text-[color:var(--apple-text-2)]">
                  {t("landing.hero2.preview.note")}
                </p>
              </div>
            }
          />
        </Reveal>

        {/* 3 · Le constat (alert, fond ink) */}
        <Reveal>
          <section className="accent-alert rv-card rv-card--ink text-center">
            <p className="rv-card-eyebrow justify-center">
              <span aria-hidden className="rv-card-dot" />
              {t("landing.rv.cards.problem.eyebrow")}
            </p>
            <h2 className="rv-card-title mt-4 mx-auto max-w-[720px]">
              {t("landing.rv.cards.problem.title")}
            </h2>
            <p className="apple-subtitle mx-auto max-w-[560px] mt-5">
              {t("landing.rv.cards.problem.desc")}
            </p>

            <div className="grid md:grid-cols-3 gap-12 md:gap-8 mt-14">
              {STATS.map((s) => (
                <div key={s.figure}>
                  <div
                    className="font-bold"
                    style={{
                      fontSize: "clamp(60px, 8vw, 104px)",
                      lineHeight: 0.9,
                      letterSpacing: "-0.05em",
                      color: "var(--section-accent)",
                    }}
                  >
                    {s.figure}
                  </div>
                  <p
                    className="mt-4 text-body-lg leading-[1.45] max-w-[240px] mx-auto"
                    style={{ color: "#b8b8bf" }}
                  >
                    {s.text}
                  </p>
                  <p className="apple-stat-src" style={{ color: "#8e8e94" }}>
                    {s.src}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </Reveal>

        {/* 4 · Cours (volt) */}
        <Reveal>
          <ShowcaseCard
            accent="accent-volt"
            eyebrow={t("landing.rv.cards.courses.eyebrow")}
            title={t("landing.rv.cards.courses.title")}
            desc={t("landing.rv.cards.courses.desc")}
            visual={<LandingCourses />}
            stacked
          />
        </Reveal>

        {/* 5 · Ethi (ice, fond ink) */}
        <Reveal>
          <section className="accent-ice rv-card rv-card--ink">
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
              <div>
                <p className="rv-card-eyebrow">
                  <span aria-hidden className="rv-card-dot" />
                  {t("landing.rv.cards.ethi.eyebrow")}
                </p>
                <h2 className="rv-card-title mt-4">{t("landing.rv.cards.ethi.title")}</h2>
                <p className="apple-subtitle mt-5 max-w-[480px]">
                  {t("landing.rv.cards.ethi.desc")}
                </p>
                <p
                  className="mt-7 text-body-sm font-mono"
                  style={{ color: "#a1a1a6", letterSpacing: "0.02em" }}
                >
                  {t("landing.ethi.example_label")}
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <ChatBubble side="user">{t("landing.ethi.chat_q1")}</ChatBubble>
                <ChatBubble side="ethi">{t("landing.ethi.chat_a1")}</ChatBubble>
                <ChatBubble side="user">{t("landing.ethi.chat_q2")}</ChatBubble>
                <ChatBubble side="ethi">{t("landing.ethi.chat_a2")}</ChatBubble>
              </div>
            </div>
          </section>
        </Reveal>

        {/* 6 · Méthode ouverte + test ESG sans compte (solar) */}
        <Reveal>
          <ShowcaseCard
            accent="accent-solar"
            eyebrow={t("landing.rv.cards.method.eyebrow")}
            title={t("landing.rv.cards.method.title")}
            desc={t("landing.rv.cards.method.desc")}
            action={
              <Link to="/methodologie" className="apple-link mt-7">
                {t("landing.rv.cards.method.cta")} <span aria-hidden>›</span>
              </Link>
            }
            visual={<EsgQuickCheck />}
            stacked
          />
        </Reveal>
      </div>

      {/* CTA FINAL */}
      <section className="px-6 pt-10 pb-20">
        <Reveal>
          <div className="max-w-[1100px] mx-auto rv-card rv-card--ink text-center py-20 md:py-28">
            <h2 className="rv-section-title mx-auto max-w-[760px]">{t("landing.rv.final.title")}</h2>
            <p className="apple-subtitle mx-auto max-w-[520px] mt-5">
              {isAuthed ? t("landing.rv.final.subtitle_authed") : t("landing.rv.final.subtitle_new")}
            </p>

            <div className="mt-10 flex flex-col items-center gap-4">
              {isAuthed ? (
                <Link to="/dashboard" className="apple-btn-primary btn-on-ink">
                  {t("landing.rv.hero.cta_authed")}
                </Link>
              ) : (
                <>
                  <Link
                    to="/onboarding"
                    search={{ guest: true }}
                    onClick={onCta("final", "preview")}
                    className="apple-btn-primary"
                    style={{ background: "var(--mint)", color: "#ffffff" }}
                  >
                    {t("landing.rv.hero.cta_primary")}
                  </Link>
                  <p className="text-body-sm" style={{ color: "#a1a1a6" }}>
                    {t("landing.hero.trust_line")}
                  </p>
                </>
              )}
            </div>

            <p
              className="mt-10 mx-auto max-w-[560px] text-caption leading-[1.5]"
              style={{ color: "#8e8e94" }}
            >
              {t("landing.badge_simulation")}
            </p>
          </div>
        </Reveal>
      </section>

      {/* FOOTER */}
      <footer
        className="px-6 py-10 text-label text-[color:var(--apple-text-2)]"
        style={{ background: "var(--apple-surface)", borderTop: "1px solid #d2d2d7" }}
      >
        <div className="max-w-[1100px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className="inline-flex items-center gap-1.5 text-body-lg font-bold text-[color:var(--apple-text)]"
              style={{ letterSpacing: "-0.02em" }}
            >
              SEEDOW
              <span
                aria-hidden
                className="inline-block w-[5px] h-[5px] rounded-full"
                style={{ background: "var(--mint)" }}
              />
            </span>
            <span>{t("landing.footer.copyright")}</span>
          </div>

          <nav className="flex flex-wrap gap-x-6 gap-y-2">
            <Link to="/cours" className="hover:text-[color:var(--apple-text)]">
              {t("landing.footer.courses")}
            </Link>
            <Link to="/methodologie" className="hover:text-[color:var(--apple-text)]">
              {t("landing.footer.methodology")}
            </Link>
            <Link to="/tarifs" className="hover:text-[color:var(--apple-text)]">
              {t("landing.footer.pricing")}
            </Link>
            <Link to="/aide" className="hover:text-[color:var(--apple-text)]">
              {t("landing.footer.help")}
            </Link>
            {isAuthed ? (
              <Link to="/dashboard" className="hover:text-[color:var(--apple-text)]">
                {t("landing.footer.my_space")}
              </Link>
            ) : (
              <Link
                to="/auth"
                search={{ redirect: "/dashboard", mode: "login" }}
                className="hover:text-[color:var(--apple-text)]"
              >
                {t("landing.footer.login")}
              </Link>
            )}
            <Link to="/mentions-legales" className="hover:text-[color:var(--apple-text)]">
              {t("landing.footer.legal")}
            </Link>
            <Link to="/confidentialite" className="hover:text-[color:var(--apple-text)]">
              {t("landing.footer.privacy")}
            </Link>
            <Link to="/cgu" className="hover:text-[color:var(--apple-text)]">
              {t("landing.footer.terms")}
            </Link>
            <a href="mailto:hello@seedow.life" className="hover:text-[color:var(--apple-text)]">
              {t("landing.footer.contact")}
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

/* ---------- Sub-components ---------- */

/** Apparition au scroll — sobre (fade + 14px), neutralisée si reduced-motion. */
function Reveal({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className={visible ? "rv-reveal is-in" : "rv-reveal"}>
      {children}
    </div>
  );
}

function ShowcaseCard({
  accent,
  eyebrow,
  title,
  desc,
  action,
  visual,
  stacked = false,
}: {
  accent: string;
  eyebrow: string;
  title: string;
  desc: string;
  action?: React.ReactNode;
  visual: React.ReactNode;
  stacked?: boolean;
}) {
  return (
    <section className={`${accent} rv-card`}>
      <div className={stacked ? "" : "grid lg:grid-cols-2 gap-10 lg:gap-14 items-center"}>
        <div className={stacked ? "max-w-[680px]" : ""}>
          <p className="rv-card-eyebrow">
            <span aria-hidden className="rv-card-dot" />
            {eyebrow}
          </p>
          <h2 className="rv-card-title mt-4">{title}</h2>
          <p className="apple-subtitle mt-5 max-w-[520px]">{desc}</p>
          {action}
        </div>
        <div className={stacked ? "mt-10" : ""}>{visual}</div>
      </div>
    </section>
  );
}

function HeroPreview({ t }: { t: (key: string, opts?: Record<string, unknown>) => string }) {
  const convictions = [
    { label: t("landing.hero2.preview.conv_climate"), weight: 42, color: "var(--mint)" },
    { label: t("landing.hero2.preview.conv_biodiversity"), weight: 33, color: "var(--ice)" },
    { label: t("landing.hero2.preview.conv_social"), weight: 25, color: "var(--volt)" },
  ];

  return (
    <div
      className="apple-card w-full"
      style={{ border: "1px solid var(--paper-3)", padding: "22px 22px 26px" }}
      aria-hidden
    >
      <div className="flex items-center justify-between">
        <p className="text-caption font-mono uppercase tracking-[0.16em] text-[color:var(--apple-text-2)]">
          {t("landing.hero2.preview.label")}
        </p>
        <span className="text-caption font-mono text-[color:var(--apple-text-2)]">
          {t("landing.hero2.preview.source")}
        </span>
      </div>

      <div className="mt-5 flex flex-col gap-3">
        {convictions.map((c) => (
          <div key={c.label}>
            <div className="flex items-baseline justify-between text-body-sm text-[color:var(--apple-text)]">
              <span className="inline-flex items-center gap-2">
                <span
                  aria-hidden
                  className="inline-block w-[7px] h-[7px] rounded-full"
                  style={{ background: c.color }}
                />
                {c.label}
              </span>
              <span className="font-mono text-[color:var(--apple-text-2)]">{c.weight}%</span>
            </div>
            <div
              className="mt-1.5 h-[6px] rounded-full overflow-hidden"
              style={{ background: "var(--paper-3)" }}
            >
              <div
                className="h-full rounded-full"
                style={{ width: `${c.weight}%`, background: c.color }}
              />
            </div>
          </div>
        ))}
      </div>

      <div
        className="mt-6 pt-5 grid grid-cols-2 gap-4"
        style={{ borderTop: "1px solid var(--paper-3)" }}
      >
        <KPIFigure
          size="sm"
          label={t("landing.hero2.preview.kpi_esg")}
          value="74 / 100"
          tone="mint"
        />
        <KPIFigure
          size="sm"
          label={t("landing.hero2.preview.kpi_carbon")}
          value="−58 %"
          tone="ice"
        />
      </div>

      <p className="mt-4 text-caption leading-[1.45] text-[color:var(--apple-text-2)]">
        {t("landing.hero2.preview.note")}
      </p>
    </div>
  );
}

function ChatBubble({ side, children }: { side: "user" | "ethi"; children: React.ReactNode }) {
  const isUser = side === "user";
  return (
    <div className={isUser ? "self-end" : "self-start"} style={{ maxWidth: "85%" }}>
      <div
        className="text-body-lg leading-[1.4] px-5 py-3"
        style={{
          background: isUser ? "var(--mint)" : "var(--apple-dark-2)",
          color: "#ffffff",
          borderRadius: 22,
          marginLeft: isUser ? "auto" : 0,
        }}
      >
        {children}
      </div>
    </div>
  );
}
