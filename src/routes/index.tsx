import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { joinWaitlist, getWaitlistCount } from "@/lib/beta/beta.functions";

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

  const scrollToCta = () => {
    document.getElementById("cta")?.scrollIntoView({ behavior: "smooth" });
    setTimeout(() => document.getElementById("cta-email")?.focus(), 400);
  };

  const STATS: { figure: string; text: string; color: string }[] = [
    { figure: "0%", color: "var(--apple-text)", text: t("landing.stats.visibility") },
    { figure: "∞", color: "var(--apple-text)", text: t("landing.stats.jargon") },
    { figure: "1", color: "var(--mint)", text: t("landing.stats.only_app") },
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
              <Link
                to="/dashboard"
                className="apple-btn-primary"
                style={{ padding: "6px 14px", fontSize: 13 }}
              >
                {t("landing.nav.my_space")}
              </Link>
            ) : (
              <>
                <Link
                  to="/auth"
                  search={{ redirect: "/dashboard", mode: "login" }}
                  className="opacity-90 hover:opacity-100"
                >
                  {t("landing.nav.login")}
                </Link>
                <Link
                  to="/onboarding"
                  className="apple-btn-primary"
                  style={{ padding: "6px 14px", fontSize: 13 }}
                >
                  {t("landing.nav.simulate_cta")}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* HERO — Monolith */}
      <section className="relative overflow-hidden px-6 pt-24 pb-24 md:pt-32 md:pb-32">
        {/* Massive SEEDOW wordmark en fond */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-[10%] text-center select-none pointer-events-none whitespace-nowrap"
          style={{
            fontWeight: 900,
            fontSize: "22vw",
            lineHeight: 1,
            letterSpacing: "-0.06em",
            color: "#F5F5F7",
          }}
        >
          SEEDOW
        </div>

        {/* Glows statiques */}
        <div
          aria-hidden
          className="absolute pointer-events-none rounded-full"
          style={{
            width: 384,
            height: 384,
            bottom: "-10%",
            right: "-5%",
            background: "rgba(29,131,72,0.06)",
            filter: "blur(120px)",
          }}
        />
        <div
          aria-hidden
          className="absolute pointer-events-none rounded-full"
          style={{
            width: 384,
            height: 384,
            top: "-10%",
            left: "-5%",
            background: "rgba(0,113,227,0.06)",
            filter: "blur(120px)",
          }}
        />

        <div className="relative z-10 max-w-6xl mx-auto flex flex-col items-center text-center">
          {/* Barre mint accent */}
          <div
            aria-hidden
            className="mb-10 rounded-full"
            style={{ width: 48, height: 4, background: "var(--mint)" }}
          />

          <h1 className="apple-title apple-title-lg mx-auto max-w-[900px]">
            {t("landing.hero.title_line1")}
            <br />
            {t("landing.hero.title_line2_pre")}
            <span style={{ color: "var(--mint)" }}>{t("landing.hero.title_accent")}</span>
            {t("landing.hero.title_line2_post")}
          </h1>

          <p className="apple-subtitle mx-auto max-w-[620px] mt-6">{t("landing.hero.subtitle")}</p>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-4 mt-10">
            {isAuthed ? (
              <Link to="/dashboard" className="apple-btn-primary">
                {t("landing.hero.cta_authed")}
              </Link>
            ) : (
              <Link to="/onboarding" className="apple-btn-primary">
                {t("landing.hero.cta_new")}
              </Link>
            )}
            <Link to="/cours" className="apple-link">
              {t("landing.hero.see_courses")} <span aria-hidden>›</span>
            </Link>
          </div>
          {!isAuthed && (
            <p className="mt-4 text-body-sm text-[color:var(--apple-text-2)]">
              {t("landing.hero.no_account_note")}
            </p>
          )}

          {/* Trust line */}
          <div
            className="mt-16 flex items-center gap-4 text-caption font-bold uppercase text-[color:var(--apple-text-2)]"
            style={{ letterSpacing: "0.2em" }}
          >
            <span>{t("landing.hero.trust_certified")}</span>
            <span
              aria-hidden
              className="inline-block rounded-full"
              style={{ width: 4, height: 4, background: "#d2d2d7" }}
            />
            <span>{t("landing.hero.trust_no_greenwashing")}</span>
          </div>
        </div>
      </section>

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
                  className="font-semibold"
                  style={{
                    fontSize: "clamp(72px, 10vw, 120px)",
                    lineHeight: 0.9,
                    letterSpacing: "-0.05em",
                    color: s.color,
                  }}
                >
                  {s.figure}
                </div>
                <p className="mt-4 text-body-lg leading-[1.45] text-[color:var(--apple-text-2)] max-w-[240px] mx-auto">
                  {s.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION — voir ton impact */}
      <section className="px-6 py-24 md:py-32">
        <div className="max-w-[980px] mx-auto text-center">
          <p className="apple-eyebrow" style={{ color: "var(--mint)" }}>
            {t("landing.impact.eyebrow")}
          </p>
          <h2 className="apple-title mx-auto max-w-[720px] mt-3">{t("landing.impact.title")}</h2>
          <p className="apple-subtitle mx-auto max-w-[560px] mt-5">
            {t("landing.impact.subtitle")}
          </p>

          {/* Mockup visuel simplifié */}
          <div
            className="mt-16 mx-auto max-w-[820px] apple-card"
            style={{ background: "var(--apple-surface)", padding: "48px 32px" }}
          >
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3 items-end">
              {ALLOCATION.map((a, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div
                    className="w-full rounded-2xl"
                    style={{
                      height: `${40 + a.weight * 1.6}px`,
                      background: a.color,
                      animationDelay: `${0.1 + i * 0.08}s`,
                    }}
                  />
                  <div className="text-caption text-[color:var(--apple-text-2)]">{a.label}</div>
                  <div className="text-body-sm font-semibold text-[color:var(--apple-text)]">
                    {a.weight}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

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
          <div className="mt-16 mx-auto max-w-[560px] flex flex-col gap-3 text-left">
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
            <article className="apple-card p-10 md:p-12 text-center flex flex-col items-center">
              <p className="apple-eyebrow" style={{ color: "var(--ice)" }}>
                {t("landing.start.courses_eyebrow")}
              </p>
              <h3 className="apple-title mt-2" style={{ fontSize: "clamp(28px, 3.5vw, 40px)" }}>
                {t("landing.start.courses_title")}
              </h3>
              <p className="apple-subtitle mt-4 max-w-[380px]">
                {t("landing.start.courses_desc")}
              </p>
              <Link to="/cours" className="apple-link mt-8">
                {t("landing.start.courses_cta")} <span aria-hidden>›</span>
              </Link>
            </article>

            <article className="apple-card p-10 md:p-12 text-center flex flex-col items-center">
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
                  <Link to="/onboarding" className="apple-btn-primary">
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
      <section id="cta" className="px-6 py-28 md:py-36 text-center">
        <div>
          <h2 className="apple-title apple-title-lg mx-auto max-w-[760px]">
            {t("landing.final.title_line1")}
            <br />
            <span style={{ color: "var(--mint)" }}>{t("landing.final.title_accent")}</span>
          </h2>
          <p className="apple-subtitle mx-auto max-w-[520px] mt-6">
            {isAuthed ? t("landing.final.subtitle_authed") : t("landing.final.subtitle_new")}
          </p>
          {!isAuthed && (
            <div className="mt-10 flex flex-col items-center gap-4">
              <Link to="/onboarding" className="apple-btn-primary">
                {t("landing.final.cta")}
              </Link>
              <p className="text-body-sm text-[color:var(--apple-text-2)]">
                {t("landing.final.or_email")}
              </p>
            </div>
          )}
          <div className="mt-6">
            <CtaForm isAuthed={isAuthed} />
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

function CtaForm({ isAuthed }: { isAuthed: boolean | null }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [position, setPosition] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Compteur réel — jamais de chiffre inventé. `null` tant qu'on n'a pas la
  // vraie valeur, pour ne rien afficher plutôt que d'afficher un chiffre faux.
  const [waitlistCount, setWaitlistCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    getWaitlistCount()
      .then((res) => {
        if (!cancelled) setWaitlistCount(res.count);
      })
      .catch(() => {
        /* silencieux : pas de compteur plutôt qu'un compteur faux */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await joinWaitlist({ data: { email, source: "landing_cta" } });
      setPosition(res.position);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("landing.cta_form.generic_error"));
    } finally {
      setSubmitting(false);
    }
  };

  if (isAuthed) {
    return (
      <Link to="/dashboard" className="apple-btn-primary">
        {t("landing.hero.cta_authed")}
      </Link>
    );
  }

  return (
    <>
      <form
        onSubmit={onSubmit}
        className="flex flex-col sm:flex-row gap-3 max-w-[460px] mx-auto items-center justify-center"
      >
        <input
          id="cta-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("landing.cta_form.email_placeholder")}
          disabled={done}
          className="apple-input w-full sm:w-auto sm:flex-1"
        />
        <button
          type="submit"
          disabled={submitting || done}
          className="apple-btn-primary disabled:opacity-70"
        >
          {done
            ? t("landing.cta_form.done")
            : submitting
              ? t("landing.cta_form.submitting")
              : t("landing.cta_form.submit")}
        </button>
      </form>
      <div className="text-body-sm text-[color:var(--apple-text-2)] mt-5">
        {position !== null ? (
          <>
            <span className="font-semibold text-[color:var(--apple-text)]">#{position}</span>{" "}
            {t("landing.cta_form.position_suffix")}
          </>
        ) : waitlistCount !== null && waitlistCount > 0 ? (
          <>
            <span className="font-semibold text-[color:var(--apple-text)]">{waitlistCount}</span>{" "}
            {waitlistCount > 1
              ? t("landing.cta_form.count_plural")
              : t("landing.cta_form.count_singular")}{" "}
            · {t("landing.cta_form.places_limited")}
          </>
        ) : (
          <>
            {t("landing.cta_form.waitlist_default")} · {t("landing.cta_form.places_limited")}
          </>
        )}
      </div>
      {error && <p className="text-body-sm text-red-500 mt-3">{error}</p>}
    </>
  );
}

/* ---------- Content ---------- */

const ALLOCATION: { label: string; weight: number; color: string }[] = [
  { label: "ETF Monde", weight: 32, color: "#1d1d1f" },
  { label: "Clean Energy", weight: 22, color: "var(--mint)" },
  { label: "Green Bonds", weight: 18, color: "var(--ice)" },
  { label: "REIT ESG", weight: 12, color: "var(--volt)" },
  { label: "Corp Bonds", weight: 10, color: "#86868b" },
  { label: "Cash", weight: 6, color: "#d2d2d7" },
];
