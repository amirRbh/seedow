import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { LandingCourses } from "@/components/landing/LandingCourses";
import { MoneyXray } from "@/components/landing/MoneyXray";
import { Provenance } from "@/components/ui/Provenance";
import { Button } from "@/components/ui/button";
import { trackAppEvent } from "@/lib/analytics/appEvents";
import { cn } from "@/lib/utils";

const SITE_URL = "https://seedow.life";

/**
 * Coupure de chapitre du catalogue : un filet d'un pixel, et l'espace au-dessus.
 * Les sections s'enchaînaient sur le même aplat `--paper-2` séparées par du vide
 * seul : impossible de voir où une section s'arrêtait, ni quelle démonstration
 * appartenait à quel titre. Le filet fait la coupure, l'accent du libellé
 * identifie le chapitre.
 */
const SECTION_RULE = "section-rule pt-14 md:pt-16";

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
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-10 lg:gap-16 lg:items-start">
            <div className="contents lg:block">
              <div className="order-1">
                <span className="chip">
                  <span aria-hidden className="live-dot" />
                  {t("landing.rv.hero.eyebrow")}
                </span>

                <h1 className="display-xl mt-6 md:mt-7 max-w-[13ch]">
                  {t("landing.rv.hero.title_line1")}
                  <br />
                  {t("landing.rv.hero.title_accent")}
                </h1>

                <p className="mt-5 md:mt-7 max-w-[46ch] text-body-lg md:text-body-xl leading-relaxed text-ink-2">
                  {t("landing.rv.hero.subtitle")}
                </p>
              </div>

              {/* Le premier geste n'est plus un bouton : c'est le champ de
                  recherche à droite. Ces liens sont les portes SECONDAIRES —
                  pour qui n'a aucun nom de fonds en tête, ou revient. */}
              <div className="order-3 lg:order-none flex flex-wrap items-center gap-x-7 gap-y-3 mt-2 lg:mt-9">
                {isAuthed ? (
                  <Button asChild variant="on-dark">
                    <Link to="/le-fil">{t("landing.rv.hero.cta_authed")}</Link>
                  </Button>
                ) : (
                  <>
                    <Link
                      to="/onboarding"
                      search={{ guest: true }}
                      onClick={onCta("hero", "preview")}
                      className="text-body font-semibold text-on-deep underline underline-offset-4 hover:no-underline rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-on-deep"
                    >
                      {t("landing.rv.hero.cta_secondary_path")} <span aria-hidden>→</span>
                    </Link>
                    <Link
                      to="/auth"
                      search={{ redirect: "/le-fil", mode: "login" }}
                      onClick={onCta("hero", "login")}
                      className="text-body font-semibold text-ink-2 hover:text-ink transition-colors rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-on-deep"
                    >
                      {t("landing.nav.login")}
                    </Link>
                  </>
                )}
              </div>

              <p className="order-4 lg:order-none mt-4 lg:mt-6 text-body-sm text-ink-3 max-w-[52ch]">
                {t("landing.rv.hero.note")}
              </p>
            </div>

            {/* Le produit lui-même, pas une capture de produit. En mobile il
                remonte juste sous le sous-titre : le geste demandé doit être
                atteignable sans dérouler un écran et demi de discours. */}
            <div className="order-2 lg:order-none">
              <MoneyXray variant="hero" />
            </div>
          </div>
        </header>
      </div>

      {/* ── CATALOGUE : bande claire ──────────────────────────────── */}
      <div className="max-w-[1160px] mx-auto px-7 py-20 md:py-24 flex flex-col gap-16 md:gap-20">
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
          <Reveal className={`accent-mint ${SECTION_RULE}`}>
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

        {/* Ce que Seedow mesure — et ce qu'il ne mesure pas */}
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
          <MeasureScope t={t} />
        </Section>

        {/* Observatoire — la promesse du fonds, face à ses données */}
        <Section
          eyebrow={t("landing.observatory.eyebrow")}
          title={t("landing.observatory.title")}
          desc={t("landing.observatory.desc")}
          action={
            <Button asChild>
              <Link to="/observatoire" onClick={onCta("card_observatory", "preview")}>
                {t("landing.observatory.cta")}
              </Link>
            </Button>
          }
          accent="ice"
          side
        >
          <ClaimVsData t={t} />
        </Section>

        {/* Cours */}
        <Section
          eyebrow={t("landing.rv.cards.courses.eyebrow")}
          title={t("landing.rv.cards.courses.title")}
          desc={t("landing.rv.cards.courses.desc")}
          accent="volt"
        >
          <LandingCourses embedded />
        </Section>

        {/* Ethi */}
        <Section
          eyebrow={t("landing.rv.cards.ethi.eyebrow")}
          title={t("landing.rv.cards.ethi.title")}
          desc={t("landing.rv.cards.ethi.desc")}
          accent="ice"
          side
        >
          <div className="paper-card p-7">
            <p className="stamp">{t("landing.ethi.example_label")}</p>
            <div className="flex flex-col gap-5 mt-5">
              <Exchange label={t("landing.ethi.speaker_you")}>{t("landing.ethi.chat_q1")}</Exchange>
              <Exchange who="ethi" label="Ethi">
                {t("landing.ethi.chat_a1")}
              </Exchange>
              <Exchange label={t("landing.ethi.speaker_you")}>{t("landing.ethi.chat_q2")}</Exchange>
              <Exchange who="ethi" label="Ethi">
                {t("landing.ethi.chat_a2")}
              </Exchange>
            </div>
          </div>
        </Section>

        {/* Méthode — le rayon X vit maintenant dans le hero ; ici on ouvre
            seulement la grille de notation, ses poids et ses limites. */}
        <Section
          eyebrow={t("landing.rv.cards.method.eyebrow")}
          title={t("landing.rv.cards.method.title")}
          desc={t("landing.rv.cards.method.desc")}
          action={
            <Button asChild>
              <Link to="/methodologie">{t("landing.rv.cards.method.cta")}</Link>
            </Button>
          }
          accent="volt"
        />

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
                  <Link to="/le-fil">{t("landing.rv.hero.cta_authed")}</Link>
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
                to="/le-fil"
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
function Reveal({ className, children }: { className?: string; children: React.ReactNode }) {
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
    <div ref={ref} className={cn(visible ? "reveal in-view" : "reveal", className)}>
      {children}
    </div>
  );
}

