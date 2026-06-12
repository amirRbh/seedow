import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BetaCounter } from "@/components/beta/BetaCounter";

const SITE_URL = "https://seedow.life";

const FAQS = [
  {
    q: "Que fait Seedow exactement ?",
    a: "Seedow audite ton portefeuille existant sous l'angle ESG. Tu saisis tes lignes (ISIN ou ticker, montant ou %), on calcule un score moyen pondéré, un taux de couverture des données et on identifie les angles morts. Aucune promesse de placement — seulement de la lecture.",
  },
  {
    q: "D'où viennent les scores ESG ?",
    a: "Les données proviennent de fournisseurs publics (Yahoo Finance ESG, MSCI ESG quand disponible). Chaque score affiche sa source et sa date. Les lignes non couvertes sont marquées « non auditables » — pas masquées.",
  },
  {
    q: "Est-ce gratuit ?",
    a: "L'audit est gratuit. À terme, Seedow proposera un service payant de réalignement (recommandations actionnables, suivi). L'audit lui-même restera ouvert.",
  },
  {
    q: "Mes données sont-elles protégées ?",
    a: "Aucune donnée bancaire n'est stockée. Tu saisis manuellement tes lignes. Tu peux exporter ou supprimer ton compte à tout moment.",
  },
];

const PILLARS = [
  {
    n: "01",
    title: "Audit",
    body: "Score ESG pondéré sur ton portefeuille réel. Pas de simulation, pas de classement marketing.",
  },
  {
    n: "02",
    title: "Transparence",
    body: "Chaque chiffre indique sa source et sa date. La méthodologie est publique et reproductible.",
  },
  {
    n: "03",
    title: "Trous assumés",
    body: "Les lignes non couvertes restent visibles. Un audit honnête vaut mieux qu'une moyenne trompeuse.",
  },
];

const MANIFESTO = "Ton épargne raconte une histoire. Nous la lisons à haute voix.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Seedow — L'audit ESG de ton épargne" },
      {
        name: "description",
        content:
          "Saisis ton portefeuille, obtiens un audit ESG transparent : score pondéré, taux de couverture, angles morts assumés. Aucune promesse de placement.",
      },
      { property: "og:title", content: "Seedow — L'audit ESG de ton épargne" },
      {
        property: "og:description",
        content: "Audit ESG transparent. Saisis ton portefeuille, lis ce qu'il finance vraiment.",
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
          description: "Audit ESG transparent pour ton portefeuille.",
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQS.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
    ],
  }),
  component: Landing,
});

const easeOut = [0.22, 1, 0.36, 1] as [number, number, number, number];

