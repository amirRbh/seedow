import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { joinWaitlist } from "@/lib/beta/beta.functions";

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

  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* NAV */}
      <nav className="sticky top-0 z-50 border-b border-[var(--paper-3)] backdrop-blur-md bg-[rgba(245,243,236,0.92)]">
        <div className="max-w-[1100px] mx-auto px-6 md:px-8 py-4 flex justify-between items-center gap-4">
          <Link to="/" className="font-display text-2xl tracking-[0.04em] uppercase">
            seedow
          </Link>
          <div className="flex items-center gap-3 md:gap-6">
            <Link
              to="/cours"
              className="hidden md:inline-block font-mono text-[11px] uppercase tracking-[0.15em] text-ink-2 hover:text-ink transition-colors"
            >
              Cours
            </Link>
            <Link
              to="/methodologie"
              className="hidden md:inline-block font-mono text-[11px] uppercase tracking-[0.15em] text-ink-2 hover:text-ink transition-colors"
            >
              Méthodo
            </Link>
            {isAuthed ? (
              <Link to="/dashboard" className="btn-harvest" style={{ padding: "8px 16px", fontSize: 11 }}>
                Mon espace →
              </Link>
            ) : (
              <>
                <Link
                  to="/auth"
                  search={{ redirect: "/dashboard", mode: "login" }}
                  className="btn-outline-ink"
                  style={{ padding: "7px 15px", fontSize: 11 }}
                >
                  Se connecter
                </Link>
                <button onClick={scrollToCta} className="btn-plant" style={{ padding: "8px 16px", fontSize: 11 }}>
                  Rejoindre la beta
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="max-w-[1100px] mx-auto px-8 pt-24 pb-20 text-center">
        <span className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.15em] uppercase text-mint border border-mint rounded-full px-3.5 py-1.5 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-mint gold-pulse" />
          Beta ouverte bientôt
        </span>
        <h1
          className="font-display uppercase mb-7"
          style={{ fontSize: "clamp(48px, 9vw, 108px)", lineHeight: 0.95, letterSpacing: "0.01em" }}
        >
          Votre argent
          <br />
          <span className="text-ink">façonne déjà </span>
          <span className="text-mint">le monde.</span>
        </h1>
        <p className="text-[18px] text-ink-2 max-w-[560px] mx-auto mb-10 leading-[1.6]">
          Seedow vous montre lequel. Investissement ESG, visualisé clairement, expliqué par une IA qui ne vous vend rien.
        </p>
        {isAuthed ? (
          <Link to="/dashboard" className="btn-harvest inline-flex" style={{ padding: "14px 28px", fontSize: 13 }}>
            Accéder à mon espace →
          </Link>
        ) : (
          <HeroForm onJump={scrollToCta} />
        )}
        {!isAuthed && (
          <p className="font-mono text-[10px] text-ink-2 tracking-[0.05em] mt-2">
            GRATUIT · PLACES LIMITÉES · AUCUNE CARTE REQUISE
          </p>
        )}
        {!isAuthed && (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-mono text-[11px] tracking-[0.12em] uppercase text-ink-2">
            <Link
              to="/auth"
              search={{ redirect: "/dashboard", mode: "login" }}
              className="group inline-flex items-center gap-1.5 hover:text-ink transition-colors"
            >
              Déjà inscrit·e ? Se connecter
              <span className="text-mint transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
            <span aria-hidden className="text-[var(--paper-3)]">·</span>
            <Link
              to="/cours"
              className="group inline-flex items-center gap-1.5 hover:text-ink transition-colors"
            >
              Explorer les cours gratuits
              <span className="text-ice transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
          </div>
        )}
      </section>


      {/* TICKER */}
      <div className="bg-ink overflow-hidden py-3.5 border-y border-[var(--paper-3)]">
        <div className="flex gap-12 whitespace-nowrap animate-ticker font-mono text-[12px] text-paper">
          {Array.from({ length: 2 }).flatMap((_, k) =>
            TICKER_ITEMS.map((item, i) => (
              <span key={`${k}-${i}`} className="opacity-85 flex items-center gap-12">
                {item}
                <span aria-hidden>·</span>
              </span>
            )),
          )}
        </div>
      </div>

      {/* PROBLEM */}
      <section className="max-w-[1100px] mx-auto px-8 py-24">
        <p className="eyebrow mb-4">Le problème</p>
        <h2
          className="font-display uppercase max-w-[700px] mb-12"
          style={{ fontSize: "clamp(32px, 5vw, 52px)", lineHeight: 1.05, letterSpacing: "0.01em" }}
        >
          Ton épargne finance des choses que tu n'as jamais choisies.
        </h2>
        <div className="grid md:grid-cols-3 gap-px bg-[var(--paper-3)] border border-[var(--paper-3)] rounded-2xl overflow-hidden">
          {PROBLEMS.map((p, i) => (
            <div key={i} className="bg-paper p-8">
              <div className="font-mono text-[11px] text-ink-2 mb-6">{String(i + 1).padStart(2, "0")}</div>
              <div
                className="font-display mb-2"
                style={{ fontSize: 44, lineHeight: 1, color: `var(--${p.color})` }}
              >
                {p.stat}
              </div>
              <p className="text-[14px] text-ink-2 leading-[1.55]">{p.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS — dark */}
      <section className="bg-ink text-paper py-24 px-8">
        <div className="max-w-[1100px] mx-auto">
          <p className="font-mono text-[11px] tracking-[0.15em] uppercase text-[#888] mb-4">
            Comment ça marche
          </p>
          <h2
            className="font-display uppercase text-paper mb-12"
            style={{ fontSize: "clamp(32px, 5vw, 52px)", lineHeight: 1.05, letterSpacing: "0.01em" }}
          >
            Trois choses que Seedow fait différemment.
          </h2>
          <div className="grid md:grid-cols-3 gap-10">
            {STEPS.map((s, i) => (
              <div key={i}>
                <div
                  className="w-[52px] h-[52px] rounded-xl flex items-center justify-center mb-6 font-display text-[22px]"
                  style={{ background: `var(--${s.bg})`, color: s.fg === "paper" ? "var(--color-paper)" : "var(--color-ink)" }}
                >
                  {s.icon}
                </div>
                <h3 className="font-display text-[24px] tracking-[0.01em] mb-2.5 text-paper uppercase">
                  {s.title}
                </h3>
                <p className="text-[14px] text-[#999] leading-[1.6]">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ETHI */}
      <section className="max-w-[1100px] mx-auto px-8 py-24">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <span className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.1em] uppercase text-volt border border-volt rounded-full px-3.5 py-1.5 mb-6">
              Ethi · IA intégrée
            </span>
            <h3
              className="font-display uppercase mb-5"
              style={{ fontSize: "clamp(32px, 4.5vw, 46px)", lineHeight: 1.05 }}
            >
              Une IA qui répond.
              <br />
              Pas qui vend.
            </h3>
            <p className="text-[15px] text-ink-2 leading-[1.65] mb-6">
              Ethi connaît chaque ligne de ton portefeuille et peut t'expliquer pourquoi une entreprise y est,
              ce qu'elle fait vraiment, et ce que ça implique. Pas de réponses vagues, pas de pression commerciale.
            </p>
            <div
              className="font-mono text-[13px] text-ink bg-[var(--paper-2)] py-4 px-5 rounded-r-lg"
              style={{ borderLeft: "3px solid var(--volt)" }}
            >
              "Pourquoi j'ai des actions dans une entreprise pétrolière ?" → Ethi te montre la ligne exacte,
              le pourcentage, et te propose une alternative ESG équivalente.
            </div>
          </div>
          <div
            className="bg-ink rounded-[20px] p-8 flex flex-col justify-between"
            style={{ aspectRatio: "4 / 5" }}
          >
            <div className="flex flex-col gap-3">
              <div className="bg-volt text-paper rounded-2xl py-3 px-4 text-[13px] leading-[1.5] max-w-[85%] self-end">
                C'est quoi cette ligne à 4% dans mon portefeuille ?
              </div>
              <div className="bg-[#1a1a1a] text-[#ccc] rounded-2xl py-3 px-4 text-[13px] leading-[1.5] max-w-[85%]">
                C'est un fonds obligataire vert qui finance des rénovations énergétiques en Europe.
                Rendement stable, faible volatilité.
              </div>
              <div className="bg-volt text-paper rounded-2xl py-3 px-4 text-[13px] leading-[1.5] max-w-[85%] self-end">
                Et si je veux plus d'impact direct ?
              </div>
            </div>
            <div className="font-mono text-[11px] text-mint">ETHI ÉCRIT···</div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="cta" className="max-w-[700px] mx-auto px-8 py-28 text-center">
        <h2
          className="font-display uppercase mb-5"
          style={{ fontSize: "clamp(36px, 6vw, 64px)", lineHeight: 1 }}
        >
          Prêt à voir
          <br />
          <span className="text-mint">où va ton argent ?</span>
        </h2>
        <p className="text-[16px] text-ink-2 mb-9 leading-[1.6]">
          Rejoins la liste des beta testeurs. Accès anticipé, gratuit, places limitées.
        </p>
        <CtaForm isAuthed={isAuthed} />
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[var(--paper-3)] py-10 px-8">
        <div className="max-w-[1100px] mx-auto flex flex-wrap justify-between items-center gap-4">
          <div className="font-display text-[20px] uppercase">SEEDOW</div>
          <div className="font-mono text-[11px] text-ink-2 uppercase">
            Votre argent façonne déjà le monde.
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes seedow-ticker {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .animate-ticker { animation: seedow-ticker 28s linear infinite; }
        @media (prefers-reduced-motion: reduce) { .animate-ticker { animation: none; } }
      `}</style>
    </div>
  );
}

/* ---------- Forms ---------- */

function HeroForm({ onJump }: { onJump: () => void }) {
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    onJump();
  };
  return (
    <form
      onSubmit={onSubmit}
      className="flex gap-2 max-w-[440px] mx-auto mb-4 bg-ink rounded-full p-[5px] flex-col sm:flex-row"
      style={{ borderRadius: 100 }}
    >
      <input
        type="email"
        required
        placeholder="ton@email.com"
        className="flex-1 bg-transparent border-0 outline-0 px-4 py-3 text-paper text-[14px] placeholder:text-[#888]"
      />
      <button
        type="submit"
        className="font-mono text-[12px] font-bold bg-mint text-ink border-0 py-3 px-5 rounded-full cursor-pointer tracking-[0.02em] hover:scale-[1.03] transition-transform"
      >
        Rejoindre →
      </button>
    </form>
  );
}

function CtaForm({ isAuthed }: { isAuthed: boolean | null }) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [position, setPosition] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await joinWaitlist({ data: { email, source: "landing_cta" } });
      setPosition(res.position);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setSubmitting(false);
    }
  };

  if (isAuthed) {
    return (
      <Link to="/dashboard" className="btn-harvest inline-flex">
        Accéder à mon espace →
      </Link>
    );
  }

  return (
    <>
      <form
        onSubmit={onSubmit}
        className="flex gap-2 max-w-[440px] mx-auto mb-4 bg-ink p-[5px] flex-col sm:flex-row"
        style={{ borderRadius: 100 }}
      >
        <input
          id="cta-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ton@email.com"
          disabled={done}
          className="flex-1 bg-transparent border-0 outline-0 px-4 py-3 text-paper text-[14px] placeholder:text-[#888]"
        />
        <button
          type="submit"
          disabled={submitting || done}
          className="font-mono text-[12px] font-bold border-0 py-3 px-5 rounded-full cursor-pointer tracking-[0.02em] hover:scale-[1.03] transition-transform disabled:opacity-80"
          style={{
            background: done ? "var(--color-ink)" : "var(--color-mint)",
            color: done ? "var(--color-paper)" : "var(--color-ink)",
            border: done ? "1px solid var(--color-paper)" : "none",
          }}
        >
          {done ? "Inscrit ✓" : submitting ? "…" : "Je rejoins →"}
        </button>
      </form>
      <div className="font-mono text-[11px] text-ink-2">
        {position !== null ? (
          <>
            <span className="text-ink font-bold">#{position}</span> sur la liste · on te contacte très vite
          </>
        ) : (
          <>
            <span className="text-ink font-bold">312</span> personnes déjà inscrites · lancement dans 1-2 semaines
          </>
        )}
      </div>
      {error && <p className="text-[12px] text-alert mt-3">{error}</p>}
    </>
  );
}

/* ---------- Content ---------- */

const TICKER_ITEMS = [
  <><span className="text-mint font-bold">37</span>&nbsp;départements en restriction d'eau cet été</>,
  <><span className="text-mint font-bold">44%</span>&nbsp;des oiseaux des champs disparus depuis 1989</>,
  <>plans climat alignés <span className="text-mint font-bold">&nbsp;+3,2°C</span>&nbsp;vs objectif 1,5°C</>,
  <><span className="text-mint font-bold">450M$</span>&nbsp;de condamnation pour pollution aux PFAS</>,
];

const PROBLEMS = [
  {
    stat: "0%",
    color: "alert",
    text: "de visibilité réelle sur ce que financent la plupart des contrats d'assurance-vie classiques.",
  },
  {
    stat: "∞",
    color: "solar",
    text: "de jargon financier entre toi et une décision qui devrait pourtant t'appartenir.",
  },
  {
    stat: "1",
    color: "ice",
    text: "seule app qui relie concrètement ton portefeuille à son impact réel sur le monde.",
  },
];

const STEPS = [
  {
    icon: "①",
    bg: "mint",
    fg: "ink",
    title: "Vois ton impact",
    text: "Ton portefeuille devient une lecture visuelle — chaque investissement a une couleur, une histoire, une réalité concrète derrière lui.",
  },
  {
    icon: "②",
    bg: "volt",
    fg: "paper",
    title: "Comprends avec Ethi",
    text: "Notre IA intégrée répond à tes questions en clair, sans jargon, sans te pousser vers un produit qu'elle vendrait.",
  },
  {
    icon: "③",
    bg: "solar",
    fg: "ink",
    title: "Investis aligné",
    text: "Choisis où va ton argent en connaissance de cause — pas après coup, dans un rapport annuel illisible.",
  },
];
