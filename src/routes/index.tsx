import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const SITE_URL = "https://seedow.life";

const FAQS = [
  {
    q: "Comment Seedow choisit-il mes investissements ?",
    a: "À partir de tes causes (climat, biodiversité, droits humains…) et de ton appétence au risque, un pipeline en six étapes construit ton portefeuille : exclusions sectorielles, filtres ESG best-in-class, puis optimisation Markowitz contrainte (plancher ESG, budget de risque, plafonds par classe). Chaque étape est traçable et documentée.",
  },
  {
    q: "Quels actifs sont utilisés ?",
    a: "Des ETF européens et internationaux à dominante actions, obligations vertes et sociales, immobilier durable et réserve sécurisée. Tous sont classifiés SFDR article 8 ou 9 lorsque c'est documenté, et leurs scores ESG sont sourcés (MSCI, Sustainalytics, ESG Book).",
  },
  {
    q: "Comment l'impact est-il mesuré ?",
    a: "Deux indicateurs cohabitent : une estimation heuristique (CO₂ évité par 10 k€ investis, dérivée du score ESG) et l'intensité carbone réelle pondérée (gCO₂e/€ investi/an) sur la part du portefeuille couverte par un provider. La méthodologie complète est publique.",
  },
  {
    q: "Mes données sont-elles protégées ?",
    a: "Oui. Aucune donnée bancaire n'est stockée par Seedow. L'authentification est sécurisée, tu peux exporter ou supprimer ton compte à tout moment depuis les réglages.",
  },
];

const PILLARS = [
  {
    title: "Rigueur",
    body: "Une sélection d'actifs adossée à des critères financiers et extra-financiers exigeants — score ESG par pilier, classification SFDR, source documentée.",
  },
  {
    title: "Alignement",
    body: "Pas de marketing vert. On investit uniquement dans des entreprises et fonds dont le modèle d'affaires sert tes convictions.",
  },
  {
    title: "Transparence",
    body: "Tout est lisible : composition, performance, intensité carbone, frais. Aucune ligne cachée, aucune rétrocommission.",
  },
];

const STEPS = [
  {
    n: "01.",
    t: "Analyse de profil",
    b: "Définis tes causes prioritaires et ton appétence au risque en quelques minutes.",
  },
  {
    n: "02.",
    t: "Allocation personnalisée",
    b: "Notre moteur applique exclusions, filtres ESG et optimisation Markowitz pour une allocation cohérente.",
  },
  {
    n: "03.",
    t: "Suivi quotidien",
    b: "Valeur, performance, impact carbone, score ESG : tout est actualisé chaque jour ouvré.",
  },
];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Seedow — Investir simplement, durablement" },
      {
        name: "description",
        content:
          "Construis un portefeuille d'investissement aligné sur tes valeurs en quelques minutes. Méthodologie transparente, impact mesuré, performance suivie au quotidien.",
      },
      { property: "og:title", content: "Seedow — Investir simplement, durablement" },
      {
        property: "og:description",
        content:
          "Construis un portefeuille d'investissement aligné sur tes valeurs. Méthodologie transparente, impact mesuré.",
      },
      { property: "og:url", content: SITE_URL },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "canonical", href: SITE_URL },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Syne:wght@700;800&display=swap",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Seedow",
          url: SITE_URL,
          description:
            "Plateforme d'investissement responsable avec méthodologie ESG transparente.",
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

// Palette éditoriale verrouillée
const C = {
  paper: "#ffffff",
  ink: "#064e3b",
  inkSoft: "#0d7a5f",
  gold: "#c9a84c",
};

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
};