/**
 * Section de catalogue : titre à gauche, démonstration à droite ou dessous.
 *
 * En `side`, les deux colonnes s'alignaient sur leur centre : une carte plus
 * haute que son texte partait chercher le titre de la section suivante. Elles
 * s'alignent maintenant par le haut, sous un filet qui ferme la section
 * précédente.
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
  /** Couleur du libellé : elle DISTINGUE les chapitres entre eux. Jamais seule
   *  porteuse d'information — le libellé est toujours écrit (CLAUDE.md §4). */
  accent?: "mint" | "ice" | "volt";
  children?: React.ReactNode;
}) {
  return (
    <Reveal className={`accent-${accent} ${SECTION_RULE}`}>
      <div className={side ? "grid lg:grid-cols-2 gap-10 lg:gap-16 items-start" : ""}>
        <div>
          <span className="chip chip--accent">{eyebrow}</span>
          <h2 className="mt-4 max-w-[18ch]">{title}</h2>
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
    <div className="paper-card lift flex h-full items-center justify-center px-5 py-6">
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
      className="paper-card lift group flex h-full flex-col p-7 outline-none hover:bg-paper-inset focus-visible:ring-2 focus-visible:ring-ink"
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
 * « Ce qu'on mesure, ce qu'on ne mesure pas ».
 *
 * Ce bloc remplace deux cartes qui affichaient des chiffres FABRIQUÉS : un
 * score de 74/100, une empreinte de −58 %, et une simulation « portefeuille
 * Seedow 24 180 € contre ETF monde 23 940 € » — dix ans de performance
 * comparée, entièrement inventés, sur la page d'accueil d'un produit dont
 * l'argument est la transparence. Aucune mention de simulation ne rattrape ça :
 * c'est exactement ce qu'un visiteur méfiant vient vérifier, et exactement ce
 * qu'il ne fallait pas faire.
 *
 * Il n'y avait pas de chiffre honnête à mettre à la place — un chiffre de
 * démonstration porte forcément sur un fonds, et le fonds, l'utilisateur le
 * choisit lui-même dans le rayon X du hero. Ce qui reste, et qui se démontre :
 * la LISTE de ce que Seedow mesure, et celle de ce qu'il ne prétend pas mesurer.
 * La seconde est la plus différenciante des deux.
 */
function MeasureScope({ t }: { t: (key: string) => string }) {
  const measured = [
    t("landing.measure.measured_1"),
    t("landing.measure.measured_2"),
    t("landing.measure.measured_3"),
    t("landing.measure.measured_4"),
  ];
  const notMeasured = [
    t("landing.measure.not_1"),
    t("landing.measure.not_2"),
    t("landing.measure.not_3"),
  ];

  return (
    <div className="paper-card p-7">
      <p className="stamp">{t("landing.measure.measured_label")}</p>
      <ul className="mt-3">
        {measured.map((line) => (
          <li key={line} className="py-2.5 border-b border-paper-3 text-body text-ink">
            {line}
          </li>
        ))}
      </ul>

      <p className="stamp mt-7">{t("landing.measure.not_label")}</p>
      <ul className="mt-3">
        {notMeasured.map((line) => (
          <li key={line} className="py-2.5 border-b border-paper-3 text-body text-ink-2">
            {line}
          </li>
        ))}
      </ul>

      <p className="mt-6 text-body-sm leading-relaxed text-ink-3">{t("landing.measure.note")}</p>
    </div>
  );
}

/**
 * « Ce que le fonds dit » / « ce que ses données montrent » — la forme de
 * l'Observatoire, réduite à sa mécanique.
 *
 * Aucune valeur n'est affichée ici : ce sont les LIBELLÉS des deux colonnes que
 * l'Observatoire remplit avec des fonds réels. Montrer un exemple chiffré
 * reviendrait à désigner un fonds nommément depuis la page d'accueil, sur des
 * chiffres que le visiteur ne peut pas encore vérifier — c'est l'Observatoire
 * qui fait ça, avec la source et la date à côté de chaque ligne.
 */
function ClaimVsData({ t }: { t: (key: string) => string }) {
  const rows = [
    { claim: t("landing.observatory.row_1_claim"), data: t("landing.observatory.row_1_data") },
    { claim: t("landing.observatory.row_2_claim"), data: t("landing.observatory.row_2_data") },
    { claim: t("landing.observatory.row_3_claim"), data: t("landing.observatory.row_3_data") },
  ];

  return (
    <div className="paper-card p-7">
      <div className="grid grid-cols-2 gap-x-5">
        <p className="stamp">{t("landing.observatory.col_claim")}</p>
        <p className="stamp">{t("landing.observatory.col_data")}</p>
      </div>
      <ul className="mt-3">
        {rows.map((r) => (
          <li key={r.claim} className="grid grid-cols-2 gap-x-5 py-3.5 border-b border-paper-3">
            <span className="text-body-sm leading-snug text-ink-2">« {r.claim} »</span>
            <span className="text-body-sm leading-snug text-ink font-medium">{r.data}</span>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-body-sm leading-relaxed text-ink-3">
        {t("landing.observatory.note")}
      </p>
    </div>
  );
}

/**
 * Échange avec Ethi — attribution nette, pas une bulle de messagerie.
 *
 * Les quatre tours s'enchaînaient sans séparation, et la question était signée
 * « — » : on ne voyait ni où finissait une réponse, ni qui parlait. La question
 * est posée dans un encart, la réponse porte le filet de marque, et le nom de
 * qui parle est écrit.
 */
function Exchange({
  who = "user",
  label,
  children,
}: {
  who?: "user" | "ethi";
  label: string;
  children: React.ReactNode;
}) {
  const isUser = who === "user";
  return (
    <div className={isUser ? "paper-card-inset px-4 py-3.5" : "border-l-2 border-mint pl-4"}>
      <p className="stamp inline-flex items-center gap-2">
        {!isUser && <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-mint" />}
        {label}
      </p>
      <p className={`mt-1 text-body-lg leading-relaxed ${isUser ? "text-ink-2" : "text-ink"}`}>
        {children}
      </p>
    </div>
  );
}
