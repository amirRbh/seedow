import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ArrowRight, Leaf, Eye, BarChart3, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import seedowLogo from "@/assets/seedow-logo.png";

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
    icon: Eye,
    title: "Transparence totale",
    body: "Chaque ligne de ton portefeuille est documentée : score ESG par pilier, source de la donnée, intensité carbone, classification SFDR.",
  },
  {
    icon: Leaf,
    title: "Impact mesuré",
    body: "Pas de marketing vert. On te donne l'estimation et la valeur réelle quand elle existe, avec sa couverture, sa source et sa date.",
  },
  {
    icon: BarChart3,
    title: "Performance honnête",
    body: "Suivi quotidien des prix, courbe d'évolution, comparatif vs capital investi. Sans jargon, sans promesse de rendement.",
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
    links: [{ rel: "canonical", href: SITE_URL }],
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
    <div className="min-h-screen bg-paper">
      {/* Top bar */}
      <header className="sticky top-0 z-20 bg-paper/80 backdrop-blur-md border-b border-paper-3/60">
        <div className="max-w-5xl mx-auto px-5 py-3.5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2" aria-label="Seedow">
            <img src={seedowLogo} alt="" className="h-6 w-auto" />
            <span className="font-value text-lg text-ink tracking-tight">seedow</span>
          </Link>
          <nav className="flex items-center gap-1 sm:gap-4">
            <Link
              to="/methodologie"
              className="text-[12px] text-ink-2 hover:text-ink transition-colors px-2 py-1"
            >
              Méthodologie
            </Link>
            {isAuthed ? (
              <Link
                to="/dashboard"
                className="text-[12px] font-medium px-3 py-1.5 rounded-full bg-ink text-paper hover:bg-ink-2 transition-colors"
              >
                Mon espace
              </Link>
            ) : (
              <>
                <Link
                  to="/auth"
                  search={{ redirect: "/dashboard", mode: "login" }}
                  className="text-[12px] text-ink-2 hover:text-ink transition-colors px-2 py-1"
                >
                  Connexion
                </Link>
                <Link
                  to="/auth"
                  search={{ redirect: "/onboarding", mode: "signup" }}
                  className="text-[12px] font-medium px-3 py-1.5 rounded-full bg-ink text-paper hover:bg-ink-2 transition-colors"
                >
                  Commencer
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-moss-5 via-paper to-paper" />
          <div className="max-w-5xl mx-auto px-5 pt-16 pb-20 sm:pt-24 sm:pb-28 text-center">
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 16 }}
              className="relative inline-block mb-8"
            >
              <div className="absolute inset-0 -m-6 rounded-full bg-moss-3/25 blur-2xl" />
              <img src={seedowLogo} alt="" className="relative h-16 w-auto animate-breathe" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="font-value text-5xl sm:text-7xl text-ink leading-[1.05] tracking-tight max-w-3xl mx-auto"
            >
              Investis,
              <br />
              <span className="text-moss-1">avec impact.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-[15px] sm:text-base text-ink-2 mt-6 max-w-xl mx-auto leading-relaxed"
            >
              Un portefeuille construit à partir de tes valeurs, géré avec rigueur,
              mesuré sans jargon. La finance responsable, enfin lisible.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3"
            >
              {isAuthed ? (
                <Link to="/dashboard" className="btn-plant">
                  Accéder à mon espace
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <>
                  <Link
                    to="/auth"
                    search={{ redirect: "/onboarding", mode: "signup" }}
                    className="btn-plant"
                  >
                    Créer mon portefeuille
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    to="/methodologie"
                    className="text-[13px] text-ink-2 hover:text-ink transition-colors px-3 py-2"
                  >
                    Voir la méthodologie →
                  </Link>
                </>
              )}
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="text-[11px] text-ink-3 mt-6"
            >
              Aucune donnée bancaire stockée · Méthodologie publique · Sans frais cachés
            </motion.p>
          </div>
        </section>

        {/* 3 pilliers */}
        <section className="max-w-5xl mx-auto px-5 py-16 sm:py-20">
          <p className="text-[11px] uppercase tracking-[0.18em] text-ink-3 font-semibold text-center mb-3">
            Ce qui nous distingue
          </p>
          <h2 className="font-value text-3xl sm:text-4xl text-ink text-center max-w-2xl mx-auto leading-tight">
            Trois piliers, zéro compromis
          </h2>

          <div className="grid sm:grid-cols-3 gap-4 sm:gap-6 mt-12">
            {PILLARS.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: i * 0.08 }}
                className="paper-card p-6"
              >
                <div className="w-10 h-10 rounded-full bg-moss-5 flex items-center justify-center mb-4">
                  <p.icon className="w-5 h-5 text-moss-1" />
                </div>
                <h3 className="font-value text-lg text-ink mb-2">{p.title}</h3>
                <p className="text-[13px] text-ink-2 leading-relaxed">{p.body}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Comment ça marche */}
        <section className="bg-paper-2 border-y border-paper-3">
          <div className="max-w-5xl mx-auto px-5 py-16 sm:py-20">
            <p className="text-[11px] uppercase tracking-[0.18em] text-ink-3 font-semibold text-center mb-3">
              Comment ça marche
            </p>
            <h2 className="font-value text-3xl sm:text-4xl text-ink text-center max-w-2xl mx-auto leading-tight">
              Trois étapes, dix minutes
            </h2>

            <ol className="grid sm:grid-cols-3 gap-6 mt-12">
              {[
                {
                  n: "01",
                  t: "Définis tes causes",
                  b: "Climat, biodiversité, égalité, tech éthique… choisis ce qui compte pour toi et règle l'intensité.",
                },
                {
                  n: "02",
                  t: "Reçois ton portefeuille",
                  b: "Notre moteur applique exclusions, filtres ESG et optimisation Markowitz pour proposer une allocation cohérente.",
                },
                {
                  n: "03",
                  t: "Suis et ajuste",
                  b: "Valeur, performance, impact carbone, score ESG : tout est visible. Tes préférences déclenchent un recalcul automatique.",
                },
              ].map((step, i) => (
                <motion.li
                  key={step.n}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ delay: i * 0.1 }}
                  className="relative"
                >
                  <p className="font-value text-4xl text-moss-1/40 mb-2">{step.n}</p>
                  <h3 className="font-value text-lg text-ink mb-2">{step.t}</h3>
                  <p className="text-[13px] text-ink-2 leading-relaxed">{step.b}</p>
                </motion.li>
              ))}
            </ol>
          </div>
        </section>

        {/* FAQ */}
        <section className="max-w-3xl mx-auto px-5 py-16 sm:py-20">
          <h2 className="font-value text-3xl sm:text-4xl text-ink text-center leading-tight mb-12">
            Questions fréquentes
          </h2>
          <div className="space-y-1">
            {FAQS.map((f) => (
              <details
                key={f.q}
                className="group border-b border-paper-3 py-4 [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="flex items-center justify-between cursor-pointer list-none">
                  <h3 className="font-medium text-[15px] text-ink pr-4">{f.q}</h3>
                  <span className="text-ink-3 group-open:rotate-45 transition-transform text-xl leading-none flex-shrink-0">
                    +
                  </span>
                </summary>
                <p className="text-[13px] text-ink-2 mt-3 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA final */}
        <section className="max-w-3xl mx-auto px-5 pb-20">
          <div className="paper-card p-8 sm:p-12 text-center bg-gradient-to-br from-moss-5 to-paper">
            <Shield className="w-8 h-8 text-moss-1 mx-auto mb-4" />
            <h2 className="font-value text-3xl text-ink leading-tight mb-3">
              Prêt à investir
              <br />
              dans ce qui compte ?
            </h2>
            <p className="text-[14px] text-ink-2 max-w-md mx-auto mb-6">
              Crée ton portefeuille en quelques minutes. Sans frais cachés, sans engagement.
            </p>
            {isAuthed ? (
              <Link to="/dashboard" className="btn-plant inline-flex">
                Accéder à mon espace
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <Link
                to="/auth"
                search={{ redirect: "/onboarding", mode: "signup" }}
                className="btn-plant inline-flex"
              >
                Commencer maintenant
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-paper-3">
        <div className="max-w-5xl mx-auto px-5 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-ink-3">
          <p>© {new Date().getFullYear()} Seedow — Investir simplement, durablement.</p>
          <div className="flex items-center gap-4">
            <Link to="/methodologie" className="hover:text-ink transition-colors">
              Méthodologie
            </Link>
            <a href="mailto:hello@seedow.life" className="hover:text-ink transition-colors">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
