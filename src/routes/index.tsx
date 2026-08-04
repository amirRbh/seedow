import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { EsgQuickCheck } from "@/components/landing/EsgQuickCheck";
import { LandingCourses } from "@/components/landing/LandingCourses";
import { KPIFigure } from "@/components/ui/KPIFigure";
import { trackAppEvent } from "@/lib/analytics/appEvents";

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


  const STATS: { figure: string; text: string; src: string; color?: string; grad?: boolean }[] = [
    {
      figure: "0%",
      color: "var(--apple-text)",
      text: t("landing.stats.visibility"),
      src: t("landing.stats.visibility_src"),
    },
    {
      figure: "∞",
      color: "var(--apple-text)",
      text: t("landing.stats.jargon"),
      src: t("landing.stats.jargon_src"),
    },
    {
      figure: "1",
      grad: true,
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
        <div className="max-w-[1024px] mx-auto px-6 h-12 flex items-center justify-between">
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

      {/* HERO — DA « synthèse » : auras de marque + dégradé mint→ice */}
      <section className="relative overflow-hidden px-6 pt-20 pb-24 md:pt-24 md:pb-28">
        <div aria-hidden className="apple-aura apple-aura--mint" />
        <div aria-hidden className="apple-aura apple-aura--ice" />

        <div className="relative z-10 max-w-6xl mx-auto flex flex-col items-center text-center">
          {/* Badge marque avec point live */}
          <span className="apple-badge">
            <span aria-hidden className="apple-live" />
            {t("landing.hero.trust_certified")} · {t("landing.hero.trust_no_greenwashing")}
          </span>

          <h1 className="apple-title apple-title-lg mx-auto max-w-[900px] mt-7">
            {t("landing.hero.title_line1")}
            <br />
            {t("landing.hero.title_line2_pre")}
            <span className="apple-grad">{t("landing.hero.title_accent")}</span>
            {t("landing.hero.title_line2_post")}
          </h1>

          <p className="apple-subtitle mx-auto max-w-[620px] mt-6">{t("landing.hero.subtitle")}</p>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-4 mt-10">
            {isAuthed ? (
              <Link to="/dashboard" className="apple-btn-primary">
                {t("landing.hero.cta_authed")}
              </Link>
            ) : (
              <>
                <Link
                  to="/onboarding"
                  search={{ guest: true }}
                  onClick={onCta("hero", "preview")}
                  className="apple-btn-primary"
                >
                  {t("landing.hero.cta_guest")}
                </Link>
                <Link
                  to="/auth"
                  onClick={onCta("hero", "signup")}
                  className="apple-btn-secondary"
                >
                  {t("landing.hero.cta_new_account")}
                </Link>
              </>
            )}
          </div>
          {!isAuthed && (
            <p className="mt-4 text-body-sm text-[color:var(--apple-text-2)]">
              {t("landing.hero.trust_line")}
            </p>
          )}
        </div>
      </section>

      {/* SECTION — quick win : tester un fonds sans compte, la démo qui vend */}
      <EsgQuickCheck />

      {/* Cadre honnête : Seedow simule, n'investit pas — après la démonstration de valeur */}
      <div className="px-6 pb-4 -mt-6 flex justify-center">
        <p
          className="inline-flex items-center gap-2 px-4 py-2 text-body-sm text-[color:var(--apple-text-2)]"
          style={{
            background: "var(--paper-2)",
            border: "1px solid var(--paper-3)",
            borderRadius: 14,
          }}
        >
          <span
            aria-hidden
            className="inline-block w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: "var(--ice)" }}
          />
          {t("landing.badge_simulation")}
        </p>
      </div>

      {/* SECTION — problème / stats */}
      <section style={{ background: "var(--apple-surface)" }} className="px-6 py-24 md:py-32">
        <div className="max-w-[980px] mx-auto text-center">
          <h2 className="apple-title mx-auto max-w-[720px]">
            {t("landing.problem.title_line1")}
            <br />
            {t("landing.problem.title_line2")}
          </h2>
          <p className="apple-subtitle mx-auto max-w-[560px] mt-5">
            {t("landing.problem.subtitle")}
          </p>
          <div className="grid md:grid-cols-3 gap-12 md:gap-8 mt-20">
            {STATS.map((s, i) => (
              <div key={i} style={{ animationDelay: `${0.15 + i * 0.12}s` }}>
                <div
                  className={s.grad ? "apple-grad font-bold" : "font-bold"}
                  style={{
                    fontSize: "clamp(72px, 10vw, 120px)",
                    lineHeight: 0.9,
                    letterSpacing: "-0.05em",
                    color: s.grad ? undefined : s.color,
                  }}
                >
                  {s.figure}
                </div>
                <p className="mt-4 text-body-lg leading-[1.45] text-[color:var(--apple-text-2)] max-w-[240px] mx-auto">
                  {s.text}
                </p>
                <p className="apple-stat-src">{s.src}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* SECTION — comment ça marche (preuve produit, sobre) */}
      <section className="px-6 py-24 md:py-32">
        <div className="max-w-[980px] mx-auto">
          <div className="text-center">
            <p className="apple-eyebrow" style={{ color: "var(--mint)" }}>
              {t("landing.how.eyebrow")}
            </p>
            <h2 className="apple-title mx-auto max-w-[720px] mt-3">{t("landing.how.title")}</h2>
            <p className="apple-subtitle mx-auto max-w-[560px] mt-5">{t("landing.how.subtitle")}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-10 mt-16 text-left">
            {[
              {
                num: t("landing.how.step1_num"),
                title: t("landing.how.step1_title"),
                desc: t("landing.how.step1_desc"),
              },
              {
                num: t("landing.how.step2_num"),
                title: t("landing.how.step2_title"),
                desc: t("landing.how.step2_desc"),
              },
              {
                num: t("landing.how.step3_num"),
                title: t("landing.how.step3_title"),
                desc: t("landing.how.step3_desc"),
              },
            ].map((step) => (
              <div key={step.num}>
                <div
                  className="font-mono text-body-sm"
                  style={{ color: "var(--apple-text-2)", letterSpacing: "0.04em" }}
                >
                  {step.num}
                </div>
                <h3 className="mt-3 text-body-lg font-semibold text-[color:var(--apple-text)]">
                  {step.title}
                </h3>
                <p className="mt-2 text-body-sm leading-[1.5] text-[color:var(--apple-text-2)]">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Preuve produit — aperçu statique d'un composant réel de l'app, pas une image inventée */}
          <div className="mt-16">
            <p className="text-caption uppercase tracking-[0.18em] text-[color:var(--apple-text-2)] text-center mb-4">
              {t("landing.how.preview_label")}
            </p>
            <div
              className="mx-auto max-w-[560px] apple-card"
              style={{ border: "1px solid var(--paper-3)", padding: "20px 20px 26px" }}
              aria-hidden
            >
              <div className="grid grid-cols-2 gap-4">
                <KPIFigure
                  size="sm"
                  label={t("comparatif_panel.simulated_10y")}
                  value="24 180"
                  unit="€"
                  accent
                  hint={t("comparatif_panel.on_invested", { amount: "10 000" })}
                />
                <KPIFigure size="sm" label={t("comparatif_panel.impact_score")} value="74 / 100" />
              </div>
            </div>
          </div>

          {/* Méthodologie ouverte */}
          <div
            className="mt-16 mx-auto max-w-[720px] text-center apple-card apple-lift"
            style={{ border: "1px solid var(--paper-3)", padding: "32px 28px" }}
          >
            <h3 className="text-body-lg font-semibold text-[color:var(--apple-text)]">
              {t("landing.how.methodology_title")}
            </h3>
            <p className="mt-3 text-body-sm leading-[1.5] text-[color:var(--apple-text-2)] max-w-[520px] mx-auto">
              {t("landing.how.methodology_desc")}
            </p>
            <Link to="/methodologie" className="apple-link mt-5 inline-flex">
              {t("landing.how.methodology_cta")} <span aria-hidden>›</span>
            </Link>
          </div>
        </div>
      </section>

      {/* SECTION — apprendre d'abord, sans compte (rétention) */}
      <LandingCourses />

      {/* SECTION — Ethi (dark, style Apple) */}
      <section
        className="px-6 py-24 md:py-32"
        style={{ background: "var(--apple-dark)", color: "#ffffff" }}
      >
        <div className="max-w-[980px] mx-auto text-center">
          <p className="apple-eyebrow" style={{ color: "var(--volt)" }}>
            {t("landing.ethi.eyebrow")}
          </p>
          <h2 className="apple-title mx-auto max-w-[760px] mt-3" style={{ color: "#ffffff" }}>
            {t("landing.ethi.title_line1")}
            <br />
            {t("landing.ethi.title_line2")}
          </h2>
          <p className="apple-subtitle mx-auto max-w-[600px] mt-5" style={{ color: "#a1a1a6" }}>
            {t("landing.ethi.subtitle")}
          </p>

          {/* Chat mockup */}
          <p
            className="mt-14 text-body-sm font-mono"
            style={{ color: "#a1a1a6", letterSpacing: "0.02em" }}
          >
            {t("landing.ethi.example_label")}
          </p>
          <div className="mt-4 mx-auto max-w-[560px] flex flex-col gap-3 text-left">
            <ChatBubble side="user">{t("landing.ethi.chat_q1")}</ChatBubble>
            <ChatBubble side="ethi">{t("landing.ethi.chat_a1")}</ChatBubble>
            <ChatBubble side="user">{t("landing.ethi.chat_q2")}</ChatBubble>
            <ChatBubble side="ethi">{t("landing.ethi.chat_a2")}</ChatBubble>
          </div>
        </div>
      </section>


      {/* SECTION — deux façons de commencer */}
      <section style={{ background: "var(--apple-surface)" }} className="px-6 py-24 md:py-32">
        <div className="max-w-[980px] mx-auto">
          <div className="text-center mb-16">
            <h2 className="apple-title mx-auto max-w-[720px]">{t("landing.start.title")}</h2>
            <p className="apple-subtitle mx-auto max-w-[560px] mt-5">
              {t("landing.start.subtitle")}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <article
              className="apple-card apple-lift p-10 md:p-12 text-center flex flex-col items-center"
              style={{ border: "1px solid var(--paper-3)" }}
            >
              <p className="apple-eyebrow" style={{ color: "var(--ice)" }}>
                {t("landing.start.courses_eyebrow")}
              </p>
              <h3 className="apple-title mt-2" style={{ fontSize: "clamp(28px, 3.5vw, 40px)" }}>
                {t("landing.start.courses_title")}
              </h3>
              <p className="apple-subtitle mt-4 max-w-[380px]">{t("landing.start.courses_desc")}</p>
              <Link to="/cours" className="apple-link mt-8">
                {t("landing.start.courses_cta")} <span aria-hidden>›</span>
              </Link>
            </article>

            <article
              className="apple-card apple-lift p-10 md:p-12 text-center flex flex-col items-center"
              style={{ border: "1px solid var(--paper-3)" }}
            >
              <p className="apple-eyebrow" style={{ color: "var(--mint)" }}>
                {t("landing.start.space_eyebrow")}
              </p>
              <h3 className="apple-title mt-2" style={{ fontSize: "clamp(28px, 3.5vw, 40px)" }}>
                {t("landing.start.space_title")}
              </h3>
              <p className="apple-subtitle mt-4 max-w-[380px]">
                {isAuthed
                  ? t("landing.start.space_desc_authed")
                  : t("landing.start.space_desc_new")}
              </p>
              {isAuthed ? (
                <Link to="/dashboard" className="apple-btn-primary mt-8">
                  {t("landing.start.space_cta_authed")}
                </Link>
              ) : (
                <div className="flex flex-col items-center gap-3 mt-8">
                  <Link
                    to="/onboarding"
                    search={{ guest: true }}
                    onClick={onCta("start_section", "preview")}
                    className="apple-btn-primary"
                  >
                    {t("landing.start.space_cta_new")}
                  </Link>
                  <Link
                    to="/auth"
                    search={{ redirect: "/dashboard", mode: "login" }}
                    className="apple-link text-body"
                  >
                    {t("landing.start.already_registered")} <span aria-hidden>›</span>
                  </Link>
                </div>
              )}
            </article>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section id="cta" className="relative overflow-hidden px-6 py-28 md:py-36 text-center">
        <div
          aria-hidden
          className="apple-aura apple-aura--mint"
          style={{ top: "auto", bottom: -260 }}
        />
        <div className="relative z-10">
          <h2 className="apple-title apple-title-lg mx-auto max-w-[760px]">
            {t("landing.final.title_line1")}
            <br />
            <span className="apple-grad">{t("landing.final.title_accent")}</span>
          </h2>
          <p className="apple-subtitle mx-auto max-w-[520px] mt-6">
            {isAuthed ? t("landing.final.subtitle_authed") : t("landing.final.subtitle_new")}
          </p>
          <div className="mt-10 flex flex-col items-center gap-4">
            {isAuthed ? (
              <Link to="/dashboard" className="apple-btn-primary">
                {t("landing.hero.cta_authed")}
              </Link>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-center gap-4">
                  <Link
                    to="/onboarding"
                    search={{ guest: true }}
                    onClick={onCta("final", "preview")}
                    className="apple-btn-primary"
                  >
                    {t("landing.hero.cta_guest")}
                  </Link>
                  <Link
                    to="/auth"
                    onClick={onCta("final", "signup")}
                    className="apple-btn-secondary"
                  >
                    {t("landing.hero.cta_new_account")}
                  </Link>
                </div>
                <p className="text-body-sm text-[color:var(--apple-text-2)]">
                  {t("landing.hero.trust_line")}
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer
        className="px-6 py-10 text-label text-[color:var(--apple-text-2)]"
        style={{ background: "var(--apple-surface)", borderTop: "1px solid #d2d2d7" }}
      >
        <div className="max-w-[1024px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
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

