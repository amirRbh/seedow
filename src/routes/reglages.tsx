import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import { BottomNavigation } from "@/components/navigation/BottomNavigation";
import { AppHeader } from "@/components/navigation/AppHeader";
import { useAuth } from "@/hooks/useAuth";
import { generatePortfolio } from "@/lib/portfolio/server.functions";
import { callAuthed } from "@/lib/authedServerFn";
import { supabase } from "@/integrations/supabase/client";
import type { CauseTag, ExclusionTag } from "@/lib/portfolio/types";

export const Route = createFileRoute("/reglages")({
  head: () => ({
    meta: [
      { title: "Réglages — Seedow" },
      { name: "description", content: "Gérez votre profil, vos préférences d'investissement et vos notifications." },
    ],
  }),
  component: ReglagesPage,
});

const CAUSES: { id: CauseTag; label: string }[] = [
  { id: "climat", label: "Climat" },
  { id: "biodiversite", label: "Biodiversité" },
  { id: "humain", label: "Droits humains" },
  { id: "egalite", label: "Égalité F/H" },
  { id: "tech", label: "Tech éthique" },
  { id: "circulaire", label: "Économie circulaire" },
];

const EXCLUSIONS: { id: ExclusionTag; label: string }[] = [
  { id: "fossiles", label: "Énergies fossiles" },
  { id: "armes", label: "Armement" },
  { id: "tabac", label: "Tabac" },
  { id: "jeux", label: "Jeux d'argent" },
  { id: "animaux", label: "Tests animaux" },
  { id: "fast-fashion", label: "Fast fashion" },
];

type SectionKey = "profil" | "portefeuille" | "notifications" | "methodologie";

function ReglagesPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [section, setSection] = useState<SectionKey>("portefeuille");

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [authLoading, user, navigate]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <p className="text-[12px] text-ink-3">Chargement…</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-paper">
      <div className="max-w-lg mx-auto pb-28">
        <AppHeader
          eyebrow="Espace personnel"
          title="Réglages"
          subtitle="Profil, préférences, transparence."
          hideSettings
        />

        {/* Onglets */}
        <nav className="px-5 border-b border-paper-3">
          <div className="flex gap-1 -mb-px overflow-x-auto scrollbar-hide">
            {(
              [
                ["portefeuille", "Portefeuille"],
                ["profil", "Profil"],
                ["notifications", "Notifications"],
                ["methodologie", "Méthodologie"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setSection(key)}
                className={`text-[12px] py-2.5 px-3 border-b transition-colors whitespace-nowrap ${
                  section === key
                    ? "border-ink text-ink font-medium"
                    : "border-transparent text-ink-3 hover:text-ink-2"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </nav>

        <div className="px-5 pt-6 space-y-6">
          {section === "portefeuille" && <PreferencesSection />}
          {section === "profil" && <ProfileSection email={user.email ?? ""} onSignOut={signOut} />}
          {section === "notifications" && <NotificationsSection />}
          {section === "methodologie" && <MethodologySection />}
        </div>
      </div>
      <BottomNavigation />
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────
// Préférences portefeuille (recalcul auto debouncé)
// ─────────────────────────────────────────────────────────

function PreferencesSection() {
  const { user } = useAuth();
  const generate = useServerFn(generatePortfolio);

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [causes, setCauses] = useState<CauseTag[]>([]);
  const [intensity, setIntensity] = useState<Record<string, number>>({});
  const [exclusions, setExclusions] = useState<ExclusionTag[]>([]);
  const [risk, setRisk] = useState(0.09);
  const [horizon, setHorizon] = useState(10);
  const [amount, setAmount] = useState(1000);

  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstLoadRef = useRef(true);

  // Charger le portefeuille actif
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("portfolios")
        .select("causes, cause_intensity, exclusions, risk_target, horizon_years, initial_amount")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.error("[reglages] load portfolio:", error);
      } else if (data) {
        setCauses((data.causes ?? []) as CauseTag[]);
        setIntensity((data.cause_intensity ?? {}) as Record<string, number>);
        setExclusions((data.exclusions ?? []) as ExclusionTag[]);
        setRisk(Number(data.risk_target ?? 0.09));
        setHorizon(Number(data.horizon_years ?? 10));
        setAmount(Number(data.initial_amount ?? 1000));
      }
      setLoadingInitial(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Recalcul auto debouncé
  useEffect(() => {
    if (loadingInitial) return;
    // Skip the first run after loading completes — état restauré, pas un changement
    if (firstLoadRef.current) {
      firstLoadRef.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setStatus("saving");
    setErrorMsg(null);
    debounceRef.current = setTimeout(() => {
      callAuthed(generate, {
        causes,
        cause_intensity: intensity,
        exclusions,
        risk_target: risk,
        horizon_years: horizon,
        initial_amount: amount,
      })
        .then(() => setStatus("saved"))
        .catch((err: unknown) => {
          console.error("[reglages] generate:", err);
          setStatus("error");
          setErrorMsg(err instanceof Error ? err.message : "Erreur de recalcul");
        });
    }, 700);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [causes, intensity, exclusions, risk, horizon, amount, generate, loadingInitial]);

  const toggleCause = (id: CauseTag) => {
    setCauses((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((x) => x !== id);
        const newInt = { ...intensity };
        delete newInt[id];
        setIntensity(newInt);
        return next;
      }
      setIntensity({ ...intensity, [id]: 0.5 });
      return [...prev, id];
    });
  };

  const toggleExclusion = (id: ExclusionTag) => {
    setExclusions((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  if (loadingInitial) {
    return <p className="text-[12px] text-ink-3">Chargement de vos préférences…</p>;
  }

  return (
    <div className="space-y-6">
      <StatusBanner status={status} errorMsg={errorMsg} />

      <Block title="Causes & intensité">
        <div className="space-y-3">
          {CAUSES.map((c) => {
            const active = causes.includes(c.id);
            return (
              <div key={c.id} className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => toggleCause(c.id)}
                  className={`w-4 h-4 rounded-sm border flex items-center justify-center flex-shrink-0 transition-colors ${
                    active ? "bg-ink border-ink" : "bg-paper border-paper-3 hover:border-ink"
                  }`}
                  aria-label={c.label}
                >
                  {active && (
                    <svg width="10" height="8" viewBox="0 0 10 8">
                      <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
                <label className="text-[13px] text-ink min-w-[110px]">{c.label}</label>
                {active && (
                  <>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={intensity[c.id] ?? 0.5}
                      onChange={(e) => setIntensity({ ...intensity, [c.id]: Number(e.target.value) })}
                      className="flex-1 accent-ink h-1"
                    />
                    <span className="text-[11px] text-ink-3 tabular-nums w-10 text-right">
                      {Math.round((intensity[c.id] ?? 0.5) * 100)}%
                    </span>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </Block>

      <Block title="Exclusions sectorielles">
        <div className="grid grid-cols-2 gap-2">
          {EXCLUSIONS.map((e) => {
            const active = exclusions.includes(e.id);
            return (
              <button
                key={e.id}
                onClick={() => toggleExclusion(e.id)}
                className={`flex items-center gap-2 p-2.5 rounded border text-left text-[12px] transition-colors ${
                  active ? "bg-ink/5 border-ink text-ink" : "bg-paper border-paper-3 text-ink-2 hover:border-ink-3"
                }`}
              >
                <span className={`w-3 h-3 rounded-sm border flex-shrink-0 ${active ? "bg-ink border-ink" : "border-paper-3"}`} />
                {e.label}
              </button>
            );
          })}
        </div>
      </Block>

      <Block title="Risque cible">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-[12px] text-ink-2">Volatilité annuelle visée</span>
          <span className="text-[13px] font-medium tabular-nums">{(risk * 100).toFixed(1)}%</span>
        </div>
        <input
          type="range"
          min={0.04}
          max={0.18}
          step={0.005}
          value={risk}
          onChange={(e) => setRisk(Number(e.target.value))}
          className="w-full accent-ink"
        />
        <div className="flex justify-between text-[10px] text-ink-3 mt-1">
          <span>Prudent</span>
          <span>Équilibré</span>
          <span>Dynamique</span>
        </div>
      </Block>

      <Block title="Horizon">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-[12px] text-ink-2">Durée d'investissement</span>
          <span className="text-[13px] font-medium tabular-nums">{horizon} ans</span>
        </div>
        <input
          type="range"
          min={1}
          max={30}
          step={1}
          value={horizon}
          onChange={(e) => setHorizon(Number(e.target.value))}
          className="w-full accent-ink"
        />
      </Block>

      <Block title="Montant initial">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-[12px] text-ink-2">Capital de référence</span>
          <span className="text-[13px] font-medium tabular-nums">
            {amount.toLocaleString("fr-FR")} €
          </span>
        </div>
        <input
          type="range"
          min={100}
          max={50000}
          step={100}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="w-full accent-ink"
        />
      </Block>

      <p className="text-[11px] text-ink-3 leading-relaxed">
        Toute modification déclenche un recalcul automatique de votre portefeuille selon le pipeline complet
        (exclusions → best-in-class → optimisation Markowitz contrainte → tilts par convictions).
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Profil & compte
// ─────────────────────────────────────────────────────────

function ProfileSection({ email, onSignOut }: { email: string; onSignOut: () => Promise<void> }) {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("display_name").eq("id", user.id).single().then(({ data }) => {
      if (data?.display_name) setDisplayName(data.display_name);
    });
  }, [user]);

  const saveName = async () => {
    if (!user) return;
    setSavingName(true);
    await supabase.from("profiles").update({ display_name: displayName }).eq("id", user.id);
    setSavingName(false);
  };

  return (
    <div className="space-y-6">
      <Block title="Identité">
        <label className="text-[11px] text-ink-3 block mb-1">Adresse email</label>
        <p className="text-[13px] text-ink mb-4">{email}</p>

        <label className="text-[11px] text-ink-3 block mb-1">Nom affiché</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={60}
            className="flex-1 border border-paper-3 rounded px-3 py-2 text-[13px] focus:border-ink outline-none transition-colors"
            placeholder="Votre nom"
          />
          <button
            onClick={saveName}
            disabled={savingName}
            className="px-4 py-2 text-[12px] font-medium border border-ink text-ink rounded hover:bg-ink hover:text-paper transition-colors disabled:opacity-50"
          >
            {savingName ? "…" : "Enregistrer"}
          </button>
        </div>
      </Block>

      <Block title="Sécurité">
        <button
          onClick={() => navigate({ to: "/auth" })}
          className="text-[13px] text-ink-2 hover:text-ink underline-offset-2 hover:underline"
        >
          Changer mon mot de passe
        </button>
      </Block>

      <Block title="Session">
        <button
          onClick={async () => {
            await onSignOut();
            navigate({ to: "/auth" });
          }}
          className="px-4 py-2 text-[12px] font-medium border border-paper-3 text-ink rounded hover:border-ink transition-colors"
        >
          Se déconnecter
        </button>
      </Block>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Notifications & confidentialité (maquette)
// ─────────────────────────────────────────────────────────

function NotificationsSection() {
  const [emailNotif, setEmailNotif] = useState(true);
  const [marketAlerts, setMarketAlerts] = useState(false);
  const [reportMonthly, setReportMonthly] = useState(true);

  return (
    <div className="space-y-6">
      <Block title="Notifications email">
        <ToggleRow label="Récapitulatifs et nouveautés" checked={emailNotif} onChange={setEmailNotif} />
        <ToggleRow label="Alertes de marché significatives" checked={marketAlerts} onChange={setMarketAlerts} />
        <ToggleRow label="Rapport d'impact mensuel" checked={reportMonthly} onChange={setReportMonthly} />
      </Block>

      <Block title="Confidentialité">
        <p className="text-[12px] text-ink-2 leading-relaxed mb-3">
          Vos données restent strictement confidentielles. Vous pouvez exporter ou supprimer
          l'ensemble de vos informations à tout moment.
        </p>
        <div className="flex flex-wrap gap-2">
          <button className="px-3 py-1.5 text-[12px] border border-paper-3 rounded hover:border-ink transition-colors">
            Exporter mes données
          </button>
          <button className="px-3 py-1.5 text-[12px] border border-paper-3 text-rust rounded hover:border-rust transition-colors">
            Supprimer mon compte
          </button>
        </div>
      </Block>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-paper-3 last:border-b-0">
      <span className="text-[13px] text-ink">{label}</span>
      <button
        onClick={() => onChange(!checked)}
        className={`w-9 h-5 rounded-full transition-colors relative ${checked ? "bg-ink" : "bg-paper-3"}`}
        aria-pressed={checked}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 bg-paper rounded-full transition-transform ${
            checked ? "translate-x-[18px]" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Méthodologie & transparence
// ─────────────────────────────────────────────────────────

function MethodologySection() {
  return (
    <div className="space-y-6">
      <Block title="Pipeline de construction">
        <p className="text-[12px] text-ink-2 leading-relaxed mb-4">
          Cinq étapes transparentes : profilage, univers, filtres ESG, optimisation Markowitz contrainte,
          puis tilts par convictions. Toute la documentation et le simulateur interactif sont disponibles
          sur la page dédiée.
        </p>
        <Link
          to="/methodologie"
          className="inline-flex items-center gap-2 text-[12px] font-medium text-ink underline-offset-2 hover:underline"
        >
          Consulter la méthodologie complète
          <span aria-hidden>→</span>
        </Link>
      </Block>

      <Block title="Sources de données">
        <ul className="text-[12px] text-ink-2 space-y-1.5 leading-relaxed">
          <li>• Notations ESG : MSCI ESG Research, Sustainalytics</li>
          <li>• Classification SFDR : prospectus émetteurs (iShares, Lyxor, Amundi)</li>
          <li>• Volatilités et corrélations : séries historiques 5 ans</li>
        </ul>
      </Block>

      <Block title="Version du moteur">
        <p className="text-[12px] text-ink-2">
          Méthodologie <span className="font-value">v1.0</span> · révisée trimestriellement.
        </p>
      </Block>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Helpers UI
// ─────────────────────────────────────────────────────────

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.15em] text-ink-3 font-medium border-b border-paper-3 pb-2 mb-3">
        {title}
      </p>
      {children}
    </div>
  );
}

function StatusBanner({ status, errorMsg }: { status: "idle" | "saving" | "saved" | "error"; errorMsg: string | null }) {
  const label = useMemo(() => {
    switch (status) {
      case "saving":
        return "Recalcul en cours…";
      case "saved":
        return "Portefeuille mis à jour";
      case "error":
        return errorMsg ?? "Erreur";
      default:
        return null;
    }
  }, [status, errorMsg]);

  if (!label) return null;

  const tone =
    status === "error"
      ? "border-rust/40 text-rust bg-[oklch(0.97_0.02_45)]"
      : status === "saved"
        ? "border-moss-1/30 text-moss-1 bg-moss-5"
        : "border-paper-3 text-ink-3 bg-paper-2";

  return (
    <motion.div
      key={status + (errorMsg ?? "")}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className={`text-[11px] px-3 py-2 rounded border flex items-center gap-2 ${tone}`}
    >
      {status === "saving" && <span className="inline-block w-2 h-2 rounded-full bg-ink-3 animate-pulse" />}
      {label}
    </motion.div>
  );
}
