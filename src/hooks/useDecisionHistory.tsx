import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActivePortfolio } from "@/hooks/useActivePortfolio";

export type DecisionType = "creation" | "cause" | "exclusion" | "horizon" | "risk" | "rebalance";

export interface DecisionEvent {
  id: string;
  type: DecisionType;
  date: string; // ISO
  title: string;
  detail?: string;
}

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

/**
 * Reconstitue l'historique des décisions à partir de la table portfolios.
 * V1 : pas de table dédiée — on dérive des champs (created_at, exclusions, causes,
 * risk_target, horizon_years, generated_at).
 */
export function useDecisionHistory(): { decisions: DecisionEvent[]; loading: boolean } {
  const { user } = useAuth();
  const { portfolio } = useActivePortfolio();
  const [decisions, setDecisions] = useState<DecisionEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !portfolio?.id) {
      setDecisions([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("portfolios")
        .select(
          "created_at, generated_at, updated_at, causes, exclusions, risk_target, horizon_years, initial_amount, name",
        )
        .eq("id", portfolio.id)
        .maybeSingle();

      if (cancelled || !data) {
        setDecisions([]);
        setLoading(false);
        return;
      }

      const out: DecisionEvent[] = [];
      const created = data.created_at;
      const generated = data.generated_at ?? created;
      const updated = data.updated_at ?? generated;

      // Création
      out.push({
        id: "creation",
        type: "creation",
        date: created,
        title: `Tu as créé « ${data.name} »`,
        detail: `Capital initial : ${Number(data.initial_amount).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`,
      });

      // Horizon
      if (data.horizon_years) {
        out.push({
          id: "horizon",
          type: "horizon",
          date: created,
          title: `Tu as choisi un horizon de ${data.horizon_years} ans`,
        });
      }

      // Risque
      if (data.risk_target) {
        out.push({
          id: "risk",
          type: "risk",
          date: created,
          title: `Tu as ciblé ${(Number(data.risk_target) * 100).toFixed(1)} % de volatilité`,
        });
      }

      // Causes
      const causes = (data.causes ?? []) as string[];
      causes.forEach((c) => {
        out.push({
          id: `cause-${c}`,
          type: "cause",
          date: created,
          title: `Tu soutiens : ${CAUSE_LABEL[c] ?? c}`,
        });
      });

      // Exclusions
      const exclusions = (data.exclusions ?? []) as string[];
      exclusions.forEach((e) => {
        out.push({
          id: `excl-${e}`,
          type: "exclusion",
          date: created,
          title: `Tu as exclu ${EXCLUSION_LABEL[e] ?? e}`,
        });
      });

      // Recalcul / génération
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

      // Tri antéchronologique
      out.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setDecisions(out);
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [user, portfolio?.id]);

  return { decisions, loading };
}