function Landing() {
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setIsAuthed(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setIsAuthed(!!session);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <div
      className="min-h-screen selection:bg-[#c9a84c] selection:text-white"
      style={{
        backgroundColor: C.paper,
        color: C.ink,
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-30 backdrop-blur-md border-b"
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.85)",
          borderColor: "rgba(6, 78, 59, 0.12)",
        }}
      >
        <nav className="max-w-7xl mx-auto flex justify-between items-center px-6 py-6">
          <Link
            to="/"
            className="text-2xl font-extrabold tracking-tight uppercase"
            style={{ fontFamily: "'Syne', sans-serif" }}
            aria-label="Seedow"
          >
            seedow
          </Link>
          <div className="flex items-center gap-3 sm:gap-10 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.18em]">
            <Link
              to="/methodologie"
              className="hidden sm:inline-block transition-colors hover:text-[#c9a84c]"
            >
              Méthodologie
            </Link>
            {isAuthed ? (
              <Link
                to="/dashboard"
                className="px-5 sm:px-8 py-3 transition-all hover:bg-[#0d7a5f]"
                style={{ backgroundColor: C.ink, color: C.paper }}
              >
                Mon espace
              </Link>
            ) : (
              <>
                <Link
                  to="/auth"
                  search={{ redirect: "/dashboard", mode: "login" }}
                  className="transition-colors hover:text-[#c9a84c]"
                >
                  Connexion
                </Link>
                <Link
                  to="/auth"
                  search={{ redirect: "/onboarding", mode: "signup" }}
                  className="px-5 sm:px-8 py-3 transition-all hover:bg-[#0d7a5f]"
                  style={{ backgroundColor: C.ink, color: C.paper }}
                >
                  Commencer
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section
          className="max-w-7xl mx-auto px-6 py-24 md:py-36 border-b"
          style={{ borderColor: "rgba(6, 78, 59, 0.12)" }}
        >
          <div className="max-w-4xl">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
              className="text-[11px] font-bold uppercase tracking-[0.3em] mb-8"
              style={{ color: C.gold }}
            >
              N°01 — Édition 2026
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="text-6xl md:text-8xl font-extrabold leading-[0.92] tracking-tighter mb-10 uppercase"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              L'excellence
              <br />
              <span style={{ color: C.gold }}>durable.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="text-xl md:text-2xl max-w-2xl leading-relaxed mb-12"
              style={{ color: "rgba(6, 78, 59, 0.78)" }}
            >
              Une approche rigoureuse de l'investissement responsable, alliant
              performance financière et impact sociétal mesurable.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.35 }}
              className="flex flex-col sm:flex-row items-start sm:items-center gap-6"
            >
              {isAuthed ? (
                <Link
                  to="/dashboard"
                  className="group inline-flex items-center gap-3 px-10 py-5 font-bold uppercase tracking-[0.18em] text-xs transition-transform hover:-translate-y-0.5"
                  style={{ backgroundColor: C.ink, color: C.paper }}
                >
                  Accéder à mon espace
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
              ) : (
                <Link
                  to="/auth"
                  search={{ redirect: "/onboarding", mode: "signup" }}
                  className="group inline-flex items-center gap-3 px-10 py-5 font-bold uppercase tracking-[0.18em] text-xs transition-transform hover:-translate-y-0.5"
                  style={{ backgroundColor: C.ink, color: C.paper }}
                >
                  Découvrir l'offre
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
              )}
              <Link
                to="/methodologie"
                className="text-xs font-semibold uppercase tracking-[0.18em] border-b border-current pb-1 transition-colors hover:text-[#c9a84c]"
              >
                Voir la méthodologie
              </Link>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-[10px] uppercase tracking-[0.25em] mt-10"
              style={{ color: "rgba(6, 78, 59, 0.5)" }}
            >
              Aucune donnée bancaire stockée · Méthodologie publique · Sans frais cachés
            </motion.p>
          </div>
        </section>

        {/* 3 Piliers */}
        <section
          className="max-w-7xl mx-auto px-6 py-24 border-b"
          style={{ borderColor: "rgba(6, 78, 59, 0.12)" }}
        >
          <motion.p
            {...fadeUp}
            className="text-[11px] font-bold uppercase tracking-[0.3em] mb-16"
            style={{ color: C.gold }}
          >
            Ce qui nous distingue
          </motion.p>
          <div className="grid md:grid-cols-3 gap-10 md:gap-12">
            {PILLARS.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="border-l pl-8"
                style={{ borderColor: "rgba(6, 78, 59, 0.22)" }}
              >
                <h3
                  className="text-2xl font-bold mb-4 uppercase tracking-tight"
                  style={{ fontFamily: "'Syne', sans-serif" }}
                >
                  {p.title}
                </h3>
                <p
                  className="leading-relaxed"
                  style={{ color: "rgba(6, 78, 59, 0.72)" }}
                >
                  {p.body}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* 3 Étapes */}
        <section
          className="max-w-7xl mx-auto px-6 py-24 border-b"
          style={{ borderColor: "rgba(6, 78, 59, 0.12)" }}
        >
          <div className="flex flex-col md:flex-row gap-12 md:gap-16 items-baseline">
            <div className="md:w-1/3">
              <motion.p
                {...fadeUp}
                className="text-[11px] font-bold uppercase tracking-[0.3em] mb-4"
                style={{ color: C.gold }}
              >
                Comment ça marche
              </motion.p>
              <motion.h2
                {...fadeUp}
                transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                className="text-4xl md:text-5xl font-extrabold uppercase leading-[0.95]"
                style={{ fontFamily: "'Syne', sans-serif" }}
              >
                Trois étapes,
                <br />
                dix minutes.
              </motion.h2>
            </div>
            <div className="md:w-2/3 grid grid-cols-1 gap-14">
              {STEPS.map((step, i) => (
                <motion.div
                  key={step.n}
                  initial={{ opacity: 0, x: 24 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                  className="flex gap-6 sm:gap-8 items-start"
                >
                  <span
                    className="text-4xl sm:text-5xl font-extrabold leading-none flex-shrink-0"
                    style={{ color: C.gold, fontFamily: "'Syne', sans-serif" }}
                  >
                    {step.n}
                  </span>
                  <div>
                    <h4 className="text-lg font-bold mb-2 uppercase tracking-[0.08em]">
                      {step.t}
                    </h4>
                    <p style={{ color: "rgba(6, 78, 59, 0.72)" }}>{step.b}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="max-w-3xl mx-auto px-6 py-24">
          <motion.h2
            {...fadeUp}
            className="text-4xl md:text-5xl font-extrabold uppercase text-center mb-16 tracking-tight"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            Questions fréquentes
          </motion.h2>
          <div className="space-y-1">
            {FAQS.map((f, i) => (
              <motion.details
                key={f.q}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className="group border-b py-6 [&_summary::-webkit-details-marker]:hidden"
                style={{ borderColor: "rgba(6, 78, 59, 0.12)" }}
              >
                <summary className="flex items-center justify-between cursor-pointer list-none gap-6">
                  <h3 className="font-bold uppercase tracking-[0.05em] text-sm sm:text-base group-hover:text-[#c9a84c] transition-colors">
                    {f.q}
                  </h3>
                  <span
                    className="text-2xl leading-none flex-shrink-0 group-open:rotate-45 transition-transform"
                    style={{ color: C.gold }}
                  >
                    +
                  </span>
                </summary>
                <p
                  className="text-sm mt-4 leading-relaxed pr-10"
                  style={{ color: "rgba(6, 78, 59, 0.75)" }}
                >
                  {f.a}
                </p>
              </motion.details>
            ))}
          </div>
        </section>

        {/* CTA final */}
        <section className="max-w-7xl mx-auto px-6 pb-24">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7 }}
            className="relative overflow-hidden p-12 md:p-24 text-center"
            style={{ backgroundColor: C.ink, color: C.paper }}
          >
            <div
              className="absolute -top-20 -right-20 w-80 h-80 rounded-full blur-[120px] opacity-30"
              style={{ backgroundColor: C.inkSoft }}
            />
            <div
              className="absolute -bottom-32 -left-20 w-80 h-80 rounded-full blur-[140px] opacity-20"
              style={{ backgroundColor: C.gold }}
            />
            <div className="relative z-10">
              <p
                className="text-[11px] font-bold uppercase tracking-[0.3em] mb-6"
                style={{ color: C.gold }}
              >
                Édition limitée — accès anticipé
              </p>
              <h2
                className="text-4xl md:text-6xl font-extrabold uppercase mb-8 leading-[0.95] tracking-tight"
                style={{ fontFamily: "'Syne', sans-serif" }}
              >
                Prêt à investir dans
                <br />
                ce qui compte ?
              </h2>
              <p
                className="max-w-xl mx-auto mb-12 text-base sm:text-lg"
                style={{ color: "rgba(255, 255, 255, 0.75)" }}
              >
                Ouvre ton compte aujourd'hui et rejoins une nouvelle génération
                d'investisseurs conscients.
              </p>
              {isAuthed ? (
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-3 px-12 py-5 font-bold uppercase tracking-[0.18em] text-xs transition-colors hover:bg-white"
                  style={{ backgroundColor: C.gold, color: C.ink }}
                >
                  Accéder à mon espace
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <Link
                  to="/auth"
                  search={{ redirect: "/onboarding", mode: "signup" }}
                  className="inline-flex items-center gap-3 px-12 py-5 font-bold uppercase tracking-[0.18em] text-xs transition-colors hover:bg-white"
                  style={{ backgroundColor: C.gold, color: C.ink }}
                >
                  Commencer maintenant
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          </motion.div>
        </section>
      </main>

      <footer
        className="border-t"
        style={{ borderColor: "rgba(6, 78, 59, 0.12)" }}
      >
        <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <p
            className="text-[10px] uppercase tracking-[0.25em]"
            style={{ color: "rgba(6, 78, 59, 0.55)" }}
          >
            © {new Date().getFullYear()} Seedow — Investir simplement, durablement.
          </p>
          <div className="flex gap-8 text-[10px] font-bold uppercase tracking-[0.25em]">
            <Link to="/methodologie" className="hover:text-[#c9a84c] transition-colors">
              Méthodologie
            </Link>
            <a
              href="mailto:hello@seedow.life"
              className="hover:text-[#c9a84c] transition-colors"
            >
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
