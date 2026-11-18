import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowDown, ArrowRight, BookOpen, LineChart, Sprout, type LucideIcon } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { EthiDemo } from "@/components/landing/EthiDemo";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { LandingCourses } from "@/components/landing/LandingCourses";
import { ClaimVsData, MeasureScope } from "@/components/landing/LandingProof";
import { MoneyFlow } from "@/components/landing/MoneyFlow";
import { MoneyXray } from "@/components/landing/MoneyXray";
import { Aurora } from "@/components/motion/Aurora";
import { Magnetic } from "@/components/motion/Magnetic";
import { Marquee } from "@/components/motion/Marquee";
import { Reveal, RevealGroup } from "@/components/motion/Reveal";
import { ScrollProgress } from "@/components/motion/ScrollProgress";
import { SplitWords } from "@/components/motion/SplitWords";
import { wordCount } from "@/lib/motion";
import { Provenance } from "@/components/ui/Provenance";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/hooks/useLang";
import { getLandingFacts } from "@/lib/demo/demo.functions";
import { formatDate, formatNumber } from "@/lib/format";
import { trackAppEvent } from "@/lib/analytics/appEvents";
import { cn } from "@/lib/utils";
import { siteUrl, socialMeta } from "@/lib/seo/socialMeta";

export const Route = createFileRoute("/")({
  // Les trois faits du « constat » viennent de l'instantané émetteur ; sans
  // lui, la section les omet plutôt que d'afficher un chiffre non sourcé.
  loader: async () => ({ facts: await getLandingFacts().catch(() => null) }),
  head: () => ({
    meta: socialMeta({
      title: "Seedow — Votre argent façonne déjà le monde",
      description:
        "Seedow vous montre ce que votre argent finance vraiment. Investissement ESG, visualisé clairement, expliqué par une IA qui ne vous vend rien.",
      cardDescription: "Seedow vous montre ce que votre argent finance vraiment.",
      path: "/",
    }),
    links: [{ rel: "canonical", href: siteUrl("/") }],
  }),
  component: Landing,
});

const CONTAINER = "mx-auto max-w-[1160px] px-5 sm:px-7";

/**
 * Landing — DA V4 « Vivant » (docs/DA-V4.md).
 *
 * La page se lit comme une suite de SCÈNES, et chacune répond au geste :
 *
 *   1. le hero — le titre monte mot par mot sur une aurore, et la scène du flux
 *      est déjà jouable (on coche une conviction, l'argent se redirige) ;
 *   2. le bandeau de preuves, qui défile ;
 *   3. le rayon X — pour qui a un nom de fonds en tête ;
 *   4. « comment ça marche » — trois gestes racontés au défilement ;
 *   5. les trois portes d'entrée, le constat, le périmètre de mesure,
 *      l'Observatoire, les cours, Ethi, la méthode ;
 *   6. l'appel final et la signature de marque.
 *
 * Règles tenues de bout en bout : aucun chiffre fabriqué (les démonstrations
 * montrent des formes, pas des valeurs), l'illustration est écrite comme telle,
 * et tout le mouvement s'éteint en `prefers-reduced-motion`.
 */
