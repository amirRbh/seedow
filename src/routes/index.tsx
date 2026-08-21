import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { EsgQuickCheck } from "@/components/landing/EsgQuickCheck";
import { LandingCourses } from "@/components/landing/LandingCourses";
import { LandingTour } from "@/components/landing/LandingTour";
import { Provenance } from "@/components/ui/Provenance";
import { Button } from "@/components/ui/button";
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

/**
 * Landing — DA V3 (docs/DA-V3.md).
 *
 * La page alterne deux bandes qui se percutent : `--deep` pour le récit,
 * `--paper-2` pour le catalogue. C'est ce contraste qui fait toute la
 * profondeur — aucune ombre, aucun dégradé, aucun halo. Les cartes sont
 * blanches à 20px de rayon, les CTA des pills de 48px.
 *
 * La landing et l'app partagent les mêmes primitives (Button, .paper-card,
 * .chip, Provenance) : un seul design system, donc une seule marque.
 */
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

  const STATS: { figure: string; text: string; src: string }[] = [
    { figure: "0 %", text: t("landing.stats.visibility"), src: t("landing.stats.visibility_src") },
    { figure: "∞", text: t("landing.stats.jargon"), src: t("landing.stats.jargon_src") },
    { figure: "1", text: t("landing.stats.only_app"), src: t("landing.stats.only_app_src") },
  ];

  return (
    <div className="min-h-screen bg-paper-2 text-ink">
      {/* ── BANDE SOMBRE : nav + hero ─────────────────────────────── */}
      <div className="on-deep">
        <nav className="max-w-[1160px] mx-auto px-7 h-[76px] flex items-center justify-between">
          <Wordmark onDark />

          <div className="flex items-center gap-6">
            <Link
              to="/cours"
              className="hidden md:inline text-body font-semibold text-ink-2 hover:text-ink transition-colors"
            >
              {t("landing.nav.courses")}
            </Link>
            <Link
              to="/methodologie"
              className="hidden md:inline text-body font-semibold text-ink-2 hover:text-ink transition-colors"
            >
              {t("landing.nav.methodology")}
            </Link>
            {isAuthed ? (
              <Button asChild size="sm" variant="on-dark">
                <Link to="/le-fil">{t("landing.nav.my_space")}</Link>
              </Button>
            ) : (
              <>
                <Link
                  to="/auth"
                  search={{ redirect: "/le-fil", mode: "login" }}
                  onClick={onCta("nav", "login")}
                  className="hidden sm:inline text-body font-semibold text-ink-2 hover:text-ink transition-colors"
                >
                  {t("landing.nav.login")}
                </Link>
                <Button asChild size="sm" variant="on-dark">
                  <Link to="/onboarding" search={{ guest: true }} onClick={onCta("nav", "preview")}>
                    {t("landing.nav.simulate_cta")}
                  </Link>
                </Button>
              </>
            )}
          </div>
        </nav>

        <header className="max-w-[1160px] mx-auto px-7 pt-12 pb-24 md:pt-16 md:pb-28">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-14 lg:gap-16 items-center">
            <div>
              <span className="chip">
                <span aria-hidden className="live-dot" />
                {t("landing.rv.hero.eyebrow")}
              </span>

              <h1 className="display-xl mt-7 max-w-[13ch]">
                {t("landing.rv.hero.title_line1")}
                <br />
                {t("landing.rv.hero.title_accent")}
              </h1>

              <p className="mt-7 max-w-[46ch] text-body-xl leading-relaxed text-ink-2">
                {t("landing.rv.hero.subtitle")}
              </p>

              <div className="flex flex-wrap items-center gap-3 mt-10">
                {isAuthed ? (
                  <Button asChild variant="on-dark">
                    <Link to="/dashboard">{t("landing.rv.hero.cta_authed")}</Link>
                  </Button>
                ) : (
                  <>
                    <Button asChild variant="on-dark">
                      <Link
                        to="/onboarding"
                        search={{ guest: true }}
                        onClick={onCta("hero", "preview")}
                      >
                        {t("landing.rv.hero.cta_primary")}
                      </Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link to="/auth" onClick={onCta("hero", "signup")}>
                        {t("landing.rv.hero.cta_secondary")}
                      </Link>
                    </Button>
                  </>
                )}
              </div>

              <p className="mt-6 text-body-sm text-ink-3 max-w-[52ch]">
                {t("landing.rv.hero.note")}
              </p>
            </div>

            <HeroProof t={t} />
          </div>
        </header>
      </div>

      {/* ── CATALOGUE : bande claire ──────────────────────────────── */}
      <div className="max-w-[1160px] mx-auto px-7 py-20 md:py-24 flex flex-col gap-20 md:gap-24">
        {/* Preuves */}
        <Reveal>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ProofTile>
              <Trans i18nKey="landing.rv.proof.funds" components={{ b: <b /> }} />
            </ProofTile>
            <ProofTile>
              <Trans i18nKey="landing.rv.proof.sources" components={{ b: <b /> }} />
            </ProofTile>
            <ProofTile>
              <Trans i18nKey="landing.rv.proof.no_advice" components={{ b: <b /> }} />
            </ProofTile>
            <ProofTile>
              <Trans i18nKey="landing.rv.proof.free" components={{ b: <b /> }} />
            </ProofTile>
          </div>
        </Reveal>

        {/* Parcours */}
        {isAuthed ? null : (
          <Reveal>
            <h2 className="max-w-[16ch]">{t("landing.paths.heading")}</h2>
            <div className="grid md:grid-cols-3 gap-4 mt-10">
              <PathCard
                eyebrow={t("landing.paths.beginner_eyebrow")}
                title={t("landing.paths.beginner_title")}
                desc={t("landing.paths.beginner_desc")}
                cta={t("landing.paths.beginner_cta")}
                tone="mint"
                to="/onboarding"
                search={{ guest: true }}
                onClick={onCta("path_beginner", "preview")}
              />
              <PathCard
                eyebrow={t("landing.paths.learn_eyebrow")}
                title={t("landing.paths.learn_title")}
                desc={t("landing.paths.learn_desc")}
                cta={t("landing.paths.learn_cta")}
                tone="ice"
                to="/comprendre"
                onClick={onCta("path_learn", "preview")}
              />
              <PathCard
                eyebrow={t("landing.paths.investor_eyebrow")}
                title={t("landing.paths.investor_title")}
                desc={t("landing.paths.investor_desc")}
                cta={t("landing.paths.investor_cta")}
                tone="volt"
                to="/auth"
                search={{ redirect: "/portfolio", mode: "login" }}
                onClick={onCta("path_investor", "login")}
              />
            </div>
          </Reveal>
        )}

        {/* Simulateur */}
        <Section
          eyebrow={t("landing.rv.cards.simulate.eyebrow")}
          title={t("landing.rv.cards.simulate.title")}
          desc={t("landing.rv.cards.simulate.desc")}
          action={
            <Button asChild>
              <Link
                to="/onboarding"
                search={{ guest: true }}
                onClick={onCta("card_simulate", "preview")}
              >
                {t("landing.rv.cards.simulate.cta")}
              </Link>
            </Button>
          }
        >
          <LandingTour embedded />
        </Section>

        {/* Le constat — bande sombre encartée */}
        <Reveal>
          <div className="ink-section px-7 py-16 md:px-14 md:py-20">
            <p className="eyebrow">{t("landing.rv.cards.problem.eyebrow")}</p>
            <h2 className="mt-4 max-w-[20ch]">{t("landing.rv.cards.problem.title")}</h2>
            <p className="mt-5 max-w-[54ch] text-body-lg leading-relaxed text-ink-2">
              {t("landing.rv.cards.problem.desc")}
            </p>

            <div className="grid md:grid-cols-3 gap-10 md:gap-8 mt-14">
              {STATS.map((s) => (
                <div key={s.figure}>
                  <p className="font-value text-[clamp(48px,6vw,76px)] leading-none text-mint-ink">
                    {s.figure}
                  </p>
                  <p className="mt-4 text-body-lg leading-snug max-w-[26ch] text-ink-2">{s.text}</p>
                  <Provenance className="mt-4" source={s.src} status="verified" hideChip />
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        {/* Impact */}
        <Section
          eyebrow={t("landing.rv.cards.impact.eyebrow")}
          title={t("landing.rv.cards.impact.title")}
          desc={t("landing.rv.cards.impact.desc")}
          action={
            <Button asChild variant="link" className="px-0">
              <Link to="/methodologie">{t("landing.rv.cards.impact.cta")}</Link>
            </Button>
          }
          side
        >
          <ImpactProof t={t} />
        </Section>

        {/* Cours */}
        <Section
          eyebrow={t("landing.rv.cards.courses.eyebrow")}
          title={t("landing.rv.cards.courses.title")}
          desc={t("landing.rv.cards.courses.desc")}
        >
          <LandingCourses embedded />
        </Section>

        {/* Ethi */}
        <Section
          eyebrow={t("landing.rv.cards.ethi.eyebrow")}
          title={t("landing.rv.cards.ethi.title")}
          desc={t("landing.rv.cards.ethi.desc")}
          side
        >
          <div className="paper-card p-7">
            <p className="stamp">{t("landing.ethi.example_label")}</p>
            <div className="flex flex-col gap-4 mt-5">
              <Exchange who="user">{t("landing.ethi.chat_q1")}</Exchange>
              <Exchange who="ethi">{t("landing.ethi.chat_a1")}</Exchange>
              <Exchange who="user">{t("landing.ethi.chat_q2")}</Exchange>
              <Exchange who="ethi">{t("landing.ethi.chat_a2")}</Exchange>
            </div>
          </div>
        </Section>

        {/* Méthode */}
        <Section
          eyebrow={t("landing.rv.cards.method.eyebrow")}
          title={t("landing.rv.cards.method.title")}
          desc={t("landing.rv.cards.method.desc")}
          action={
            <Button asChild variant="link" className="px-0">
              <Link to="/methodologie">{t("landing.rv.cards.method.cta")}</Link>
            </Button>
          }
        >
          <EsgQuickCheck embedded />
        </Section>

        {/* CTA final */}
        <Reveal>
          <div className="ink-section px-7 py-20 md:py-24 text-center">
            <h2 className="mx-auto max-w-[18ch]">{t("landing.rv.final.title")}</h2>
            <p className="mt-5 mx-auto max-w-[44ch] text-body-lg text-ink-2">
              {isAuthed
                ? t("landing.rv.final.subtitle_authed")
                : t("landing.rv.final.subtitle_new")}
            </p>

            <div className="mt-10 flex flex-col items-center gap-4">
              {isAuthed ? (
                <Button asChild variant="on-dark">
                  <Link to="/dashboard">{t("landing.rv.hero.cta_authed")}</Link>
                </Button>
              ) : (
                <>
                  <Button asChild variant="on-dark">
                    <Link
                      to="/onboarding"
                      search={{ guest: true }}
                      onClick={onCta("final", "preview")}
                    >
                      {t("landing.rv.hero.cta_primary")}
                    </Link>
                  </Button>
                  <p className="text-body-sm text-ink-3">{t("landing.hero.trust_line")}</p>
                </>
              )}
            </div>

            <p className="mt-12 mx-auto max-w-[60ch] text-body-sm leading-relaxed text-ink-3">
              {t("landing.badge_simulation")}
            </p>
          </div>
        </Reveal>
      </div>

      {/* ── FOOTER ────────────────────────────────────────────────── */}
      <footer className="on-deep">
        <div className="max-w-[1160px] mx-auto px-7 py-14 flex flex-col md:flex-row md:items-start justify-between gap-10">
          <div>
            <Wordmark onDark />
            <p className="mt-4 text-body-sm text-ink-3">{t("landing.footer.copyright")}</p>
          </div>

          <nav className="grid grid-cols-2 sm:grid-cols-3 gap-x-12 gap-y-3">
            {[
              { to: "/cours", label: t("landing.footer.courses") },
              { to: "/methodologie", label: t("landing.footer.methodology") },
              { to: "/observatoire", label: t("landing.footer.observatory") },
              { to: "/tarifs", label: t("landing.footer.pricing") },
              { to: "/aide", label: t("landing.footer.help") },
              { to: "/mentions-legales", label: t("landing.footer.legal") },
              { to: "/confidentialite", label: t("landing.footer.privacy") },
              { to: "/cgu", label: t("landing.footer.terms") },
            ].map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="text-body-sm font-medium text-ink-2 hover:text-ink transition-colors"
              >
                {l.label}
              </Link>
            ))}
            {isAuthed ? (
              <Link
                to="/dashboard"
                className="text-body-sm font-medium text-ink-2 hover:text-ink transition-colors"
              >
                {t("landing.footer.my_space")}
              </Link>
            ) : (
              <Link
                to="/auth"
                search={{ redirect: "/le-fil", mode: "login" }}
                className="text-body-sm font-medium text-ink-2 hover:text-ink transition-colors"
              >
                {t("landing.footer.login")}
              </Link>
            )}
            <a
              href="mailto:hello@seedow.life"
              className="text-body-sm font-medium text-ink-2 hover:text-ink transition-colors"
            >
              {t("landing.footer.contact")}
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

/* ---------- Sous-composants ---------- */

function Wordmark({ onDark = false }: { onDark?: boolean }) {
  return (
    <Link
      to="/"
      className={`inline-flex items-baseline gap-1 text-[22px] font-extrabold tracking-[-0.03em] ${
        onDark ? "text-on-deep" : "text-ink"
      }`}
    >
      seedow
      <span aria-hidden className="text-mint">
        .
      </span>
    </Link>
  );
}

/** Apparition au scroll — un fondu de 8px, pas une cascade différée. */
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
      { rootMargin: "0px 0px -10% 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className={visible ? "reveal in-view" : "reveal"}>
      {children}
    </div>
  );
}

/** Section de catalogue : titre à gauche, démonstration à droite ou dessous. */
function Section({
  eyebrow,
  title,
  desc,
  action,
  side = false,
  children,
}: {
  eyebrow: string;
  title: string;
  desc?: string;
  action?: React.ReactNode;
  side?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <Reveal>
      <div className={side ? "grid lg:grid-cols-2 gap-12 lg:gap-16 items-center" : ""}>
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2 className="mt-3 max-w-[18ch]">{title}</h2>
          {desc && (
            <p className="mt-5 max-w-[52ch] text-body-lg leading-relaxed text-ink-2">{desc}</p>
          )}
          {action && <div className="mt-8">{action}</div>}
        </div>
        {children && <div className={side ? "" : "mt-10"}>{children}</div>}
      </div>
    </Reveal>
  );
}

function ProofTile({ children }: { children: React.ReactNode }) {
  // `h-full` + centrage : un <p> posé directement en grid item ne s'étirait
  // pas, d'où des tuiles de hauteurs inégales dès qu'un libellé passait sur
  // deux lignes.
  return (
    <div className="paper-card flex h-full items-center justify-center px-5 py-6">
      <p className="text-center text-body-sm leading-relaxed text-ink-2 [&_b]:text-ink [&_b]:font-bold">
        {children}
      </p>
    </div>
  );
}

function PathCard({
  eyebrow,
  title,
  desc,
  cta,
  to,
  search,
  onClick,
  tone,
}: {
  eyebrow: string;
  title: string;
  desc: string;
  cta: string;
  to: string;
  search?: Record<string, unknown>;
  onClick?: () => void;
  /** Chaque parcours porte sa couleur : elle DISTINGUE les trois entrées,
   *  elle n'est donc pas décorative. */
  tone: "mint" | "ice" | "volt";
}) {
  const chipTone = { mint: "chip--verified", ice: "chip--ice", volt: "chip--volt" }[tone];
  const linkTone = { mint: "text-mint-ink", ice: "text-ice-ink", volt: "text-volt-ink" }[tone];
  return (
    <Link
      to={to}
      search={search}
      onClick={onClick}
      className="paper-card group flex h-full flex-col p-7 outline-none transition-colors hover:bg-paper-inset focus-visible:ring-2 focus-visible:ring-ink"
    >
      <span className={`chip ${chipTone}`}>{eyebrow}</span>
      <h3 className="mt-4">{title}</h3>
      <p className="mt-2.5 text-body-sm leading-relaxed text-ink-2">{desc}</p>
      <span
        className={`mt-auto pt-6 text-body font-semibold ${linkTone} inline-flex items-center gap-1.5`}
      >
        {cta}
        <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
          →
        </span>
      </span>
    </Link>
  );
}

/**
 * Bloc de preuve du hero — un extrait de simulation avec son état de preuve.
 * Ce n'est pas une capture décorative : c'est la démonstration du titre.
 */
function HeroProof({ t }: { t: (key: string, opts?: Record<string, unknown>) => string }) {
  // Trois convictions, trois couleurs : la barre est le seul endroit du bloc
  // où la couleur porte une distinction. Tout en mint, elles se lisaient comme
  // une seule et même série.
  const convictions = [
    { label: t("landing.hero2.preview.conv_climate"), weight: 42, bar: "bg-mint" },
    { label: t("landing.hero2.preview.conv_biodiversity"), weight: 33, bar: "bg-ice" },
    { label: t("landing.hero2.preview.conv_social"), weight: 25, bar: "bg-volt" },
  ];

  return (
    <div className="paper-card p-7" aria-hidden>
      <div className="flex items-center justify-between gap-3">
        <p className="text-body font-semibold text-ink-2">{t("landing.hero2.preview.label")}</p>
        <span className="chip">{t("landing.hero2.preview.source")}</span>
      </div>

      <div className="mt-7 flex flex-col gap-4">
        {convictions.map((c, i) => (
          <div key={c.label}>
            <div className="flex items-baseline justify-between text-body">
              <span className="text-ink">{c.label}</span>
              <span className="font-value text-ink">{c.weight} %</span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-paper-2 overflow-hidden">
              <div
                className={`h-full rounded-full ${c.bar} trace`}
                style={{ width: `${c.weight}%`, animationDelay: `${0.15 + i * 0.08}s` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 pt-6 border-t border-paper-3 grid grid-cols-2 gap-6">
        <div>
          <p className="text-body-sm font-semibold text-ink-2">
            {t("landing.hero2.preview.kpi_esg")}
          </p>
          <p className="font-value text-[34px] leading-none mt-2 text-ink">74</p>
        </div>
        <div>
          <p className="text-body-sm font-semibold text-ink-2">
            {t("landing.hero2.preview.kpi_carbon")}
          </p>
          <p className="font-value text-[34px] leading-none mt-2 text-mint-ink">−58 %</p>
        </div>
      </div>

      <p className="mt-6 text-body-sm leading-relaxed text-ink-3">
        {t("landing.hero2.preview.note")}
      </p>
    </div>
  );
}

/** Preuve d'impact — un score, deux mesures, un état de preuve. */
function ImpactProof({ t }: { t: (key: string, opts?: Record<string, unknown>) => string }) {
  return (
    <div className="paper-card p-8">
      <p className="stamp">{t("comparatif_panel.impact_score")}</p>
      <p className="font-value text-[clamp(48px,7vw,68px)] leading-none mt-3 text-ink">
        74
        <span className="text-ink-3 text-[0.38em] ml-2">/ 100</span>
      </p>

      <div className="mt-8 pt-6 border-t border-paper-3 grid grid-cols-2 gap-6">
        <div>
          <p className="stamp">{t("landing.hero2.preview.kpi_carbon")}</p>
          <p className="font-value text-[28px] leading-none mt-2 text-mint-ink">−58 %</p>
        </div>
        <div>
          <p className="stamp">{t("comparatif_panel.simulated_10y")}</p>
          <p className="font-value text-[28px] leading-none mt-2 text-ink">24 180 €</p>
          <p className="mt-2 text-body-sm text-ink-3">
            {t("comparatif_panel.on_invested", { amount: "10 000" })}
          </p>
        </div>
      </div>

      <Provenance
        className="mt-6"
        status="modelled"
        source="MSCI ESG"
        note={t("landing.hero2.preview.note")}
      />
    </div>
  );
}

/** Échange avec Ethi — attribution nette, pas une bulle de messagerie. */
function Exchange({ who, children }: { who: "user" | "ethi"; children: React.ReactNode }) {
  const isUser = who === "user";
  return (
    <div>
      <p className="stamp">{isUser ? "—" : "Ethi"}</p>
      <p className={`mt-1 text-body-lg leading-relaxed ${isUser ? "text-ink-2" : "text-ink"}`}>
        {children}
      </p>
    </div>
  );
}
