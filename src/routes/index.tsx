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
 * Landing — DA V2 « Preuve » (docs/DA-V2-PREUVE.md).
 *
 * La page n'est plus une pile de cartes arrondies : c'est un DOSSIER. Des
 * chapitres numérotés, séparés par des filets, où chaque affirmation est
 * suivie de sa preuve (source · date · couverture) à la même échelle
 * typographique que l'affirmation elle-même (CLAUDE.md §1.2).
 *
 * Le système `.apple-*` de la V1 n'est plus utilisé ici : la landing et l'app
 * partagent désormais les mêmes primitives (Button, .sheet, .stamp,
 * Provenance) — un seul design system, donc une seule marque.
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
    <div className="min-h-screen bg-paper text-ink paper-grain">
      {/* ── NAV — filet, pas d'ombre, pas de flou ─────────────────── */}
      <nav className="sticky top-0 z-50 bg-paper border-b border-paper-3">
        <div className="max-w-[1080px] mx-auto px-6 h-14 flex items-center justify-between">
          <Wordmark />

          <div className="flex items-center gap-5">
            <Link to="/cours" className="hidden md:inline stamp hover:text-ink">
              {t("landing.nav.courses")}
            </Link>
            <Link to="/methodologie" className="hidden md:inline stamp hover:text-ink">
              {t("landing.nav.methodology")}
            </Link>
            {isAuthed ? (
              <Button asChild size="sm">
                <Link to="/le-fil">{t("landing.nav.my_space")}</Link>
              </Button>
            ) : (
              <>
                <Link
                  to="/auth"
                  search={{ redirect: "/le-fil", mode: "login" }}
                  onClick={onCta("nav", "login")}
                  className="stamp hover:text-ink"
                >
                  {t("landing.nav.login")}
                </Link>
                <Button asChild size="sm">
                  <Link to="/onboarding" search={{ guest: true }} onClick={onCta("nav", "preview")}>
                    {t("landing.nav.simulate_cta")}
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── HERO — l'affirmation, puis sa preuve, côte à côte ─────── */}
      <header className="max-w-[1080px] mx-auto px-6 pt-14 pb-16 md:pt-20 md:pb-20">
        <p className="stamp flex items-center gap-2">
          <span aria-hidden className="live-dot" />
          {t("landing.rv.hero.eyebrow")}
        </p>

        <div className="mt-8 grid lg:grid-cols-[1.15fr_0.85fr] gap-12 lg:gap-16 items-end">
          <div>
            <h1 className="display-xl max-w-[13ch]">
              {t("landing.rv.hero.title_line1")}
              <br />
              <span className="italic">{t("landing.rv.hero.title_accent")}</span>
            </h1>

            <div aria-hidden className="rule-chapter mt-8 max-w-[420px] trace" />

            <p className="mt-7 max-w-[46ch] text-body-xl leading-relaxed text-ink-2">
              {t("landing.rv.hero.subtitle")}
            </p>

            <div className="flex flex-wrap items-center gap-3 mt-9">
              {isAuthed ? (
                <Button asChild size="pill">
                  <Link to="/dashboard">{t("landing.rv.hero.cta_authed")}</Link>
                </Button>
              ) : (
                <>
                  <Button asChild size="pill">
                    <Link
                      to="/onboarding"
                      search={{ guest: true }}
                      onClick={onCta("hero", "preview")}
                    >
                      {t("landing.rv.hero.cta_primary")}
                    </Link>
                  </Button>
                  <Button asChild size="pill" variant="outline">
                    <Link to="/auth" onClick={onCta("hero", "signup")}>
                      {t("landing.rv.hero.cta_secondary")}
                    </Link>
                  </Button>
                </>
              )}
            </div>

            <p className="mt-5 text-body-sm text-ink-3 max-w-[52ch]">{t("landing.rv.hero.note")}</p>
          </div>

          <HeroProof t={t} />
        </div>
      </header>

      {/* ── REGISTRE DE PREUVES — une ligne de comptes, pas des pills ── */}
      <section className="border-y border-paper-3 bg-paper-2">
        <div className="max-w-[1080px] mx-auto px-6 grid grid-cols-2 md:grid-cols-4">
          <LedgerCell>
            <Trans i18nKey="landing.rv.proof.funds" components={{ b: <b /> }} />
          </LedgerCell>
          <LedgerCell>
            <Trans i18nKey="landing.rv.proof.sources" components={{ b: <b /> }} />
          </LedgerCell>
          <LedgerCell>
            <Trans i18nKey="landing.rv.proof.no_advice" components={{ b: <b /> }} />
          </LedgerCell>
          <LedgerCell last>
            <Trans i18nKey="landing.rv.proof.free" components={{ b: <b /> }} />
          </LedgerCell>
        </div>
      </section>

      {/* ── PARCOURS ──────────────────────────────────────────────── */}
      {isAuthed ? null : (
        <Chapter number="00" title={t("landing.paths.heading")}>
          <div className="grid md:grid-cols-3 border-t border-paper-3">
            <PathRow
              eyebrow={t("landing.paths.beginner_eyebrow")}
              title={t("landing.paths.beginner_title")}
              desc={t("landing.paths.beginner_desc")}
              cta={t("landing.paths.beginner_cta")}
              to="/onboarding"
              search={{ guest: true }}
              onClick={onCta("path_beginner", "preview")}
            />
            <PathRow
              eyebrow={t("landing.paths.learn_eyebrow")}
              title={t("landing.paths.learn_title")}
              desc={t("landing.paths.learn_desc")}
              cta={t("landing.paths.learn_cta")}
              to="/comprendre"
              onClick={onCta("path_learn", "preview")}
            />
            <PathRow
              eyebrow={t("landing.paths.investor_eyebrow")}
              title={t("landing.paths.investor_title")}
              desc={t("landing.paths.investor_desc")}
              cta={t("landing.paths.investor_cta")}
              to="/auth"
              search={{ redirect: "/portfolio", mode: "login" }}
              onClick={onCta("path_investor", "login")}
              last
            />
          </div>
        </Chapter>
      )}

      {/* ── 01 · SIMULATEUR ───────────────────────────────────────── */}
      <Chapter
        number="01"
        eyebrow={t("landing.rv.cards.simulate.eyebrow")}
        title={t("landing.rv.cards.simulate.title")}
        desc={t("landing.rv.cards.simulate.desc")}
        action={
          <Button asChild size="pill">
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
      </Chapter>

      {/* ── 02 · LE CONSTAT — pleine largeur encre ────────────────── */}
      <section className="max-w-[1080px] mx-auto px-6 py-6">
        <Reveal>
          <div className="ink-section px-6 py-14 md:px-14 md:py-20">
            <p className="stamp">02 — {t("landing.rv.cards.problem.eyebrow")}</p>
            <h2 className="mt-5 max-w-[20ch] text-paper">{t("landing.rv.cards.problem.title")}</h2>
            <p
              className="mt-5 max-w-[54ch] text-body-lg leading-relaxed"
              style={{ color: "#b4b1a8" }}
            >
              {t("landing.rv.cards.problem.desc")}
            </p>

            <div className="grid md:grid-cols-3 gap-10 md:gap-8 mt-14">
              {STATS.map((s) => (
                <div key={s.figure} className="border-t pt-5" style={{ borderColor: "#3a3833" }}>
                  <div
                    className="font-value text-paper"
                    style={{
                      fontSize: "clamp(52px, 7vw, 84px)",
                      lineHeight: 0.92,
                      letterSpacing: "-0.05em",
                    }}
                  >
                    {s.figure}
                  </div>
                  <p
                    className="mt-4 text-body-lg leading-snug max-w-[26ch]"
                    style={{ color: "#b4b1a8" }}
                  >
                    {s.text}
                  </p>
                  <Provenance className="mt-4" source={s.src} status="verified" />
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── 03 · IMPACT ───────────────────────────────────────────── */}
      <Chapter
        number="03"
        eyebrow={t("landing.rv.cards.impact.eyebrow")}
        title={t("landing.rv.cards.impact.title")}
        desc={t("landing.rv.cards.impact.desc")}
        action={
          <Button asChild variant="link" size="pill" className="px-0">
            <Link to="/methodologie">{t("landing.rv.cards.impact.cta")}</Link>
          </Button>
        }
        side
      >
        <ImpactProof t={t} />
      </Chapter>

      {/* ── 04 · COURS ────────────────────────────────────────────── */}
      <Chapter
        number="04"
        eyebrow={t("landing.rv.cards.courses.eyebrow")}
        title={t("landing.rv.cards.courses.title")}
        desc={t("landing.rv.cards.courses.desc")}
      >
        <LandingCourses embedded />
      </Chapter>

      {/* ── 05 · ETHI ─────────────────────────────────────────────── */}
      <Chapter
        number="05"
        eyebrow={t("landing.rv.cards.ethi.eyebrow")}
        title={t("landing.rv.cards.ethi.title")}
        desc={t("landing.rv.cards.ethi.desc")}
        side
      >
        <div>
          <p className="stamp mb-4">{t("landing.ethi.example_label")}</p>
          <div className="flex flex-col gap-4">
            <Exchange who="user">{t("landing.ethi.chat_q1")}</Exchange>
            <Exchange who="ethi">{t("landing.ethi.chat_a1")}</Exchange>
            <Exchange who="user">{t("landing.ethi.chat_q2")}</Exchange>
            <Exchange who="ethi">{t("landing.ethi.chat_a2")}</Exchange>
          </div>
        </div>
      </Chapter>

      {/* ── 06 · MÉTHODE ──────────────────────────────────────────── */}
      <Chapter
        number="06"
        eyebrow={t("landing.rv.cards.method.eyebrow")}
        title={t("landing.rv.cards.method.title")}
        desc={t("landing.rv.cards.method.desc")}
        action={
          <Button asChild variant="link" size="pill" className="px-0">
            <Link to="/methodologie">{t("landing.rv.cards.method.cta")}</Link>
          </Button>
        }
      >
        <EsgQuickCheck embedded />
      </Chapter>

      {/* ── CTA FINAL ─────────────────────────────────────────────── */}
      <section className="max-w-[1080px] mx-auto px-6 pt-6 pb-20">
        <Reveal>
          <div className="ink-section px-6 py-16 md:py-24 text-center">
            <h2 className="mx-auto max-w-[18ch] text-paper">{t("landing.rv.final.title")}</h2>
            <p className="mt-5 mx-auto max-w-[44ch] text-body-lg" style={{ color: "#b4b1a8" }}>
              {isAuthed
                ? t("landing.rv.final.subtitle_authed")
                : t("landing.rv.final.subtitle_new")}
            </p>

            <div className="mt-10 flex flex-col items-center gap-4">
              {isAuthed ? (
                <Button
                  asChild
                  size="pill"
                  className="border-paper bg-paper text-ink hover:bg-transparent hover:text-paper"
                >
                  <Link to="/dashboard">{t("landing.rv.hero.cta_authed")}</Link>
                </Button>
              ) : (
                <>
                  <Button
                    asChild
                    size="pill"
                    className="border-paper bg-paper text-ink hover:bg-transparent hover:text-paper"
                  >
                    <Link
                      to="/onboarding"
                      search={{ guest: true }}
                      onClick={onCta("final", "preview")}
                    >
                      {t("landing.rv.hero.cta_primary")}
                    </Link>
                  </Button>
                  <p className="stamp">{t("landing.hero.trust_line")}</p>
                </>
              )}
            </div>

            <p
              className="mt-12 mx-auto max-w-[60ch] text-body-sm leading-relaxed"
              style={{ color: "#9c998f" }}
            >
              {t("landing.badge_simulation")}
            </p>
          </div>
        </Reveal>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────── */}
      <footer className="border-t border-ink">
        <div className="max-w-[1080px] mx-auto px-6 py-10 flex flex-col md:flex-row md:items-start justify-between gap-8">
          <div>
            <Wordmark />
            <p className="stamp mt-3">{t("landing.footer.copyright")}</p>
          </div>

          <nav className="grid grid-cols-2 sm:grid-cols-3 gap-x-10 gap-y-2.5">
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
              <Link key={l.to} to={l.to} className="stamp hover:text-ink">
                {l.label}
              </Link>
            ))}
            {isAuthed ? (
              <Link to="/dashboard" className="stamp hover:text-ink">
                {t("landing.footer.my_space")}
              </Link>
            ) : (
              <Link
                to="/auth"
                search={{ redirect: "/le-fil", mode: "login" }}
                className="stamp hover:text-ink"
              >
                {t("landing.footer.login")}
              </Link>
            )}
            <a href="mailto:hello@seedow.life" className="stamp hover:text-ink">
              {t("landing.footer.contact")}
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

/* ---------- Sous-composants ---------- */

/** Marque : Fraunces + un carré d'encre (pas un rond — cf. §4.8). */
function Wordmark() {
  return (
    <Link to="/" className="inline-flex items-baseline gap-1.5 font-display text-[21px] text-ink">
      seedow
      <span aria-hidden className="inline-block w-[5px] h-[5px] bg-mint" />
    </Link>
  );
}

/** Apparition au scroll — un fondu de 6px, pas une cascade différée. */
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

/**
 * Chapitre — l'unité de composition de la page. Numéro en marge (mono),
 * filet d'ouverture, titre éditorial. Pas de boîte, pas d'ombre, pas de
 * rayon : c'est un document.
 */
function Chapter({
  number,
  eyebrow,
  title,
  desc,
  action,
  side = false,
  children,
}: {
  number: string;
  eyebrow?: string;
  title: string;
  desc?: string;
  action?: React.ReactNode;
  /** true = visuel à droite du texte ; false = visuel sous le texte. */
  side?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <section className="max-w-[1080px] mx-auto px-6 py-16 md:py-20 border-t border-paper-3">
      <Reveal>
        <div className={side ? "grid lg:grid-cols-2 gap-12 lg:gap-16 items-start" : ""}>
          <div className="flex gap-5 md:gap-8">
            <span aria-hidden className="stamp pt-2 shrink-0 tabular-nums">
              {number}
            </span>
            <div className="min-w-0">
              {eyebrow && <p className="stamp mb-3">{eyebrow}</p>}
              <h2 className="max-w-[18ch]">{title}</h2>
              {desc && (
                <p className="mt-5 max-w-[52ch] text-body-lg leading-relaxed text-ink-2">{desc}</p>
              )}
              {action && <div className="mt-8">{action}</div>}
            </div>
          </div>
          {children && (
            <div className={side ? "" : "mt-12 md:pl-[calc(1.25rem+2ch)]"}>{children}</div>
          )}
        </div>
      </Reveal>
    </section>
  );
}

/** Cellule du registre de preuves — filets verticaux, mono. */
function LedgerCell({ children, last = false }: { children: React.ReactNode; last?: boolean }) {
  return (
    <p
      className={`stamp normal-case tracking-[0.06em] leading-relaxed py-5 px-4 first:pl-0 ${
        last ? "" : "md:border-r border-paper-3"
      }`}
    >
      {children}
    </p>
  );
}

/** Ligne de parcours — toute la zone est cliquable (grande cible tactile). */
function PathRow({
  eyebrow,
  title,
  desc,
  cta,
  to,
  search,
  onClick,
  last = false,
}: {
  eyebrow: string;
  title: string;
  desc: string;
  cta: string;
  to: string;
  search?: Record<string, unknown>;
  onClick?: () => void;
  last?: boolean;
}) {
  return (
    <Link
      to={to}
      search={search}
      onClick={onClick}
      className={`group flex flex-col p-6 md:py-8 outline-none border-b md:border-b-0 border-paper-3 hover:bg-paper-2 focus-visible:ring-2 focus-visible:ring-ink ${
        last ? "" : "md:border-r"
      }`}
    >
      <span className="stamp">{eyebrow}</span>
      <h3 className="mt-3">{title}</h3>
      <p className="mt-2 text-body-sm leading-relaxed text-ink-2">{desc}</p>
      <span className="mt-auto pt-5 stamp text-ice-ink">
        {cta}
        <span aria-hidden className="ml-1">
          →
        </span>
      </span>
    </Link>
  );
}

/**
 * Bloc de preuve du hero — un extrait de simulation, avec ses chiffres en
 * chasse fixe et son attestation. Ce n'est pas une capture d'écran décorative :
 * c'est la démonstration de ce que promet le titre.
 */
function HeroProof({ t }: { t: (key: string, opts?: Record<string, unknown>) => string }) {
  const convictions = [
    { label: t("landing.hero2.preview.conv_climate"), weight: 42 },
    { label: t("landing.hero2.preview.conv_biodiversity"), weight: 33 },
    { label: t("landing.hero2.preview.conv_social"), weight: 25 },
  ];

  return (
    <div className="sheet pt-5" aria-hidden>
      <p className="stamp">{t("landing.hero2.preview.label")}</p>

      <div className="mt-6 flex flex-col gap-4">
        {convictions.map((c, i) => (
          <div key={c.label}>
            <div className="flex items-baseline justify-between text-body-sm">
              <span className="text-ink">{c.label}</span>
              <span className="font-value text-label text-ink-2">{c.weight} %</span>
            </div>
            <div className="mt-2 h-[3px] bg-paper-3">
              <div
                className="h-full bg-ink trace"
                style={{ width: `${c.weight}%`, animationDelay: `${0.15 + i * 0.08}s` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-7 pt-5 border-t border-paper-3 grid grid-cols-2 gap-6">
        <div>
          <p className="stamp">{t("landing.hero2.preview.kpi_esg")}</p>
          <p className="font-value text-[32px] leading-none mt-2 text-ink">74</p>
        </div>
        <div>
          <p className="stamp">{t("landing.hero2.preview.kpi_carbon")}</p>
          <p className="font-value text-[32px] leading-none mt-2 text-mint-ink">−58 %</p>
        </div>
      </div>

      <Provenance
        className="mt-5"
        status="modelled"
        source="MSCI ESG"
        note={t("landing.hero2.preview.note")}
      />
    </div>
  );
}

/** Preuve d'impact — trois mesures, une attestation. */
function ImpactProof({ t }: { t: (key: string, opts?: Record<string, unknown>) => string }) {
  return (
    <div className="sheet pt-5">
      <p className="stamp">{t("comparatif_panel.impact_score")}</p>
      <p className="font-value text-[clamp(48px,7vw,72px)] leading-none mt-3 text-ink">
        74
        <span className="text-ink-3 text-[0.4em] ml-1.5">/ 100</span>
      </p>

      <div className="mt-8 pt-5 border-t border-paper-3 grid grid-cols-2 gap-6">
        <div>
          <p className="stamp">{t("landing.hero2.preview.kpi_carbon")}</p>
          <p className="font-value text-[28px] leading-none mt-2 text-mint-ink">−58 %</p>
        </div>
        <div>
          <p className="stamp">{t("comparatif_panel.simulated_10y")}</p>
          <p className="font-value text-[28px] leading-none mt-2 text-ink">24 180 €</p>
          <p className="stamp mt-2 normal-case tracking-normal text-ink-3">
            {t("comparatif_panel.on_invested", { amount: "10 000" })}
          </p>
        </div>
      </div>

      <Provenance
        className="mt-5"
        status="modelled"
        source="MSCI ESG"
        note={t("landing.hero2.preview.note")}
      />
    </div>
  );
}

/**
 * Échange avec Ethi — cité comme un procès-verbal (filet + attribution),
 * pas comme une bulle de messagerie arrondie.
 */
function Exchange({ who, children }: { who: "user" | "ethi"; children: React.ReactNode }) {
  const isUser = who === "user";
  return (
    <div className={`border-l-2 pl-4 ${isUser ? "border-paper-3" : "border-ink"}`}>
      <p className="stamp">{isUser ? "—" : "ethi"}</p>
      <p
        className={`mt-1.5 text-body-lg leading-relaxed ${isUser ? "text-ink-2 italic" : "text-ink"}`}
      >
        {children}
      </p>
    </div>
  );
}