function Landing() {
  const { t } = useTranslation();
  const { session, loading } = useAuth();
  const { lang } = useLang();
  const isAuthed = !loading && !!session;

  useEffect(() => {
    void trackAppEvent("landing_viewed");
  }, []);

  const onCta = (placement: string, destination: "preview" | "signup" | "login") => () => {
    void trackAppEvent("landing_cta_clicked", { placement, destination });
  };

  const { facts } = Route.useLoaderData();
  // Les anciens chiffres (« 0 % de visibilité », « ∞ de jargon », « seule app
  // qui relie ton portefeuille à son impact réel ») étaient affichés comme
  // VÉRIFIÉS sans source primaire — et le troisième promettait une mesure
  // d'impact que Seedow ne fait pas. Ils sont remplacés par trois faits lus
  // dans le document officiel d'un ETF Monde courant, avec émetteur et date.
  const factSource = facts
    ? t("landing.facts.source", {
        fund: facts.fundName,
        date: facts.asOf
          ? formatDate(facts.asOf, lang, { day: "numeric", month: "short", year: "numeric" })
          : "—",
      })
    : "";
  const STATS: { figure: string; text: string; src: string }[] = facts
    ? [
        facts.holdingsCount != null && {
          figure: formatNumber(facts.holdingsCount, lang, { maximumFractionDigits: 0 }),
          text: t("landing.facts.holdings"),
          src: factSource,
        },
        facts.usPct != null && {
          figure: `${formatNumber(facts.usPct, lang, { maximumFractionDigits: 0 })} %`,
          text: t("landing.facts.us"),
          src: factSource,
        },
        facts.energyPct != null && {
          figure: `${formatNumber(facts.energyPct, lang, { maximumFractionDigits: 1 })} %`,
          text: t("landing.facts.energy"),
          src: factSource,
        },
      ].filter((x): x is { figure: string; text: string; src: string } => !!x)
    : [];

  const titleLine1 = t("landing.flow.title_line1");

  return (
    <div className="min-h-screen text-ink">
      <ScrollProgress />
      <SiteHeader />

      {/* ── SCÈNE 1 : le hero ─────────────────────────────────────── */}
      <header className="relative overflow-hidden">
        <Aurora />

        <div className={cn(CONTAINER, "relative z-10 pt-[124px] text-center md:pt-[172px]")}>
          <span className="chip bg-paper shadow-card">
            <span aria-hidden className="live-dot" />
            {t("landing.rv.hero.eyebrow")}
          </span>

          {/* Le titre monte mot par mot (CSS pur : il est peint avant même
              l'hydratation). L'accent porte du TEXTE : dégradé entre trois
              encres d'accent, toutes AA (styles.css `.text-gradient`). */}
          <h1 className="display-xl mx-auto mt-7 max-w-[13ch]">
            <SplitWords text={titleLine1} />
            <br />
            <span className="word-mask">
              <span
                className="word-rise text-gradient"
                style={{ "--i": wordCount(titleLine1) } as React.CSSProperties}
              >
                {t("landing.flow.title_accent")}
              </span>
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-[54ch] text-body-lg leading-relaxed text-ink-2 md:mt-8 md:text-body-xl">
            {t("landing.flow.desc")}
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {isAuthed ? (
              <Magnetic>
                <Button asChild size="lg">
                  <Link to="/le-fil">
                    {t("landing.rv.hero.cta_authed")}
                    <ArrowRight aria-hidden />
                  </Link>
                </Button>
              </Magnetic>
            ) : (
              <Magnetic>
                <Button asChild size="lg">
                  <Link
                    to="/onboarding"
                    search={{ guest: true }}
                    onClick={onCta("flow", "preview")}
                  >
                    {t("landing.flow.cta")}
                    <ArrowRight aria-hidden />
                  </Link>
                </Button>
              </Magnetic>
            )}
            <Button asChild size="lg" variant="outline">
              <a href="#rayon-x">{t("landing.v5.hero_secondary")}</a>
            </Button>
          </div>

          {!isAuthed && (
            <p className="mt-5 text-body-sm text-ink-3">{t("landing.hero.no_account_note")}</p>
          )}
        </div>

        {/* La scène du flux : déjà jouable, sans compte. */}
        <div className="relative z-10 mx-auto mt-14 max-w-[1240px] px-3 pb-16 sm:px-5 md:mt-20 md:pb-24">
          <p className="mb-4 flex items-center justify-center gap-2 text-body-sm font-semibold text-ink-2">
            <ArrowDown aria-hidden className="size-4 animate-bounce motion-reduce:animate-none" />
            {t("landing.v5.try_hint")}
          </p>
          <MoneyFlow />
        </div>
      </header>

      {/* ── SCÈNE 2 : les preuves, en bandeau ─────────────────────── */}
      <Marquee
        label={t("landing.v5.proof_aria")}
        className="border-y border-paper-3 bg-paper py-5"
        duration={42}
      >
        {(["funds", "sources", "no_advice", "free"] as const).map((key) => (
          <span
            key={key}
            className="mx-7 inline-flex items-center gap-7 whitespace-nowrap text-body-lg text-ink-2 [&_b]:font-bold [&_b]:text-ink"
          >
            <span>
              <Trans i18nKey={`landing.rv.proof.${key}`} components={{ b: <b /> }} />
            </span>
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-mint" />
          </span>
        ))}
      </Marquee>

      {/* ── SCÈNE 3 : le rayon X ──────────────────────────────────── */}
      <section id="rayon-x" className={cn(CONTAINER, "accent-ice scroll-mt-28 py-20 md:py-28")}>
        <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-start lg:gap-16">
          <Reveal>
            <span className="chip chip--accent">{t("landing.rv.hero.eyebrow_search")}</span>
            <h2 className="display-lg mt-5 max-w-[12ch]">
              {t("landing.rv.hero.title_line1")}
              <br />
              <span className="text-gradient">{t("landing.rv.hero.title_accent")}</span>
            </h2>
            <p className="mt-6 max-w-[46ch] text-body-lg leading-relaxed text-ink-2">
              {t("landing.rv.hero.subtitle")}
            </p>
            <p className="mt-6 max-w-[52ch] text-body-sm text-ink-3">{t("landing.rv.hero.note")}</p>
          </Reveal>
          <Reveal delay={120}>
            <MoneyXray variant="hero" />
          </Reveal>
        </div>
      </section>

      {/* ── SCÈNE 4 : comment ça marche ───────────────────────────── */}
      <section className={cn(CONTAINER, "py-12 md:py-20")}>
        <HowItWorks />
      </section>

      {/* ── Les trois portes d'entrée ─────────────────────────────── */}
      {isAuthed ? null : (
        <section className={cn(CONTAINER, "py-20 md:py-28")}>
          <Reveal>
            <h2 className="display-lg max-w-[14ch]">{t("landing.paths.heading")}</h2>
          </Reveal>
          <RevealGroup className="mt-10 grid gap-4 md:grid-cols-3">
            <PathCard
              icon={Sprout}
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
              icon={BookOpen}
              eyebrow={t("landing.paths.learn_eyebrow")}
              title={t("landing.paths.learn_title")}
              desc={t("landing.paths.learn_desc")}
              cta={t("landing.paths.learn_cta")}
              tone="volt"
              to="/comprendre"
              onClick={onCta("path_learn", "preview")}
            />
            <PathCard
              icon={LineChart}
              eyebrow={t("landing.paths.investor_eyebrow")}
              title={t("landing.paths.investor_title")}
              desc={t("landing.paths.investor_desc")}
              cta={t("landing.paths.investor_cta")}
              tone="ice"
              to="/auth"
              search={{ redirect: "/portfolio", mode: "login" }}
              onClick={onCta("path_investor", "login")}
            />
          </RevealGroup>
        </section>
      )}

      {/* ── Le constat — bande sombre ─────────────────────────────── */}
      <section className="mx-auto max-w-[1240px] px-3 sm:px-5">
        <Reveal>
          <div className="ink-section relative overflow-hidden px-7 py-16 md:px-16 md:py-24">
            <Aurora />
            <div className="relative z-10">
              <span className="chip">{t("landing.rv.cards.problem.eyebrow")}</span>
              <h2 className="display-lg mt-5 max-w-[18ch]">
                {t("landing.rv.cards.problem.title")}
              </h2>
              <p className="mt-6 max-w-[54ch] text-body-lg leading-relaxed text-ink-2">
                {t("landing.rv.cards.problem.desc")}
              </p>

              {STATS.length > 0 && (
                <RevealGroup className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
                  {STATS.map((s) => (
                    <div key={s.figure} className="border-t border-paper-3 pt-6">
                      <p className="font-display text-[clamp(56px,7vw,92px)] font-extrabold leading-none tracking-[-0.04em] text-mint-ink">
                        {s.figure}
                      </p>
                      <p className="mt-4 max-w-[26ch] text-body-lg leading-snug text-ink-2">
                        {s.text}
                      </p>
                      <Provenance className="mt-4" source={s.src} status="verified" hideChip />
                    </div>
                  ))}
                </RevealGroup>
              )}
              {STATS.length > 0 && (
                <Link
                  to="/demo"
                  className="link-u mt-10 inline-flex items-center gap-2 text-body font-bold text-on-deep"
                >
                  {t("landing.facts.cta")} <ArrowRight aria-hidden className="size-4" />
                </Link>
              )}
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── Ce que Seedow mesure — et ce qu'il ne mesure pas ──────── */}
      <Section
        eyebrow={t("landing.rv.cards.impact.eyebrow")}
        title={t("landing.rv.cards.impact.title")}
        desc={t("landing.rv.cards.impact.desc")}
        action={
          <Button asChild variant="outline">
            <Link to="/methodologie">
              {t("landing.rv.cards.impact.cta")}
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        }
      >
        <MeasureScope />
      </Section>

      {/* ── Observatoire — la promesse du fonds, face à ses données ── */}
      <Section
        eyebrow={t("landing.observatory.eyebrow")}
        title={t("landing.observatory.title")}
        desc={t("landing.observatory.desc")}
        action={
          <Button asChild>
            <Link to="/observatoire" onClick={onCta("card_observatory", "preview")}>
              {t("landing.observatory.cta")}
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        }
        accent="ice"
        side
      >
        <ClaimVsData />
      </Section>

      {/* ── Cours ─────────────────────────────────────────────────── */}
      <Section
        eyebrow={t("landing.rv.cards.courses.eyebrow")}
        title={t("landing.rv.cards.courses.title")}
        desc={t("landing.rv.cards.courses.desc")}
        accent="volt"
      >
        <LandingCourses embedded />
      </Section>

      {/* ── Ethi ──────────────────────────────────────────────────── */}
      <Section
        eyebrow={t("landing.rv.cards.ethi.eyebrow")}
        title={t("landing.rv.cards.ethi.title")}
        desc={t("landing.rv.cards.ethi.desc")}
        accent="mint"
        side
      >
        <EthiDemo />
      </Section>

      {/* ── Méthode ───────────────────────────────────────────────── */}
      <Section
        eyebrow={t("landing.rv.cards.method.eyebrow")}
        title={t("landing.rv.cards.method.title")}
        desc={t("landing.rv.cards.method.desc")}
        action={
          <Button asChild variant="outline">
            <Link to="/methodologie">
              {t("landing.rv.cards.method.cta")}
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        }
        accent="volt"
      />

      {/* ── Appel final ───────────────────────────────────────────── */}
      <section className="mx-auto mt-8 max-w-[1240px] px-3 sm:px-5">
        <Reveal>
          <div className="ink-section relative overflow-hidden px-7 py-20 text-center md:py-28">
            <Aurora />
            <div className="relative z-10">
              <h2 className="display-xl mx-auto max-w-[14ch]">{t("landing.rv.final.title")}</h2>
              <p className="mx-auto mt-6 max-w-[44ch] text-body-xl text-ink-2">
                {isAuthed
                  ? t("landing.rv.final.subtitle_authed")
                  : t("landing.rv.final.subtitle_new")}
              </p>

              <div className="mt-10 flex flex-col items-center gap-4">
                <Magnetic>
                  {isAuthed ? (
                    <Button asChild size="lg" variant="on-dark">
                      <Link to="/le-fil">
                        {t("landing.rv.hero.cta_authed")}
                        <ArrowRight aria-hidden />
                      </Link>
                    </Button>
                  ) : (
                    <Button asChild size="lg" variant="on-dark">
                      <Link
                        to="/onboarding"
                        search={{ guest: true }}
                        onClick={onCta("final", "preview")}
                      >
                        {t("landing.rv.hero.cta_primary")}
                        <ArrowRight aria-hidden />
                      </Link>
                    </Button>
                  )}
                </Magnetic>
                {!isAuthed && (
                  <p className="text-body-sm text-ink-3">{t("landing.hero.no_account_note")}</p>
                )}
              </div>

              <p className="mx-auto mt-12 max-w-[60ch] text-body-sm leading-relaxed text-ink-3">
                {t("landing.badge_simulation")}
              </p>
            </div>
          </div>
        </Reveal>
      </section>

      <SiteFooter />
    </div>
  );
}