function Landing() {
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  // Scroll progress sur le hero pour contraction du wordmark
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
        {/* ════ 01. HERO plein écran ════ */}
        <section
          ref={heroRef}
          className="relative min-h-screen flex flex-col justify-between px-6 md:px-12 pt-32 pb-16 border-b border-ink/10"
        >
          <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col justify-center">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
              className="eyebrow mb-10"
            >
              N°01 — Édition 2026 · Audit ESG
            </motion.p>

            <motion.div
              style={{ scale: heroScale, opacity: heroOpacity, y: heroY, transformOrigin: "left center" }}
            >
              <h1 className="display-xl uppercase">
                seedow<span className="text-gold">.</span>
              </h1>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: easeOut }}
              className="mt-12 text-xl md:text-3xl max-w-3xl leading-[1.3] text-ink-2 font-display font-medium tracking-tight"
            >
              L'audit ESG de ton épargne.
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
                {isAuthed ? "Mon espace" : "Auditer mon portefeuille"}
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link to="/methodologie" className="btn-harvest">
                Méthodologie
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
            <span>Aucune donnée bancaire stockée</span>
            <span className="hidden md:inline">Méthodologie publique</span>
            <span className="hidden md:inline">Sources documentées</span>
            <ScrollHint />
          </motion.div>
        </section>

        {/* ════ 02. MANIFESTE — révélation mot par mot ════ */}
        <ManifestoSection />

        {/* ════ 03. DÉMO INTERACTIVE inline ════ */}
        <DemoAuditSection />

        {/* ════ 04. TROIS PILIERS ════ */}
        <section className="max-w-7xl mx-auto px-6 md:px-12 py-32 border-t border-ink/10">
          <div className="grid md:grid-cols-12 gap-12 mb-16">
            <div className="md:col-span-3">
              <p className="eyebrow mb-4">Ce qui nous distingue</p>
            </div>
            <h2 className="md:col-span-9 display-lg">
              Trois engagements,
              <br />
              <span className="text-gold">aucun compromis.</span>
            </h2>
          </div>
          <div className="gold-rule mb-16" />
          <div className="grid md:grid-cols-3 gap-12 md:gap-16">
            {PILLARS.map((p, i) => (
              <motion.article
                key={p.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.7, delay: i * 0.1, ease: easeOut }}
              >
                <p className="font-display text-xs tracking-[0.25em] text-gold tabular-nums mb-6">
                  {p.n}
                </p>
                <h3 className="display-lg text-3xl md:text-4xl mb-4">{p.title}</h3>
                <p className="text-ink-2 leading-relaxed">{p.body}</p>
              </motion.article>
            ))}
          </div>
        </section>

        {/* ════ 05. MÉTHODOLOGIE teaser ════ */}
        <section className="bg-ink text-paper py-32">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <div className="grid md:grid-cols-12 gap-12 items-end">
              <div className="md:col-span-7">
                <p className="eyebrow mb-6">Méthodologie</p>
                <h2 className="display-lg text-paper">
                  Un score se justifie.
                  <br />
                  <span className="text-gold">Le nôtre se vérifie.</span>
                </h2>
                <p className="mt-8 text-paper-2 max-w-xl leading-relaxed text-lg">
                  Exclusions sectorielles, scores ESG pondérés, taux de couverture explicite, sources horodatées. Chaque chiffre affiché peut être tracé jusqu'à sa source publique.
                </p>
              </div>
              <div className="md:col-span-5 flex md:justify-end">
                <Link
                  to="/methodologie"
                  className="inline-flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-gold border-b border-gold pb-2 hover:border-gold-soft hover:text-gold-soft transition-colors"
                >
                  Lire la méthodologie complète
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ════ 06. FAQ ════ */}
        <section className="max-w-4xl mx-auto px-6 md:px-12 py-32">
          <div className="mb-16">
            <p className="eyebrow mb-4">Questions</p>
            <h2 className="display-lg">Tout ce qu'il faut savoir.</h2>
            <div className="gold-rule mt-8" />
          </div>
          <div>
            {FAQS.map((f, i) => (
              <motion.details
                key={f.q}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className="group border-b border-ink/10 py-8 [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="flex items-start justify-between cursor-pointer list-none gap-6">
                  <h3 className="font-display font-semibold text-lg md:text-xl leading-snug group-hover:text-gold transition-colors">
                    {f.q}
                  </h3>
                  <span className="text-gold mt-1 group-open:rotate-45 transition-transform duration-400">
                    <Plus className="w-5 h-5" />
                  </span>
                </summary>
                <p className="mt-4 text-ink-2 leading-relaxed pr-12">{f.a}</p>
              </motion.details>
            ))}
          </div>
        </section>

        {/* ════ CTA FINAL ════ */}
        <section className="max-w-7xl mx-auto px-6 md:px-12 pb-32">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, ease: easeOut }}
            className="relative overflow-hidden bg-ink text-paper p-12 md:p-24"
          >
            <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full blur-[140px] opacity-30 bg-gold" />
            <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full blur-[160px] opacity-20 bg-moss-2" />
            <div className="relative z-10 max-w-3xl">
              <p className="eyebrow mb-6">Accès anticipé</p>
              <h2 className="display-lg text-paper mb-8">
                Ton épargne mérite d'être lue.
                <br />
                <span className="text-gold">Commence par l'auditer.</span>
              </h2>
              <Link
                to={isAuthed ? "/dashboard" : "/auth"}
                search={isAuthed ? undefined : { redirect: "/onboarding", mode: "signup" }}
                className="inline-flex items-center gap-3 bg-gold text-ink px-10 py-5 font-semibold uppercase tracking-[0.2em] text-xs hover:bg-gold-soft transition-colors"
              >
                {isAuthed ? "Mon espace" : "Lancer mon audit"}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </section>

        <footer className="border-t border-ink/10 py-12">
          <div className="max-w-7xl mx-auto px-6 md:px-12 flex flex-col md:flex-row justify-between gap-6 text-xs text-ink-3">
            <p>© 2026 Seedow — Lecture éditoriale de l'épargne.</p>
            <div className="flex gap-8">
              <Link to="/methodologie" className="hover:text-ink transition-colors">Méthodologie</Link>
              <a href="mailto:hello@seedow.life" className="hover:text-ink transition-colors">Contact</a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

