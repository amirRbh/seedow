import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BetaCounter } from "@/components/beta/BetaCounter";
import { LanguageToggle } from "@/components/LanguageToggle";

const SITE_URL = "https://seedow.life";

const FAQ_KEYS = ["1", "2", "3", "4"] as const;
const PILLAR_KEYS = ["1", "2", "3"] as const;
const PILLAR_NUMBERS = { "1": "01", "2": "02", "3": "03" } as const;
const STORY_KEYS = ["1", "2", "3", "4"] as const;
const STORY_NUMBERS = { "1": "01", "2": "02", "3": "03", "4": "04" } as const;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Seedow — Votre argent façonne déjà le monde" },
      {
        name: "description",
        content:
          "Seedow analyse votre portefeuille et vous montre ce que votre argent finance vraiment : entreprises, secteurs, valeurs. Une lecture éditoriale, transparente, sans promesse de placement.",
      },
      { property: "og:title", content: "Seedow — Votre argent façonne déjà le monde" },
      {
        property: "og:description",
        content: "Seedow vous montre ce que votre argent finance vraiment. Une lecture transparente de votre portefeuille.",
      },
      { property: "og:url", content: SITE_URL },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: SITE_URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Seedow",
          url: SITE_URL,
          description: "Analyse transparente pour ton portefeuille.",
        }),
      },
    ],
  }),
  component: Landing,
});

const easeOut = [0.22, 1, 0.36, 1] as [number, number, number, number];

