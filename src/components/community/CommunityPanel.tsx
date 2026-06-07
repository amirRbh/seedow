import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useCommunityShares, useImpactLeaderboard, type PortfolioShareRow } from "@/hooks/usePortfolioShare";
import { useActivePortfolio } from "@/hooks/useActivePortfolio";

const fmt = (n: number | null, suffix = "") =>
  n == null ? "—" : `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${suffix}`;

function ShareCard({ s }: { s: PortfolioShareRow }) {
  return (
    <article className="rounded-lg border border-paper-3 bg-paper p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-baseline justify-between">
        <p className="font-value text-lg text-ink">@{s.public_handle}</p>
        <span className="text-[10px] uppercase tracking-[0.18em] text-gold">
          {(s.risk_target * 100).toFixed(0)} % risque
        </span>
      </div>
      <p className="mt-1 text-xs text-ink-3">
        Horizon {s.horizon_years} ans · {s.causes.slice(0, 3).join(", ") || "Aucune cause"}
      </p>
      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-paper-3 pt-3 text-xs">
        <div>
          <p className="text-ink-3 uppercase tracking-[0.16em] text-[10px]">ESG</p>
          <p className="font-value text-ink tabular-nums">{fmt(s.esg_score)}</p>
        </div>
        <div>
          <p className="text-ink-3 uppercase tracking-[0.16em] text-[10px]">Rdt attendu</p>
          <p className="font-value text-ink tabular-nums">{fmt(s.expected_return ? s.expected_return * 100 : null, " %")}</p>
        </div>
        <div>
          <p className="text-ink-3 uppercase tracking-[0.16em] text-[10px]">Volatilité</p>
          <p className="font-value text-ink tabular-nums">{fmt(s.volatility ? s.volatility * 100 : null, " %")}</p>
        </div>
      </div>
    </article>
  );
}

/**
 * Panneau Communauté — réutilisable dans /communaute (standalone) et dans /discover (onglet).
 */
export function CommunityPanel() {
  const [cause, setCause] = useState<string | undefined>(undefined);
  const { shares, loading } = useCommunityShares({ cause });
  const { rows: leaderboard, loading: lbLoading } = useImpactLeaderboard();
  const { portfolio } = useActivePortfolio();

  const myESG = portfolio?.metrics?.esg_score ?? null;
  const median = leaderboard.length
    ? leaderboard.map((r) => r.esg_score ?? 0).sort((a, b) => a - b)[Math.floor(leaderboard.length / 2)]
    : null;

  const causes = Array.from(new Set(shares.flatMap((s) => s.causes))).slice(0, 10);

  return (
    <div>
      {myESG != null && median != null && (
        <div className="mb-6 rounded-lg border border-paper-3 bg-paper-2 p-4">
          <p className="text-[10px] uppercase tracking-[0.22em] text-gold mb-2">Où tu te situes</p>
          <p className="text-sm text-ink">
            Ton score ESG :{" "}
            <span className="font-value text-lg tabular-nums">{myESG.toFixed(2)}</span> · médiane communauté :{" "}
            <span className="font-value text-lg tabular-nums">{median.toFixed(2)}</span>{" "}
            {myESG >= median ? (
              <span className="text-emerald-700 text-xs uppercase tracking-[0.18em] font-semibold ml-2">au-dessus</span>
            ) : (
              <span className="text-ink-3 text-xs uppercase tracking-[0.18em] font-semibold ml-2">en dessous</span>
            )}
          </p>
        </div>
      )}

      <Tabs defaultValue="shares">
        <TabsList>
          <TabsTrigger value="shares">Stratégies partagées</TabsTrigger>
          <TabsTrigger value="leaderboard">Classement d'impact</TabsTrigger>
        </TabsList>

        <TabsContent value="shares" className="pt-6">
          {causes.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              <button
                onClick={() => setCause(undefined)}
                className={`text-[11px] uppercase tracking-[0.16em] px-3 py-1 rounded-full border ${!cause ? "bg-ink text-paper border-ink" : "border-paper-3 text-ink-3 hover:text-ink"}`}
              >Toutes</button>
              {causes.map((c) => (
                <button
                  key={c}
                  onClick={() => setCause(c)}
                  className={`text-[11px] uppercase tracking-[0.16em] px-3 py-1 rounded-full border ${cause === c ? "bg-ink text-paper border-ink" : "border-paper-3 text-ink-3 hover:text-ink"}`}
                >{c}</button>
              ))}
            </div>
          )}

          {loading ? (
            <p className="text-ink-3">Chargement…</p>
          ) : shares.length === 0 ? (
            <div className="rounded-lg border border-dashed border-paper-3 p-10 text-center">
              <p className="font-value text-xl text-ink">Aucune stratégie partagée pour l'instant</p>
              <p className="mt-2 text-sm text-ink-3">
                Sois le premier — active le partage anonyme depuis ton portefeuille.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {shares.map((s) => <ShareCard key={s.id} s={s} />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="leaderboard" className="pt-6">
          {lbLoading ? (
            <p className="text-ink-3">Chargement…</p>
          ) : (
            <ol className="divide-y divide-paper-3 rounded-lg border border-paper-3 bg-paper">
              {leaderboard.map((r, i) => (
                <li key={r.id} className="flex items-center gap-4 px-4 py-3">
                  <span className="font-value text-lg text-gold tabular-nums w-8">{i + 1}</span>
                  <span className="flex-1 text-ink font-medium">@{r.public_handle}</span>
                  <span className="text-xs text-ink-3 tabular-nums">
                    ESG <span className="text-ink font-value">{fmt(r.esg_score)}</span>
                  </span>
                  <span className="text-xs text-ink-3 tabular-nums hidden sm:inline">
                    CO₂ <span className="text-ink font-value">{fmt(r.carbon_intensity)}</span>
                  </span>
                </li>
              ))}
              {leaderboard.length === 0 && (
                <li className="p-6 text-center text-ink-3 text-sm">Pas encore de classement.</li>
              )}
            </ol>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
