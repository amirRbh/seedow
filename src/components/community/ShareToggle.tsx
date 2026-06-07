import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useActivePortfolio } from "@/hooks/useActivePortfolio";
import {
  useMyShare,
  fetchOrCreatePublicHandle,
  sharePortfolio,
  unsharePortfolio,
} from "@/hooks/usePortfolioShare";
import { supabase } from "@/integrations/supabase/client";

/**
 * Toggle « Partager anonymement ce portefeuille » à placer dans /portfolio.
 * Aucun montant n'est exposé — seulement allocation, causes, métriques publiques.
 */
export function ShareToggle() {
  const { user } = useAuth();
  const { portfolio } = useActivePortfolio();
  const { share, refresh } = useMyShare(portfolio?.id ?? null);
  const [busy, setBusy] = useState(false);
  const [handle, setHandle] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("public_handle")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setHandle(data?.public_handle ?? null));
  }, [user]);

  if (!portfolio || !user) return null;

  const enabled = !!share;

  const onToggle = async (next: boolean) => {
    setBusy(true);
    try {
      if (!next) {
        await unsharePortfolio(portfolio.id);
        toast.success("Partage désactivé.");
      } else {
        const ph = handle ?? (await fetchOrCreatePublicHandle(user.id));
        setHandle(ph);
        // Récupère poids et causes/exclusions/risque depuis la table portfolios
        const { data: pf, error } = await supabase
          .from("portfolios")
          .select("causes, exclusions, risk_target, horizon_years, weights")
          .eq("id", portfolio.id)
          .maybeSingle();
        if (error || !pf) throw new Error(error?.message ?? "Portefeuille introuvable");
        await sharePortfolio({
          userId: user.id,
          portfolioId: portfolio.id,
          publicHandle: ph,
          causes: (pf.causes ?? []) as string[],
          exclusions: (pf.exclusions ?? []) as string[],
          riskTarget: Number(pf.risk_target),
          horizonYears: pf.horizon_years,
          weights: (pf.weights ?? {}) as Record<string, number>,
          expectedReturn: portfolio.metrics?.expected_return ?? null,
          volatility: portfolio.metrics?.volatility ?? null,
          esgScore: portfolio.metrics?.esg_score ?? null,
          carbonIntensity: portfolio.metrics?.co2_avoided_tons ?? null,
        });
        toast.success(`Partagé en tant que @${ph}.`);
      }
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border border-paper-3 bg-paper p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold mb-1">
            Communauté
          </p>
          <p className="font-value text-lg text-ink">Partager ce portefeuille anonymement</p>
          <p className="mt-2 text-xs text-ink-3 max-w-md">
            Seuls allocation, causes et métriques publiques sont visibles. Aucun montant
            n'est partagé. Pseudo affiché : <span className="text-ink font-medium">@{handle ?? "—"}</span>
          </p>
        </div>
        <Switch checked={enabled} onCheckedChange={onToggle} disabled={busy} />
      </div>
    </div>
  );
}
