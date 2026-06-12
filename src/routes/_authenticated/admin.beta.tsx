import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getBetaAdminStats, type BetaAdminStats } from "@/lib/beta/beta.functions";
import { callAuthed } from "@/lib/authedServerFn";

export const Route = createFileRoute("/_authenticated/admin/beta")({
  component: AdminBetaPage,
});

function AdminBetaPage() {
  const [stats, setStats] = useState<BetaAdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    callAuthed(getBetaAdminStats, undefined as never)
      .then(setStats)
      .catch((err) => setError(err instanceof Error ? err.message : "Erreur"));
  }, []);

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-12">
        <p className="text-rust text-sm">{error}</p>
        <Link to="/dashboard" className="text-[12px] underline mt-4 inline-block">
          ← Dashboard
        </Link>
      </div>
    );
  }

  if (!stats) {
    return <div className="max-w-3xl mx-auto px-6 py-12 text-ink-3 text-sm">Chargement…</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 space-y-10">
      <header>
        <p className="text-[10px] uppercase tracking-[0.22em] text-gold font-semibold">Admin</p>
        <h1 className="font-display text-3xl text-ink mt-2">Phase bêta — vue d'ensemble</h1>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi label="Inscrits" value={`${stats.signups} / ${stats.cap}`} />
        <Kpi label="Waitlist" value={String(stats.waitlist)} />
        <Kpi label="Portefeuilles" value={String(stats.portfoliosCreated)} />
        <Kpi
          label="NPS moyen"
          value={stats.npsAverage !== null ? stats.npsAverage.toFixed(1) : "—"}
        />
        <Kpi label="Intents réels" value={String(stats.realIntents)} />
        <Kpi
          label="Montant total intents"
          value={`${stats.realIntentsTotalAmount.toLocaleString("fr-FR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })} €`}
        />
        <Kpi label="Feedbacks" value={String(stats.feedbackCount)} />
        <Kpi
          label="Conv. → portefeuille"
          value={stats.signups > 0 ? `${Math.round((stats.portfoliosCreated / stats.signups) * 100)}%` : "—"}
        />
      </section>

      <section>
        <h2 className="font-display text-lg text-ink mb-3">Derniers intents d'investissement réel</h2>
        <div className="border border-paper-3 rounded-2xl divide-y divide-paper-3">
          {stats.recentIntents.length === 0 ? (
            <p className="p-4 text-[13px] text-ink-3">Aucun intent pour l'instant.</p>
          ) : (
            stats.recentIntents.map((i) => (
              <div key={i.id} className="p-4 flex items-center justify-between text-[13px]">
                <span>
                  {i.amount.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                  <span className="text-ink-3 ml-2">· {i.frequency === "monthly" ? "mensuel" : "one-shot"}</span>
                </span>
                <span className="text-ink-3 text-[11px]">
                  {new Date(i.created_at).toLocaleString("fr-FR")}
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      <section>
        <h2 className="font-display text-lg text-ink mb-3">Derniers feedbacks</h2>
        <div className="space-y-3">
          {stats.recentFeedback.length === 0 ? (
            <p className="text-[13px] text-ink-3">Aucun feedback pour l'instant.</p>
          ) : (
            stats.recentFeedback.map((f) => (
              <div key={f.id} className="border border-paper-3 rounded-xl p-4">
                <div className="flex items-center justify-between text-[11px] text-ink-3 mb-2">
                  <span>NPS : {f.nps ?? "—"}</span>
                  <span>{new Date(f.created_at).toLocaleString("fr-FR")}</span>
                </div>
                {f.blocker && (
                  <p className="text-[13px] text-ink mb-1">
                    <span className="text-ink-3 text-[11px] uppercase tracking-wider mr-2">Blocage</span>
                    {f.blocker}
                  </p>
                )}
                {f.wish && (
                  <p className="text-[13px] text-ink">
                    <span className="text-ink-3 text-[11px] uppercase tracking-wider mr-2">Souhait</span>
                    {f.wish}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-paper-3 rounded-2xl p-4">
      <p className="text-[10px] uppercase tracking-[0.18em] text-ink-3 font-semibold">{label}</p>
      <p className="font-value text-2xl text-ink mt-1 tabular-nums">{value}</p>
    </div>
  );
}
