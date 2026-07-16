import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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

export function ShareToggle() {
  const { t } = useTranslation();
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
        toast.success(t("share_toggle.unshared"));
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
        toast.success(t("share_toggle.shared", { handle: ph }));
      }
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("share_toggle.error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border border-paper-3 bg-paper p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-tag font-semibold uppercase tracking-[0.22em] text-gold mb-1">
            {t("share_toggle.eyebrow")}
          </p>
          <p className="font-display text-lg text-ink">{t("share_toggle.title")}</p>
          <p className="mt-2 text-xs text-ink-3 max-w-md">
            {t("share_toggle.description")}{" "}
            <span className="text-ink font-medium">@{handle ?? "—"}</span>
          </p>
        </div>
        <Switch checked={enabled} onCheckedChange={onToggle} disabled={busy} />
      </div>
    </div>
  );
}
