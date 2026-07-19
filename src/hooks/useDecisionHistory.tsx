import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActivePortfolio } from "@/hooks/useActivePortfolio";

export type DecisionType =
  | "creation"
  | "cause"
  | "exclusion"
  | "horizon"
  | "risk"
  | "rebalance"
  | "contribution";

export interface DecisionEvent {
  id: string;
  type: DecisionType;
  date: string;
  title: string;
  detail?: string;
}

const KIND_TO_TYPE: Record<string, DecisionType> = {
  creation: "creation",
  cause_added: "cause",
  cause_removed: "cause",
  exclusion_added: "exclusion",
  exclusion_removed: "exclusion",
  horizon_changed: "horizon",
  risk_changed: "risk",
  rebalance: "rebalance",
  contribution_scheduled: "contribution",
  contribution_paused: "contribution",
};

const CAUSE_LABEL: Record<string, string> = {
  climat: "Climat",
  biodiversite: "Biodiversité",
  humain: "Droits humains",
  egalite: "Égalité F/H",
  tech: "Tech éthique",
  circulaire: "Économie circulaire",
  eau: "Eau",
  social: "Humain",
  governance: "Éthique",
};

const EXCLUSION_LABEL: Record<string, string> = {
  fossiles: "énergies fossiles",
  armes: "l'armement",
  tabac: "le tabac",
  jeux: "les jeux d'argent",
  animaux: "les tests animaux",
  "fast-fashion": "la fast fashion",
};

async function fetchDecisionHistory(userId: string, portfolioId: string): Promise<DecisionEvent[]> {
  // 1) Lire la timeline persistée
  const { data: events } = await supabase
    .from("decision_events")
    .select("id, kind, title, detail, payload, occurred_at")
    .eq("user_id", userId)
    .eq("portfolio_id", portfolioId)
    .order("occurred_at", { ascending: false })
    .limit(50);

  if (events && events.length > 0) {
    return events.map((e) => {
      const payload = (e.payload ?? {}) as Record<string, unknown>;
      const cause = typeof payload.cause === "string" ? payload.cause : null;
      const excl = typeof payload.exclusion === "string" ? payload.exclusion : null;
      let title = e.title;
      if (cause && CAUSE_LABEL[cause]) {
        title = title.replace(cause, CAUSE_LABEL[cause]);
      }
      if (excl && EXCLUSION_LABEL[excl]) {
        title = title.replace(excl, EXCLUSION_LABEL[excl]);
      }
      return {
        id: e.id,
        type: KIND_TO_TYPE[e.kind] ?? "rebalance",
        date: e.occurred_at,
        title,
        detail: e.detail ?? undefined,
      };
    });
  }

  // 2) Fallback : dérivation pour les portefeuilles legacy
  const { data } = await supabase
    .from("portfolios")
    .select(
      "created_at, generated_at, updated_at, causes, exclusions, risk_target, horizon_years, initial_amount, name",
    )
    .eq("id", portfolioId)
    .maybeSingle();

  if (!data) return [];

  const out: DecisionEvent[] = [];
  const created = data.created_at;
  const generated = data.generated_at ?? created;
  const updated = data.updated_at ?? generated;

  out.push({
    id: "creation",
    type: "creation",
    date: created,
    title: `Création de « ${data.name} »`,
    detail: `Capital initial : ${Number(data.initial_amount).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`,
  });

  if (data.horizon_years) {
    out.push({
      id: "horizon",
      type: "horizon",
      date: created,
      title: `Horizon : ${data.horizon_years} ans`,
    });
  }

  if (data.risk_target) {
    out.push({
      id: "risk",
      type: "risk",
      date: created,
      title: `Cible de volatilité : ${(Number(data.risk_target) * 100).toFixed(1)} %`,
    });
  }

  ((data.causes ?? []) as string[]).forEach((c) => {
    out.push({
      id: `cause-${c}`,
      type: "cause",
      date: created,
      title: `Cause soutenue : ${CAUSE_LABEL[c] ?? c}`,
    });
  });

  ((data.exclusions ?? []) as string[]).forEach((e) => {
    out.push({
      id: `excl-${e}`,
      type: "exclusion",
      date: created,
      title: `Exclusion : ${EXCLUSION_LABEL[e] ?? e}`,
    });
  });

  if (generated && generated !== created) {
    out.push({
      id: "generated",
      type: "rebalance",
      date: generated,
      title: "Allocation recalculée",
      detail: "Le moteur Markowitz a optimisé ta pondération.",
    });
  }
  if (updated && updated !== generated && updated !== created) {
    out.push({
      id: "updated",
      type: "rebalance",
      date: updated,
      title: "Portefeuille mis à jour",
    });
  }

  out.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return out;
}

/**
 * Lit l'historique des décisions depuis `decision_events` (alimenté par triggers).
 * Si la table est vide pour ce portefeuille (legacy), on dérive depuis les champs.
 */
export function useDecisionHistory(): { decisions: DecisionEvent[]; loading: boolean } {
  const { user } = useAuth();
  const { portfolio } = useActivePortfolio();

  const ready = !!user && !!portfolio?.id;
  const { data, isLoading } = useQuery({
    queryKey: ["decision-history", user?.id, portfolio?.id],
    queryFn: () => fetchDecisionHistory(user!.id, portfolio!.id),
    enabled: ready,
  });

  return { decisions: data ?? [], loading: ready && isLoading };
}
