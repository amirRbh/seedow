import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useLang } from "@/hooks/useLang";
import { formatCurrency } from "@/lib/format";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import { BottomNavigation } from "@/components/navigation/BottomNavigation";
import { AppHeader } from "@/components/navigation/AppHeader";
import { useAuth } from "@/hooks/useAuth";
import { generatePortfolio } from "@/lib/portfolio/server.functions";
import { triggerMarketRefresh } from "@/lib/market/refresh.functions";
import { getRecentCronRuns, type CronRunEntry } from "@/lib/market/cron.functions";
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
  const { t } = useTranslation();
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [section, setSection] = useState<SectionKey>("portefeuille");

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [authLoading, user, navigate]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <p className="text-[12px] text-ink-3">{t("common.loading")}</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-paper">
      <div className="max-w-lg mx-auto pb-28">
        <AppHeader
          eyebrow={t("reglages.eyebrow")}
          title={t("reglages.title")}
          subtitle={t("reglages.subtitle")}
          hideSettings
        />

        {/* Onglets */}
        <nav className="px-5 border-b border-paper-3">
          <div className="flex gap-1 -mb-px overflow-x-auto scrollbar-hide">
            {(
              [
                ["portefeuille", t("reglages.tab_portfolio")],
                ["profil", t("reglages.tab_profile")],
                ["notifications", t("reglages.tab_notifications")],
                ["methodologie", t("reglages.tab_methodology")],
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
  const { t } = useTranslation();
  const { lang } = useLang();
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

  type PreviewLine = { id: string; ticker: string; name: string; asset_class: string; weight: number };
  type SelectedAsset = { id: string; ticker: string; name: string; asset_class: string };
  const [preview, setPreview] = useState<{ lines: PreviewLine[]; esg: number; ter: number } | null>(null);

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
        .then((res) => {
          const weights = (res as { weights: Record<string, number> }).weights ?? {};
          const selected = (res as { selected: SelectedAsset[] }).selected ?? [];
          const metrics = (res as { metrics: { esg_score: number; ter: number } }).metrics;
          const lines = selected
            .map((s) => ({ ...s, weight: weights[s.id] ?? 0 }))
            .sort((a, b) => b.weight - a.weight)
            .slice(0, 3);
          setPreview({ lines, esg: metrics?.esg_score ?? 0, ter: metrics?.ter ?? 0 });
          setStatus("saved");
        })
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
    return <p className="text-[12px] text-ink-3">{t("reglages.loading_prefs")}</p>;
  }

  return (
    <div className="space-y-6">
      <StatusBanner status={status} errorMsg={errorMsg} />

      {preview && (
        <motion.div
          key={preview.lines.map((l) => l.id + l.weight.toFixed(3)).join("|")}
          initial={{ opacity: 0, y: -2 }}
          animate={{ opacity: 1, y: 0 }}
          className="border border-paper-3 rounded-lg p-4 bg-paper-2"
        >
          <div className="flex items-baseline justify-between mb-3">
            <p className="text-[10px] uppercase tracking-[0.15em] text-ink-3 font-medium">
              Aperçu live
            </p>
            <div className="flex gap-3 text-[11px] text-ink-3">
              <span>{t("reglages.preview_esg")} <span className="text-ink font-value tabular-nums">{preview.esg.toFixed(1)}</span></span>
              <span>{t("reglages.preview_ter")} <span className="text-ink font-value tabular-nums">{(preview.ter * 100).toFixed(2)}%</span></span>
            </div>
          </div>
          <ul className="space-y-1.5">
            {preview.lines.map((l) => (
              <li key={l.id} className="flex items-center gap-3 text-[12px]">
                <span className="font-value text-ink-2 w-12 tabular-nums shrink-0">{l.ticker}</span>
                <span className="flex-1 text-ink truncate">{l.name}</span>
                <span className="font-value tabular-nums text-ink w-12 text-right">
                  {(l.weight * 100).toFixed(1)}%
                </span>
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      <Block title={t("reglages.block_causes")}>
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

      <Block title={t("reglages.block_exclusions")}>
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

      <Block title={t("reglages.block_risk")}>
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-[12px] text-ink-2">{t("reglages.risk_label")}</span>
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
          <span>{t("reglages.risk_prudent")}</span>
          <span>{t("reglages.risk_balanced")}</span>
          <span>{t("reglages.risk_dynamic")}</span>
        </div>
      </Block>

      <Block title={t("reglages.block_horizon")}>
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-[12px] text-ink-2">Durée d'investissement</span>
          <span className="text-[13px] font-medium tabular-nums">{t("reglages.years", { n: horizon })}</span>
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

      <Block title={t("reglages.block_initial")}>
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-[12px] text-ink-2">{t("reglages.initial_label")}</span>
          <span className="text-[13px] font-medium tabular-nums">
            {formatCurrency(amount, lang)}
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
  const { t } = useTranslation();
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
      <Block title={t("reglages.block_identity")}>
        <label className="text-[11px] text-ink-3 block mb-1">{t("reglages.email_label")}</label>
        <p className="text-[13px] text-ink mb-4">{email}</p>

        <label className="text-[11px] text-ink-3 block mb-1">{t("reglages.display_name_label")}</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={60}
            className="flex-1 border border-paper-3 rounded px-3 py-2 text-[13px] focus:border-ink outline-none transition-colors"
            placeholder={t("reglages.display_name_placeholder")}
          />
          <button
            onClick={saveName}
            disabled={savingName}
            className="px-4 py-2 text-[12px] font-medium border border-ink text-ink rounded hover:bg-ink hover:text-paper transition-colors disabled:opacity-50"
          >
            {savingName ? "…" : t("reglages.save")}
          </button>
        </div>
      </Block>

      <Block title={t("reglages.block_security")}>
        <button
          onClick={() => navigate({ to: "/auth" })}
          className="text-[13px] text-ink-2 hover:text-ink underline-offset-2 hover:underline"
        >
          Changer mon mot de passe
        </button>
      </Block>

      <Block title={t("reglages.block_session")}>
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
  const { t } = useTranslation();
  const [emailNotif, setEmailNotif] = useState(true);
  const [marketAlerts, setMarketAlerts] = useState(false);
  const [reportMonthly, setReportMonthly] = useState(true);

  return (
    <div className="space-y-6">
      <Block title={t("reglages.block_email_notifs")}>
        <ToggleRow label={t("reglages.notif_recap")} checked={emailNotif} onChange={setEmailNotif} />
        <ToggleRow label={t("reglages.notif_market")} checked={marketAlerts} onChange={setMarketAlerts} />
        <ToggleRow label="Rapport d'impact mensuel" checked={reportMonthly} onChange={setReportMonthly} />
      </Block>

      <Block title={t("reglages.block_privacy")}>
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

function MarketDataBlock() {
  const { t } = useTranslation();
  const refresh = useServerFn(triggerMarketRefresh);
  const [state, setState] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [msg, setMsg] = useState<string | null>(null);

  const onClick = async () => {
    setState("loading");
    setMsg(null);
    try {
      const res = await refresh();
      setState("ok");
      setMsg(`${res.ok} actif(s) mis à jour${res.failed ? `, ${res.failed} en échec` : ""}.`);
    } catch (e) {
      setState("error");
      setMsg(e instanceof Error ? e.message : "Erreur de rafraîchissement");
    }
  };

  return (
    <Block title={t("reglages.methodology.market_data.title")}>
      <p className="text-[12px] text-ink-2 leading-relaxed mb-3">
        Les prix sont rafraîchis automatiquement chaque jour ouvré en fin de séance.
        Tu peux forcer une mise à jour immédiate ici.
      </p>
      <button
        onClick={onClick}
        disabled={state === "loading"}
        className="px-4 py-2 text-[12px] font-medium border border-ink text-ink rounded hover:bg-ink hover:text-paper transition-colors disabled:opacity-50"
      >
        {state === "loading" ? t("reglages.methodology.market_data.refreshing") : t("reglages.methodology.market_data.refresh")}
      </button>
      {msg && (
        <p className={`text-[11px] mt-2 ${state === "error" ? "text-rust" : "text-ink-3"}`}>
          {msg}
        </p>
      )}
    </Block>
  );
}

function CronHealthBlock() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const fetchRuns = useServerFn(getRecentCronRuns);
  const [runs, setRuns] = useState<CronRunEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchRuns()
      .then((res) => {
        if (!cancelled) setRuns(res.runs);
      })
      .catch((e) => console.error("[cron-health]", e))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchRuns]);

  const lastRun = runs[0];
  const lastOk = runs.find((r) => r.status === "ok");
  const ageHours = lastOk
    ? Math.round((Date.now() - new Date(lastOk.ran_at).getTime()) / 3_600_000)
    : null;

  return (
    <Block title={t("reglages.methodology.health.title")}>
      {loading ? (
        <p className="text-[12px] text-ink-3">Chargement de l'historique…</p>
      ) : runs.length === 0 ? (
        <p className="text-[12px] text-ink-3">
          Aucune exécution journalisée pour l'instant. Force un rafraîchissement ci-dessus
          pour démarrer le suivi.
        </p>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-3">
            <span
              className={`w-2 h-2 rounded-full ${
                lastRun?.status === "ok"
                  ? "bg-moss-1"
                  : lastRun?.status === "partial"
                    ? "bg-gold"
                    : "bg-rust"
              }`}
            />
            <p className="text-[12px] text-ink-2">
              Dernier succès&nbsp;:
              <span className="text-ink font-medium ml-1">
                {ageHours != null ? t("reglages.methodology.health.ago_hours", { count: ageHours }) : t("reglages.methodology.health.never")}
              </span>
            </p>
          </div>
          <ul className="space-y-1.5">
            {runs.map((r) => (
              <li
                key={r.id}
                className="flex items-center gap-2 text-[11px] py-1.5 border-b border-paper-3 last:border-b-0"
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    r.status === "ok"
                      ? "bg-moss-1"
                      : r.status === "partial"
                        ? "bg-gold"
                        : "bg-rust"
                  }`}
                />
                <span className="text-ink-3 tabular-nums w-28 flex-shrink-0">
                  {new Date(r.ran_at).toLocaleString(lang === "fr" ? "fr-FR" : "en-US", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span className="text-ink truncate flex-1">{r.message ?? "—"}</span>
                {r.duration_ms != null && (
                  <span className="text-ink-3 tabular-nums flex-shrink-0">
                    {(r.duration_ms / 1000).toFixed(1)}s
                  </span>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </Block>
  );
}

function MethodologySection() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <MarketDataBlock />
      <CronHealthBlock />
      <Block title={t("reglages.methodology.pipeline.title")}>
        <p className="text-[12px] text-ink-2 leading-relaxed mb-4">
          Six étapes traçables : profilage, univers investissable, exclusions sectorielles, filtres
          best-in-class ESG, optimisation Markowitz contrainte (plancher ESG, budget de risque, bornes
          de poids), puis tilt pré-optimisation des rendements attendus selon vos causes. Le simulateur
          interactif et la documentation détaillée sont sur la page dédiée.
        </p>
        <Link
          to="/methodologie"
          className="inline-flex items-center gap-2 text-[12px] font-medium text-ink underline-offset-2 hover:underline"
        >
          Consulter la méthodologie complète
          <span aria-hidden>→</span>
        </Link>
      </Block>

      <Block title={t("reglages.methodology.sources.title")}>
        <ul className="text-[12px] text-ink-2 space-y-1.5 leading-relaxed">
          <li>{t("reglages.methodology.sources.esg")} (E/S/G) : MSCI ESG Research, Sustainalytics, ESG Book, Yahoo Sustainability</li>
          <li>{t("reglages.methodology.sources.carbon")} (gCO₂e/€ investi) : Trucost, ISS ESG, Yahoo Sustainability — avec date et provider stockés par actif</li>
          <li>{t("reglages.methodology.sources.sfdr")} : prospectus émetteurs (iShares, Lyxor, Amundi)</li>
          <li>{t("reglages.methodology.sources.prices")} : Yahoo Finance, séries historiques 5 ans, covariances recalculées hebdomadairement</li>
        </ul>
      </Block>

      <Block title={t("reglages.methodology.esg_composite.title")}>
        <p className="text-[12px] text-ink-2 leading-relaxed mb-4">
          Le score ESG va de <span className="font-value">0</span> à <span className="font-value">100</span>.
          Au lieu d'une moyenne fixe 40/40/20, <span className="font-medium text-ink">les piliers E, S et G
          sont repondérés en fonction des causes que vous activez</span> dans vos préférences. Le score reflète
          ainsi ce qui compte vraiment pour vous.
        </p>

        <div className="space-y-4">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-ink-3 font-semibold mb-2">
              1. Trois piliers indépendants
            </p>
            <ul className="text-[12px] text-ink-2 space-y-1.5 leading-relaxed">
              <li>
                <span className="font-medium text-ink">Environnement (E)</span> — {t("reglages.methodology.esg_composite.pillar_e")} scope 1-2-3,
                intensité carbone, eau, déchets, exposition renouvelables.
              </li>
              <li>
                <span className="font-medium text-ink">Social (S)</span> — {t("reglages.methodology.esg_composite.pillar_s")}, conditions de
                travail, égalité F/H, sécurité produit, relations communautés.
              </li>
              <li>
                <span className="font-medium text-ink">Gouvernance (G)</span> — {t("reglages.methodology.esg_composite.pillar_g")},
                rémunération dirigeants, éthique fiscale, transparence, anti-corruption.
              </li>
            </ul>
            <p className="text-[11px] text-ink-3 mt-2 leading-relaxed">
              Quand un pilier n'est pas publié pour un actif, on retombe automatiquement sur le score ESG
              global comme valeur de repli (fallback documenté).
            </p>
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-wider text-ink-3 font-semibold mb-2">
              2. Mapping causes → piliers (codé en dur)
            </p>
            <ul className="text-[12px] text-ink-2 space-y-1.5 leading-relaxed">
              <li>• <span className="font-medium text-ink">{t("reglages.methodology.esg_composite.mapping_e")}</span></li>
              <li>• <span className="font-medium text-ink">{t("reglages.methodology.esg_composite.mapping_s")}</span></li>
              <li>• <span className="font-medium text-ink">{t("reglages.methodology.esg_composite.mapping_sg")}</span></li>
            </ul>
            <p className="text-[11px] text-ink-3 mt-2 leading-relaxed">
              Sans cause active, on revient à la pondération neutre 40/40/20. Plus vous activez de causes
              liées à un pilier, plus son poids dans le score composite augmente.
            </p>
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-wider text-ink-3 font-semibold mb-2">
              3. Score du portefeuille
            </p>
            <p className="text-[12px] text-ink-2 leading-relaxed">
              C'est la <span className="font-medium text-ink">moyenne pondérée</span> du score composite de
              chaque ligne par son poids. Un plancher ESG par défaut de <span className="font-value">70</span>
              est imposé à l'optimiseur ; s'il ne trouve aucune solution réalisable, le plancher est relâché
              et un drapeau <span className="font-mono text-[11px]">esg_floor_relaxed</span> est levé pour
              transparence.
            </p>
          </div>

          <div className="pt-2 border-t border-paper-3">
            <p className="text-[11px] uppercase tracking-wider text-ink-3 font-semibold mb-2">
              Échelle de lecture
            </p>
            <div className="grid grid-cols-4 gap-1.5 text-[10px]">
              <div className="rounded border border-paper-3 p-2">
                <p className="font-value text-ink">0–40</p>
                <p className="text-ink-3">{t("reglages.methodology.esg_composite.scale_low")}</p>
              </div>
              <div className="rounded border border-paper-3 p-2">
                <p className="font-value text-ink">40–60</p>
                <p className="text-ink-3">{t("reglages.methodology.esg_composite.scale_medium")}</p>
              </div>
              <div className="rounded border border-moss-4 bg-moss-5 p-2">
                <p className="font-value text-moss-1">60–80</p>
                <p className="text-moss-1">{t("reglages.methodology.esg_composite.scale_good")}</p>
              </div>
              <div className="rounded border border-moss-2 bg-moss-5 p-2">
                <p className="font-value text-moss-1">80–100</p>
                <p className="text-moss-1">{t("reglages.methodology.esg_composite.scale_excellent")}</p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-ink-3 leading-relaxed mt-4 pt-3 border-t border-paper-3">
          ⚠️ Une note ESG reste une <span className="font-medium">estimation</span> dépendante de la qualité
          des données publiées. Chaque actif stocke la <span className="font-medium">source</span> du score
          (<span className="font-mono text-[11px]">esg_score_source</span>) pour auditabilité.
        </p>
      </Block>

      <Block title={t("reglages.methodology.carbon.title")}>
        <p className="text-[12px] text-ink-2 leading-relaxed mb-3">
          Deux indicateurs cohabitent volontairement, le temps que la couverture en données réelles atteigne
          100% du portefeuille :
        </p>
        <ul className="text-[12px] text-ink-2 space-y-2 leading-relaxed">
          <li>
            • <span className="font-medium text-ink">CO₂ évité (heuristique)</span> — {t("reglages.methodology.carbon.avoided")} indicative
            dérivée du score ESG composite. Pratique pour comparer deux portefeuilles, pas une figure
            réglementaire.
          </li>
          <li>
            • <span className="font-medium text-ink">Intensité carbone réelle</span> — {t("reglages.methodology.carbon.intensity")} pondérée des
            <span className="font-mono text-[11px]"> gCO₂e/€ investi/an</span> sur la part du portefeuille
            réellement couverte par un provider (champs <span className="font-mono text-[11px]">carbon_intensity_*</span>
            avec source et date de mise à jour). Un indicateur de couverture est affiché dans la page
            méthodologie.
          </li>
        </ul>

        <div className="mt-4 rounded border border-paper-3 bg-paper-2 p-3">
          <p className="text-[11px] uppercase tracking-wider text-ink-3 font-semibold mb-2">
            Couverture faible ? Voici quoi faire
          </p>
          <ul className="text-[12px] text-ink-2 space-y-1.5 leading-relaxed mb-3">
            <li>{t("reglages.methodology.carbon.coverage_low")} à l'heuristique CO₂ évité, l'intensité réelle n'est pas représentative.</li>
            <li>{t("reglages.methodology.carbon.coverage_medium")} indicative, à recouper avec l'ESG composite.</li>
            <li>{t("reglages.methodology.carbon.coverage_high")} fiable, utilisable pour reporting interne.</li>
          </ul>
          <Link
            to="/methodologie"
            className="inline-flex items-center gap-2 text-[12px] font-medium text-ink underline-offset-2 hover:underline"
          >
            Voir la couverture de mon portefeuille
            <span aria-hidden>→</span>
          </Link>
        </div>
      </Block>

      <Block title={t("reglages.methodology.optimization.title")}>
        <p className="text-[12px] text-ink-2 leading-relaxed">
          Maximisation de l'utilité moyenne-variance avec contraintes : somme des poids = 1, poids ≥ 0,
          plancher par actif, plafond par actif et par classe, budget de risque (volatilité cible),
          plancher ESG composite. Les <span className="font-medium text-ink">rendements attendus sont tiltés
          en amont</span> selon vos causes (single-tilt pré-optimisation) — pas de double-tilt en sortie pour
          ne pas biaiser la frontière efficiente.
        </p>
      </Block>

      <Block title={t("reglages.methodology.version.title")}>
        <p className="text-[12px] text-ink-2">
          Méthodologie <span className="font-value">v1.1</span> · piliers E/S/G pondérés par causes,
          intensité carbone réelle, traçabilité des sources. Révisée trimestriellement.
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