function StickyHeader({ isAuthed }: { isAuthed: boolean | null }) {
  const { scrollY } = useScroll();
  const bg = useTransform(scrollY, [0, 400], ["rgba(245, 240, 224, 0)", "rgba(245, 240, 224, 0.92)"]);
  const borderColor = useTransform(scrollY, [0, 400], ["rgba(6, 78, 59, 0)", "rgba(6, 78, 59, 0.12)"]);

  return (
    <motion.header
      style={{ backgroundColor: bg }}
      className="fixed top-0 left-0 right-0 z-40 backdrop-blur-xl"
    >
      <motion.div style={{ borderColor }} className="border-b">

        <nav className="max-w-7xl mx-auto flex justify-between items-center px-6 md:px-12 py-5">
          <Link to="/" className="font-display font-bold text-xl tracking-tight uppercase">
            seedow<span className="text-gold">.</span>
          </Link>
          <div className="flex items-center gap-6 md:gap-10 text-[10px] font-semibold uppercase tracking-[0.22em]">
            <Link to="/methodologie" className="hidden sm:inline-block hover:text-gold transition-colors">
              Méthodologie
            </Link>
            {isAuthed ? (
              <Link to="/dashboard" className="bg-ink text-paper px-5 py-3 hover:bg-ink-2 transition-colors">
                Mon espace
              </Link>
            ) : (
              <>
                <Link to="/auth" search={{ redirect: "/dashboard", mode: "login" }} className="hover:text-gold transition-colors">
                  Connexion
                </Link>
                <Link to="/auth" search={{ redirect: "/onboarding", mode: "signup" }} className="bg-ink text-paper px-5 py-3 hover:bg-ink-2 transition-colors">
                  Auditer
                </Link>
              </>
            )}
          </div>
        </nav>
      </motion.div>
    </motion.header>
  );
}

function ScrollHint() {
  return (
    <div className="flex items-center gap-2 text-ink-3">
      <span>Défile</span>
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
  const words = MANIFESTO.split(" ");
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 80%", "end 50%"] });

  return (
    <section ref={ref} className="max-w-7xl mx-auto px-6 md:px-12 py-32 md:py-48">
      <p className="eyebrow mb-12">Manifeste</p>
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

// Mini-démo : l'utilisateur tape un ticker, on lui montre un mini-verdict animé
const DEMO_DATA: Record<string, { name: string; esg: number; coverage: number; sectors: string[] }> = {
  AAPL: { name: "Apple Inc.", esg: 72, coverage: 98, sectors: ["Tech"] },
  TSLA: { name: "Tesla Inc.", esg: 58, coverage: 92, sectors: ["Auto", "Énergie"] },
  TTE: { name: "TotalEnergies", esg: 34, coverage: 95, sectors: ["Énergie fossile"] },
  MC: { name: "LVMH", esg: 64, coverage: 88, sectors: ["Luxe"] },
  NESN: { name: "Nestlé", esg: 56, coverage: 90, sectors: ["Agro"] },
};

function DemoAuditSection() {
  const [ticker, setTicker] = useState("AAPL");
  const [committed, setCommitted] = useState("AAPL");

  const data = useMemo(() => DEMO_DATA[committed.toUpperCase()] ?? null, [committed]);

  return (
    <section className="bg-paper-2 border-y border-ink/10 py-32">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="grid md:grid-cols-12 gap-12 mb-16">
          <div className="md:col-span-5">
            <p className="eyebrow mb-4">Démo live</p>
            <h2 className="display-lg">
              Essaie maintenant.
              <br />
              <span className="text-gold">Sans inscription.</span>
            </h2>
            <p className="mt-6 text-ink-2 leading-relaxed">
              Tape un ticker, lis ce que ton portefeuille raconterait. Un avant-goût de l'audit complet.
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
                placeholder="AAPL, TSLA, TTE, MC, NESN…"
                className="flex-1 bg-transparent border-b-2 border-ink/20 focus:border-gold outline-none px-1 py-4 font-display text-2xl uppercase tracking-wider placeholder:text-ink-3/50"
                aria-label="Ticker à auditer"
              />
              <button type="submit" className="btn-plant">
                Auditer
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
                <AnimatedKPI value={data.esg} label="Score ESG" suffix="/100" accent />
                <AnimatedKPI value={data.coverage} label="Couverture" suffix="%" />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-3 mb-3">
                    Secteurs
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {data.sectors.map((s) => (
                      <span key={s} className="moss-badge">{s}</span>
                    ))}
                  </div>
                  <p className="mt-4 text-xs text-ink-3 leading-relaxed">
                    {data.name} · données démo, audit complet sur ton portefeuille réel.
                  </p>
                </div>
              </motion.div>
            ) : (
              <p className="text-ink-3 text-sm">
                Ticker inconnu en démo. Essaie AAPL, TSLA, TTE, MC ou NESN.
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