function Landing() {
  const { t } = useTranslation();
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  const { scrollY } = useScroll();
  const heroProgress = useTransform(scrollY, [0, 600], [0, 1]);
  const heroScale = useSpring(useTransform(heroProgress, [0, 1], [1, 0.18]), { stiffness: 90, damping: 24 });
  const heroOpacity = useTransform(heroProgress, [0.3, 0.9], [1, 0]);
  const heroY = useTransform(heroProgress, [0, 1], [0, -120]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setIsAuthed(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setIsAuthed(!!session);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <div className="bg-paper text-ink selection:bg-gold selection:text-ink">
      <StickyHeader isAuthed={isAuthed} />

      <main>
        {/* HERO */}
        <section
          ref={heroRef}
          className="relative min-h-screen flex flex-col justify-between px-6 md:px-12 pt-32 pb-16 border-b border-ink/10"
        >
          <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col justify-center">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
              className="eyebrow mb-10 flex items-center gap-3"
            >
              <span className="tabular-nums text-ink-3">N° 01</span>
              <span className="h-px w-8 bg-gold/60" />
              {t("landing.eyebrow_edition")}
            </motion.p>

            <motion.div
              style={{ scale: heroScale, opacity: heroOpacity, y: heroY, transformOrigin: "left center" }}
            >
              <h1 className="display-xl uppercase">
                seedow<span className="text-gold gold-pulse">.</span>
              </h1>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: easeOut }}
              className="mt-12 text-xl md:text-3xl max-w-3xl leading-[1.3] text-ink-2 font-display font-medium tracking-tight"
            >
              {t("landing.subtitle")}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.5 }}
              className="mt-12 flex flex-col sm:flex-row items-start sm:items-center gap-6"
            >
              <Link
                to={isAuthed ? "/dashboard" : "/auth"}
                search={isAuthed ? undefined : { redirect: "/onboarding", mode: "signup" }}
                className="btn-plant group"
              >
                {isAuthed ? t("nav.my_space") : t("nav.audit_my_portfolio")}
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link to="/methodologie" className="btn-harvest">
                {t("nav.methodology")}
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.6 }}
              className="mt-10 max-w-xs"
            >
              <BetaCounter />
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 1.2 }}
            className="max-w-7xl mx-auto w-full flex items-end justify-between gap-6 text-[10px] uppercase tracking-[0.22em] text-ink-3"
          >
            <span>{t("landing.ribbon_no_bank")}</span>
            <span className="hidden md:inline">{t("landing.ribbon_method")}</span>
            <span className="hidden md:inline">{t("landing.ribbon_sources")}</span>
            <ScrollHint />
          </motion.div>
        </section>

        <ManifestoSection />
        <StoryNarrative />
        <DemoSection />

        {/* PILIERS */}
        <section className="max-w-7xl mx-auto px-6 md:px-12 py-32 border-t border-ink/10">
          <div className="grid md:grid-cols-12 gap-12 mb-16">
            <div className="md:col-span-3">
              <p className="eyebrow mb-4 flex items-center gap-3">
                <span className="tabular-nums text-ink-3">N° 04</span>
                <span className="h-px w-8 bg-gold/60" />
                {t("landing.pillars_eyebrow")}
              </p>
            </div>
            <h2 className="md:col-span-9 display-lg">
              {t("landing.pillars_title_a")}
              <br />
              <span className="text-gold">{t("landing.pillars_title_b")}</span>
            </h2>
          </div>
          <div className="gold-rule mb-20" />
          <div className="grid md:grid-cols-3 gap-12 md:gap-16 relative">
            {PILLAR_KEYS.map((k, i) => (
              <motion.article
                key={k}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.7, delay: i * 0.1, ease: easeOut }}
                className="relative"
              >
                <p className="outline-number text-7xl md:text-8xl mb-4 select-none">
                  {PILLAR_NUMBERS[k]}
                </p>
                <h3 className="display-lg text-3xl md:text-4xl mb-4">{t(`landing.pillars.${k}_title`)}</h3>
                <p className="text-ink-2 leading-relaxed">{t(`landing.pillars.${k}_body`)}</p>
              </motion.article>
            ))}
          </div>
        </section>

        {/* MÉTHODO TEASER */}
        <section className="relative overflow-hidden bg-ink text-paper py-32 paper-grain ink-grain vignette">
          <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12">
            <div className="grid md:grid-cols-12 gap-12 items-end">
              <div className="md:col-span-7">
                <p className="eyebrow mb-6 flex items-center gap-3">
                  <span className="tabular-nums text-paper/50">N° 05</span>
                  <span className="h-px w-8 bg-gold/60" />
                  {t("landing.method_eyebrow")}
                </p>
                <h2 className="display-lg text-paper">
                  {t("landing.method_title_a")}
                  <br />
                  <span className="text-gold">{t("landing.method_title_b")}</span>
                </h2>
                <p className="mt-8 text-paper-2 max-w-xl leading-relaxed text-lg">
                  {t("landing.method_desc")}
                </p>
              </div>
              <div className="md:col-span-5 flex md:justify-end">
                <Link
                  to="/methodologie"
                  className="inline-flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-gold border-b border-gold pb-2 hover:border-gold-soft hover:text-gold-soft transition-colors"
                >
                  {t("landing.method_cta")}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="max-w-4xl mx-auto px-6 md:px-12 py-32">
          <div className="mb-16">
            <p className="eyebrow mb-4 flex items-center gap-3"><span className="tabular-nums text-ink-3">N° 06</span><span className="h-px w-8 bg-gold/60" />{t("landing.faq_eyebrow")}</p>
            <h2 className="display-lg">{t("landing.faq_title")}</h2>
            <div className="gold-rule mt-8" />
          </div>
          <div>
            {FAQ_KEYS.map((k, i) => (
              <motion.details
                key={k}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className="group border-b border-ink/10 py-8 [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="flex items-start justify-between cursor-pointer list-none gap-6">
                  <h3 className="font-display font-semibold text-lg md:text-xl leading-snug group-hover:text-gold transition-colors">
                    {t(`landing.faqs.q${k}`)}
                  </h3>
                  <span className="text-gold mt-1 group-open:rotate-45 transition-transform duration-400">
                    <Plus className="w-5 h-5" />
                  </span>
                </summary>
                <p className="mt-4 text-ink-2 leading-relaxed pr-12">{t(`landing.faqs.a${k}`)}</p>
              </motion.details>
            ))}
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="max-w-7xl mx-auto px-6 md:px-12 pb-32">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, ease: easeOut }}
            className="relative overflow-hidden bg-ink text-paper p-12 md:p-24 paper-grain ink-grain"
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,oklch(0.74_0.085_65/0.28),transparent_60%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,oklch(0.38_0.040_145/0.45),transparent_55%)]" />
            <div className="relative z-10 max-w-3xl">
              <p className="eyebrow mb-6 flex items-center gap-3">
                <span className="tabular-nums text-paper/50">N° 07</span>
                <span className="h-px w-8 bg-gold/60" />
                {t("landing.final_eyebrow")}
              </p>
              <h2 className="display-lg text-paper mb-8">
                {t("landing.final_title_a")}
                <br />
                <span className="text-gold">{t("landing.final_title_b")}</span>
              </h2>
              <Link
                to={isAuthed ? "/dashboard" : "/auth"}
                search={isAuthed ? undefined : { redirect: "/onboarding", mode: "signup" }}
                className="group relative inline-flex items-center gap-3 bg-gold text-ink px-10 py-5 font-semibold uppercase tracking-[0.2em] text-xs hover:bg-gold-soft transition-colors overflow-hidden"
              >
                <span className="relative z-10 inline-flex items-center gap-3">
                  {isAuthed ? t("nav.my_space") : t("landing.final_cta")}
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </span>
                <span aria-hidden className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 gold-shimmer transition-opacity" />
              </Link>
            </div>
          </motion.div>
        </section>

        <footer className="border-t border-ink/10 py-12">
          <div className="max-w-7xl mx-auto px-6 md:px-12 flex flex-col md:flex-row justify-between gap-6 text-xs text-ink-3">
            <p>{t("landing.footer_copy")}</p>
            <div className="flex gap-8">
              <Link to="/methodologie" className="hover:text-ink transition-colors">{t("nav.methodology")}</Link>
              <a href="mailto:hello@seedow.life" className="hover:text-ink transition-colors">{t("landing.footer_contact")}</a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

