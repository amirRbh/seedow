import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActivePortfolio } from "@/hooks/useActivePortfolio";

export type AlertSeverity = "info" | "warn" | "alert";
export type AlertKind =
  | "esg_drift"
  | "rebalance"
  | "missed_contribution"
  | "performance"
  | "fresh_quotes"
  | "concentration";

export interface SmartAlert {
  id: string;
  kind: AlertKind;
  severity: AlertSeverity;
  title: string;
  body: string;
  ctaLabel?: string;
  ctaHref?: string;
  createdAt: string; // ISO
  readAt?: string | null;
  dedupKey: string;
}

interface State {
  alerts: SmartAlert[];
  unread: number;
  loading: boolean;
  markAllRead: () => Promise<void>;
  dismiss: (id: string) => Promise<void>;
}

const SEVERITY_RANK: Record<AlertSeverity, number> = { alert: 3, warn: 2, info: 1 };

/**
 * Dérive les signaux candidats à partir du portefeuille actif.
 * La persistance + statut lu/écarté est gérée par la table `alerts`.
 */
function deriveCandidates(args: {
  portfolio: ReturnType<typeof useActivePortfolio>["portfolio"];
  exclusions: string[];
  causes: string[];
}): Array<Omit<SmartAlert, "id" | "createdAt" | "readAt">> {
  const { portfolio, exclusions, causes } = args;
  if (!portfolio) return [];
  const out: Array<Omit<SmartAlert, "id" | "createdAt" | "readAt">> = [];

  const top = portfolio.holdings[0];
  if (top && top.allocationPct >= 40) {
    out.push({
      kind: "concentration",
      severity: "warn",
      title: "Concentration élevée détectée",
      body: `${top.name} pèse ${top.allocationPct.toFixed(1)} % de ton portefeuille. Un rééquilibrage permettrait de réduire ce risque.`,
      ctaLabel: "Voir l'allocation",
      ctaHref: "/portfolio",
      dedupKey: `concentration:${portfolio.id}:${top.id}`,
    });
  }

  const weak = portfolio.holdings.find((h) => h.esgScore > 0 && h.esgScore < 50);
  if (weak && causes.length > 0) {
    out.push({
      kind: "esg_drift",
      severity: "alert",
      title: "Une ligne s'éloigne de tes valeurs",
      body: `${weak.name} affiche un score d'impact de ${weak.esgScore.toFixed(0)}/100. Tu peux l'arbitrer ou ajuster tes critères.`,
      ctaLabel: "Ouvrir le profil",
      ctaHref: "/profil",
      dedupKey: `esg:${portfolio.id}:${weak.id}`,
    });
  }

  if (causes.length > 0 && exclusions.length === 0) {
    out.push({
      kind: "esg_drift",
      severity: "info",
      title: "Aucune exclusion sectorielle",
      body: "Tu soutiens des causes mais n'as exclu aucun secteur. Définir des exclusions (fossiles, tabac…) renforce la cohérence éthique.",
      ctaLabel: "Ajuster",
      ctaHref: "/onboarding",
      dedupKey: `no-exclusions:${portfolio.id}`,
    });
  }

  if (portfolio.generated_at) {
    const ageDays =
      (Date.now() - new Date(portfolio.generated_at).getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays > 30 && portfolio.initial_amount < 5000) {
      out.push({
        kind: "missed_contribution",
        severity: "info",
        title: "Pense au versement régulier",
        body: "Ajouter ne serait-ce que 50 €/mois change radicalement le capital projeté à 10 ans. Le simulateur sur ton dashboard te montre l'effet.",
        ctaLabel: "Simuler",
        ctaHref: "/dashboard",
        dedupKey: `dca-suggest:${portfolio.id}`,
      });
    }
  }

  return out;
}

export function useAlerts(): State {
  const { user } = useAuth();
  const { portfolio, loading: pfLoading } = useActivePortfolio();
  const [exclusions, setExclusions] = useState<string[]>([]);
  const [causes, setCauses] = useState<string[]>([]);
  const [loadedMeta, setLoadedMeta] = useState(false);
  const [rows, setRows] = useState<SmartAlert[]>([]);
  const [tick, setTick] = useState(0);

  // 1) Métadonnées portefeuille
  useEffect(() => {
    if (!user || !portfolio?.id) {
      setExclusions([]);
      setCauses([]);
      setLoadedMeta(true);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("portfolios")
        .select("exclusions, causes")
        .eq("id", portfolio.id)
        .maybeSingle();
      if (cancelled) return;
      setExclusions((data?.exclusions ?? []) as string[]);
      setCauses((data?.causes ?? []) as string[]);
      setLoadedMeta(true);
    })();
    return () => { cancelled = true; };
  }, [user, portfolio?.id]);

  // 2) Upsert des candidats dérivés, puis lecture depuis la table
  useEffect(() => {
    if (!user || !loadedMeta) return;
    let cancelled = false;
    (async () => {
      const candidates = deriveCandidates({ portfolio, exclusions, causes });

      if (candidates.length > 0) {
        const payload = candidates.map((c) => ({
          user_id: user.id,
          portfolio_id: portfolio?.id ?? null,
          kind: c.kind,
          severity: c.severity,
          title: c.title,
          body: c.body,
          cta_label: c.ctaLabel ?? null,
          cta_href: c.ctaHref ?? null,
          dedup_key: c.dedupKey,
        }));
        // ignore on conflict pour ne pas dupliquer (index unique partiel)
        await supabase
          .from("alerts")
          .upsert(payload, { onConflict: "user_id,dedup_key", ignoreDuplicates: true });
      }

      const { data } = await supabase
        .from("alerts")
        .select("*")
        .eq("user_id", user.id)
        .is("dismissed_at", null)
        .order("created_at", { ascending: false });

      if (cancelled || !data) return;
      setRows(
        data.map((r) => ({
          id: r.id,
          kind: r.kind as AlertKind,
          severity: r.severity as AlertSeverity,
          title: r.title,
          body: r.body,
          ctaLabel: r.cta_label ?? undefined,
          ctaHref: r.cta_href ?? undefined,
          createdAt: r.created_at,
          readAt: r.read_at,
          dedupKey: r.dedup_key,
        })),
      );
    })();
    return () => { cancelled = true; };
  }, [user, loadedMeta, portfolio, exclusions, causes, tick]);

  const sorted = useMemo(
    () => [...rows].sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]),
    [rows],
  );

  const unread = sorted.filter((a) => !a.readAt && a.severity !== "info").length;

  const markAllRead = useCallback(async () => {
    if (!user) return;
    await supabase
      .from("alerts")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("read_at", null);
    setTick((t) => t + 1);
  }, [user]);

  const dismiss = useCallback(
    async (id: string) => {
      await supabase
        .from("alerts")
        .update({ dismissed_at: new Date().toISOString() })
        .eq("id", id);
      setTick((t) => t + 1);
    },
    [],
  );

  return {
    alerts: sorted,
    unread,
    loading: pfLoading || !loadedMeta,
    markAllRead,
    dismiss,
  };
}
