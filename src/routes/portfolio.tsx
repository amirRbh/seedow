import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { BottomNavigation } from "@/components/navigation/BottomNavigation";
import { AppHeader } from "@/components/navigation/AppHeader";
import { GrowthComparison } from "@/components/roots/GrowthComparison";
import { TimelineEvent } from "@/components/roots/TimelineEvent";
import { BadgesCard } from "@/components/garden/SeasonalBadges";
import { MOCK_HOLDINGS, MOCK_PORTFOLIO, MOCK_TRANSACTIONS, MOCK_BADGES } from "@/lib/mockGarden";

export const Route = createFileRoute("/portfolio")({ component: Portfolio });

function monthLabel(d: Date) {
  return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

function Portfolio() {
  const totalValue = MOCK_PORTFOLIO.total_value;
  const totalInvested = MOCK_PORTFOLIO.total_invested;
  const gain = totalValue - totalInvested;
  const returnPct = (gain / totalInvested) * 100;

  const groups: Record<string, typeof MOCK_TRANSACTIONS> = {};
  for (const tx of MOCK_TRANSACTIONS) {
    const d = new Date(tx.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
    (groups[key] ??= []).push(tx);
  }
  const months = Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, evs]) => {
      const [y, m] = key.split("-");
      return { key, date: new Date(Number(y), Number(m), 1), events: evs };
    });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-paper">
      <div className="max-w-lg mx-auto pb-28">
        <AppHeader
          eyebrow="Ton histoire"
          title="Les racines"
          subtitle={`${MOCK_HOLDINGS.length} plantes · ${totalValue.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })} cultivés`}
        />

        <section className="px-5 pt-2">
          <GrowthComparison currentValue={totalValue} invested={totalInvested} gain={gain} returnPct={returnPct} />
        </section>

        <section className="px-5 pt-6">
          <BadgesCard badges={MOCK_BADGES} />
        </section>

        <section className="px-5 pt-8">
          <h2 className="text-sm font-semibold text-ink mb-4">Chronologie du jardin</h2>

          <p className="text-[10px] uppercase tracking-wider text-ink-3 font-semibold mb-2 mt-1">Aujourd'hui</p>
          <TimelineEvent
            type="gain"
            title="Ton jardin est en croissance"
            subtitle={`${gain >= 0 ? "+" : ""}${gain.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} € depuis la plantation`}
            badge={`${gain >= 0 ? "+" : ""}${returnPct.toFixed(1)}%`}
            badgeVariant={gain >= 0 ? "gain" : "loss"}
            impactChips={[`${MOCK_PORTFOLIO.co2_avoided}t CO₂ évité`, `${MOCK_PORTFOLIO.trees_equivalent} arbres éq.`]}
          />

          {months.map(({ key, date, events }) => (
            <div key={key} className="mt-4">
              <p className="text-[10px] uppercase tracking-wider text-ink-3 font-semibold mb-2 capitalize">{monthLabel(date)}</p>
              {events.map((ev) => {
                if (ev.type === "deposit") {
                  return (
                    <TimelineEvent
                      key={ev.id}
                      type="soil"
                      title="Tu as enrichi ton terreau"
                      subtitle={`Dépôt de ${ev.amount.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}`}
                      badge="Terreau"
                      badgeVariant="soil"
                    />
                  );
                }
                if (ev.type === "buy") {
                  return (
                    <TimelineEvent
                      key={ev.id}
                      type="plant"
                      title={`Tu as planté ${ev.asset_name ?? ev.asset_ticker}`}
                      subtitle={`${ev.amount.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })} confiés à cette graine`}
                      badge={ev.asset_ticker ?? "Plant"}
                      badgeVariant="plant"
                    />
                  );
                }
                return (
                  <TimelineEvent
                    key={ev.id}
                    type="harvest"
                    title="Récolte"
                    subtitle={`${ev.amount.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}`}
                    badge="Récolte"
                    badgeVariant="harvest"
                  />
                );
              })}
            </div>
          ))}
        </section>
      </div>
      <BottomNavigation />
    </motion.div>
  );
}