/* ---------- Sous-composants ---------- */

/**
 * Section de catalogue : titre à gauche, démonstration à droite (`side`) ou
 * dessous. La couleur du libellé DISTINGUE les chapitres entre eux — jamais
 * seule porteuse d'information, le libellé est toujours écrit (CLAUDE.md §4).
 */
function Section({
  eyebrow,
  title,
  desc,
  action,
  side = false,
  accent = "mint",
  children,
}: {
  eyebrow: string;
  title: string;
  desc?: string;
  action?: React.ReactNode;
  side?: boolean;
  accent?: "mint" | "ice" | "volt";
  children?: React.ReactNode;
}) {
  return (
    <section className={cn(CONTAINER, `accent-${accent}`, "py-16 md:py-24")}>
      <div className={side ? "grid items-start gap-10 lg:grid-cols-2 lg:gap-16" : ""}>
        <Reveal>
          <span className="chip chip--accent">{eyebrow}</span>
          <h2 className="display-lg mt-5 max-w-[16ch]">{title}</h2>
          {desc && (
            <p className="mt-6 max-w-[52ch] text-body-lg leading-relaxed text-ink-2">{desc}</p>
          )}
          {action && <div className="mt-8">{action}</div>}
        </Reveal>
        {children && (
          <Reveal delay={side ? 120 : 0} className={side ? "" : "mt-10 md:mt-12"}>
            {children}
          </Reveal>
        )}
      </div>
    </section>
  );
}