function StickyHeader({ isAuthed }: { isAuthed: boolean | null }) {
  const { t } = useTranslation();
  const { scrollY } = useScroll();
  const bg = useTransform(scrollY, [0, 400], ["rgba(232, 224, 208, 0)", "rgba(232, 224, 208, 0.88)"]);
  const ruleOpacity = useTransform(scrollY, [120, 280], [0, 1]);
  const ruleScale = useTransform(scrollY, [120, 280], [0.2, 1]);

  return (
    <motion.header
      style={{ backgroundColor: bg }}
      className="fixed top-0 left-0 right-0 z-40 backdrop-blur-2xl"
    >
      <div className="relative">
        <nav className="max-w-7xl mx-auto flex justify-between items-center px-6 md:px-12 py-5">
          <div className="flex items-center gap-6">
            <Link to="/" className="font-display font-bold text-xl tracking-tight uppercase">
              seedow<span className="text-gold gold-pulse">.</span>
            </Link>
            <LanguageToggle />
          </div>
          <div className="flex items-center gap-6 md:gap-10 text-[10px] font-semibold uppercase tracking-[0.22em]">
            <Link to="/methodologie" className="hidden sm:inline-block hover:text-gold transition-colors">
              {t("nav.methodology")}
            </Link>
            {isAuthed ? (
              <Link to="/dashboard" className="bg-ink text-paper px-5 py-3 hover:bg-ink-2 transition-colors">
                {t("nav.my_space")}
              </Link>
            ) : (
              <>
                <Link to="/auth" search={{ redirect: "/dashboard", mode: "login" }} className="hover:text-gold transition-colors">
                  {t("nav.login")}
                </Link>
                <Link to="/auth" search={{ redirect: "/onboarding", mode: "signup" }} className="bg-ink text-paper px-5 py-3 hover:bg-ink-2 transition-colors">
                  {t("nav.audit")}
                </Link>
              </>
            )}
          </div>
        </nav>
        <motion.div
          style={{ opacity: ruleOpacity, scaleX: ruleScale, transformOrigin: "left center" }}
          className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent"
          aria-hidden
        />
      </div>
    </motion.header>
  );
}

function ScrollHint() {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2 text-ink-3">
      <span>{t("landing.scroll")}</span>
      <motion.span
        animate={{ y: [0, 4, 0] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden
      >
        ↓
      </motion.span>
    </div>
  );
}

function ManifestoSection() {
  const { t } = useTranslation();
  const manifesto = t("landing.manifesto_text");
  const words = manifesto.split(" ");
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 80%", "end 50%"] });

  return (
    <section ref={ref} className="max-w-7xl mx-auto px-6 md:px-12 py-32 md:py-48">
      <p className="eyebrow mb-12 flex items-center gap-3"><span className="tabular-nums text-ink-3">N° 02</span><span className="h-px w-8 bg-gold/60" />{t("landing.manifesto_eyebrow")}</p>
      <p className="display-lg leading-[1.1] max-w-5xl">
        {words.map((word, i) => {
          const start = i / words.length;
          const end = start + 1 / words.length;
          return <ManifestoWord key={i} word={word} progress={scrollYProgress} start={start} end={end} />;
        })}
      </p>
    </section>
  );
}

function StoryNarrative() {
  const { t } = useTranslation();
  return (
    <section className="max-w-7xl mx-auto px-6 md:px-12 py-20 md:py-32 border-t border-ink/10">
      <div className="gold-rule mb-12 md:mb-20 mt-8 md:mt-12" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 md:gap-x-20 gap-y-14 md:gap-y-20">
        {STORY_KEYS.map((k, i) => (
          <motion.article
            key={k}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, delay: i * 0.1, ease: easeOut }}
            className="relative"
          >
            <p className="outline-number text-6xl md:text-8xl mb-3 md:mb-4 select-none leading-none">
              {STORY_NUMBERS[k]}
            </p>
            <h3 className="display-lg text-2xl md:text-4xl mb-4 md:mb-5">{t(`landing.story.${k}_title`)}</h3>
            <p className="text-ink-2 leading-relaxed text-[15px] md:text-lg max-w-prose">
              {t(`landing.story.${k}_body`)}
            </p>
          </motion.article>
        ))}
      </div>
    </section>
  );
}


