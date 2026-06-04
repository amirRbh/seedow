import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActivePortfolio } from "@/hooks/useActivePortfolio";

export type AlertSeverity = "info" | "warn" | "alert";
export type AlertKind =
  | "esg_drift"
  | "rebalance"
  | "missed_contribution"
  | "performance"
  | "fresh_quotes";

export interface SmartAlert {
  id: string;
  kind: AlertKind;
  severity: AlertSeverity;
  title: string;
  body: string;
  ctaLabel?: string;
  ctaHref?: string;
  createdAt: string; // ISO
}

interface State {
  alerts: SmartAlert[];
  unread: number;
  loading: boolean;
}

const SEVERITY_RANK: Record<AlertSeverity, number> = { alert: 3, warn: 2, info: 1 };

/**
 * Compose les alertes intelligentes à partir des données du portefeuille actif.
 * Pure dérivation client — pas de table dédiée (v1).
 */
export function useAlerts(): State {
  const { user } = useAuth();
  const { portfolio, loading: pfLoading } = useActivePortfolio();
  const [exclusions, setExclusions] = useState<string[]>([]);
  const [causes, setCauses] = useState<string[]>([]);
  const [loadedMeta, setLoadedMeta] = useState(false);

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

  const alerts = useMemo<SmartAlert[]>(() => {
    if (!portfolio) return [];
    const out: SmartAlert[] = [];
    const now = new Date().toISOString();

    // 1) Dérive d'allocation — toute ligne qui s'écarte > 5 pts de sa cible
    //    (cible inconnue côté front -> on prend la moyenne uniforme comme proxy
    //    quand pas mieux ; sinon on signale les concentrations > 40 %).
    const n = portfolio.holdings.length;
    if (n > 0) {
      const top = portfolio.holdings[0];
      if (top && top.allocationPct >= 40) {
        out.push({
          id: "concentration",
          kind: "rebalance",
          severity: "warn",
          title: "Concentration élevée détectée",
          body: `${top.name} pèse ${top.allocationPct.toFixed(1)} % de ton portefeuille. Un rééquilibrage permettrait de réduire ce risque.`,
          ctaLabel: "Voir l'allocation",
          ctaHref: "/portfolio",
          createdAt: now,
        });
      }
    }

    // 2) Dérive ESG — si une ligne a un score < 50 alors qu'on a coché des causes
    const weak = portfolio.holdings.find((h) => h.esgScore > 0 && h.esgScore < 50);
    if (weak && causes.length > 0) {
      out.push({
        id: `esg-${weak.id}`,
        kind: "esg_drift",
        severity: "alert",
        title: "Une ligne s'éloigne de tes valeurs",
        body: `${weak.name} affiche un score d'impact de ${weak.esgScore.toFixed(0)}/100. Tu peux l'arbitrer ou ajuster tes critères.`,
        ctaLabel: "Ouvrir le profil",
        ctaHref: "/profil",
        createdAt: now,
      });
    }

    // 3) Exclusion : aucune définie alors qu'on a des causes -> suggestion
    if (causes.length > 0 && exclusions.length === 0) {
      out.push({
        id: "no-exclusions",
        kind: "esg_drift",
        severity: "info",
        title: "Aucune exclusion sectorielle",
        body: "Tu soutiens des causes mais n'as exclu aucun secteur. Définir des exclusions (fossiles, tabac…) renforce la cohérence éthique.",
        ctaLabel: "Ajuster",
        ctaHref: "/onboarding",
        createdAt: now,
      });
    }

    // 4) Versement récurrent manqué — heuristique : si le portefeuille a > 30 jours
    //    et que le capital initial est faible (< 5 000 €), on suggère de programmer
    //    un versement mensuel. (En v2 : croiser avec scheduled_contributions.)
    if (portfolio.generated_at) {
      const ageDays =
        (Date.now() - new Date(portfolio.generated_at).getTime()) / (1000 * 60 * 60 * 24);
      if (ageDays > 30 && portfolio.initial_amount < 5000) {
        out.push({
          id: "dca-suggest",
          kind: "missed_contribution",
          severity: "info",
          title: "Pense au versement régulier",
          body: "Ajouter ne serait-ce que 50 €/mois change radicalement le capital projeté à 10 ans. Le simulateur sur ton dashboard te montre l'effet.",
          ctaLabel: "Simuler",
          ctaHref: "/dashboard",
          createdAt: now,
        });
      }
    }

    // Tri : alerte > warn > info
    return out.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);
  }, [portfolio, causes, exclusions]);

  const unread = alerts.filter((a) => a.severity !== "info").length;
  return { alerts, unread, loading: pfLoading || !loadedMeta };
}