function PathCard({
  icon: Icon,
  eyebrow,
  title,
  desc,
  cta,
  to,
  search,
  onClick,
  tone,
}: {
  icon: LucideIcon;
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
  return (
    <Link
      to={to}
      search={search}
      onClick={onClick}
      className={cn(
        `accent-${tone}`,
        "paper-card spot lift group flex h-full flex-col p-7 outline-none focus-visible:ring-2 focus-visible:ring-mint sm:p-8",
      )}
    >
      <span className="icon-badge transition-transform duration-500 ease-brand group-hover:-rotate-6 group-hover:scale-110 motion-reduce:transition-none">
        <Icon aria-hidden />
      </span>
      <p className="mt-6 text-body-sm font-bold text-section-accent-ink">{eyebrow}</p>
      <h3 className="mt-1.5 text-[clamp(20px,2.2vw,24px)]">{title}</h3>
      <p className="mt-3 text-body leading-relaxed text-ink-2">{desc}</p>
      <span className="mt-auto inline-flex items-center gap-2 pt-8 text-body font-bold text-section-accent-ink">
        {cta}
        <ArrowRight
          aria-hidden
          className="size-4 transition-transform duration-300 ease-brand group-hover:translate-x-1.5"
        />
      </span>
    </Link>
  );
}