function ManifestoWord({
  word,
  progress,
  start,
  end,
}: {
  word: string;
  progress: ReturnType<typeof useScroll>["scrollYProgress"];
  start: number;
  end: number;
}) {
  const opacity = useTransform(progress, [start, end], [0.15, 1]);
  return (
    <motion.span style={{ opacity }} className="inline-block mr-[0.25em]">
      {word}
    </motion.span>
  );
}

const DEMO_DATA: Record<string, { name: string; esg: number; coverage: number; sectors: string[] }> = {
  AAPL: { name: "Apple Inc.", esg: 72, coverage: 98, sectors: ["Tech"] },
  TSLA: { name: "Tesla Inc.", esg: 58, coverage: 92, sectors: ["Auto", "Energy"] },
  TTE: { name: "TotalEnergies", esg: 34, coverage: 95, sectors: ["Fossil energy"] },
  MC: { name: "LVMH", esg: 64, coverage: 88, sectors: ["Luxury"] },
  NESN: { name: "Nestlé", esg: 56, coverage: 90, sectors: ["Food"] },
};

function DemoAuditSection() {
  const { t } = useTranslation();
  const [ticker, setTicker] = useState("AAPL");
  const [committed, setCommitted] = useState("AAPL");

  const data = useMemo(() => DEMO_DATA[committed.toUpperCase()] ?? null, [committed]);

  return (
    <section className="bg-paper-2 border-y border-ink/10 py-32">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="grid md:grid-cols-12 gap-12 mb-16">
          <div className="md:col-span-5">
            <p className="eyebrow mb-4 flex items-center gap-3"><span className="tabular-nums text-ink-3">N° 03</span><span className="h-px w-8 bg-gold/60" />{t("landing.demo_eyebrow")}</p>
            <h2 className="display-lg">
              {t("landing.demo_title_a")}
              <br />
              <span className="text-gold">{t("landing.demo_title_b")}</span>
            </h2>
            <p className="mt-6 text-ink-2 leading-relaxed">
              {t("landing.demo_desc")}
            </p>
          </div>
          <div className="md:col-span-7">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setCommitted(ticker);
              }}
              className="flex gap-3 mb-12"
            >
              <input
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                placeholder={t("landing.demo_placeholder")}
                className="flex-1 bg-transparent border-b-2 border-ink/20 focus:border-gold outline-none px-1 py-4 font-display text-2xl uppercase tracking-wider placeholder:text-ink-3/50"
                aria-label={t("landing.demo_input_label")}
              />
              <button type="submit" className="btn-plant">
                {t("nav.audit")}
              </button>
            </form>

            {data ? (
              <motion.div
                key={committed}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: easeOut }}
                className="grid grid-cols-3 gap-8 md:gap-12"
              >
                <AnimatedKPI value={data.esg} label={t("landing.demo_kpi_esg")} suffix="/100" accent />
                <AnimatedKPI value={data.coverage} label={t("landing.demo_kpi_coverage")} suffix="%" />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-3 mb-3">
                    {t("landing.demo_sectors")}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {data.sectors.map((s) => (
                      <span key={s} className="moss-badge">{s}</span>
                    ))}
                  </div>
                  <p className="mt-4 text-xs text-ink-3 leading-relaxed">
                    {t("landing.demo_data_note", { name: data.name })}
                  </p>
                </div>
              </motion.div>
            ) : (
              <p className="text-ink-3 text-sm">
                {t("landing.demo_unknown")}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function AnimatedKPI({ value, label, suffix, accent }: { value: number; label: string; suffix?: string; accent?: boolean }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let frame = 0;
    const total = 36;
    const id = setInterval(() => {
      frame += 1;
      const t = Math.min(1, frame / total);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(value * eased));
      if (frame >= total) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [value]);

  return (
    <div>
      <p className={`text-[10px] font-semibold uppercase tracking-[0.22em] mb-3 ${accent ? "text-gold" : "text-ink-3"}`}>
        {label}
      </p>
      <div className="kpi-figure text-5xl md:text-6xl flex items-baseline gap-1">
        <span>{display}</span>
        {suffix && <span className="text-base text-ink-3 font-sans">{suffix}</span>}
      </div>
    </div>
  );
}
