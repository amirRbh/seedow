import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getPublicFundsList } from "@/lib/esg/public-fund.functions";
import type { PublicFundAsset } from "@/lib/esg/public-fund";
import { LanguageToggle } from "@/components/LanguageToggle";

/**
 * Observatoire du greenwashing (Phase C, ticket C2 — Moat Blueprint) : index
 * public de tous les fonds actifs, classés par risque de greenwashing puis
 * par complétude de données. Chaque ligne pointe vers sa page sourcée
 * (`/fonds/$isin`). Pas de verdict global — un flag à vérifier, pas une note
 * (§7, même ADN que `lib/esg/transparency.ts`).
 */
export const Route = createFileRoute("/observatoire")({
  loader: async () => ({ funds: await getPublicFundsList() }),
  head: () => ({
    meta: [
      { title: "Observatoire du greenwashing — Seedow" },
      {
        name: "description",
        content:
          "Tous les fonds analysés par Seedow, classés par risque de greenwashing, avec les données sourcées et datées derrière chaque flag.",
      },
    ],
  }),
  component: ObservatoryPage,
});

const RISK_ORDER: Record<PublicFundAsset["greenwashing_risk"], number> = {
  high: 0,
  medium: 1,
  low: 2,
};

function ObservatoryPage() {
  const { funds } = Route.useLoaderData();
  const { t } = useTranslation();
  const [query, setQuery] = useState("");

  const sorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...funds]
      .filter(
        (f) => !q || f.name.toLowerCase().includes(q) || (f.isin ?? "").toLowerCase().includes(q),
      )
      .sort(
        (a, b) =>
          RISK_ORDER[a.greenwashing_risk] - RISK_ORDER[b.greenwashing_risk] ||
          a.name.localeCompare(b.name),
      );
  }, [funds, query]);

  return (
    <div className="min-h-screen bg-paper-2 text-ink">
      <header className="max-w-4xl mx-auto px-6 pt-10 pb-8 border-b border-paper-3">
        <div className="flex items-center justify-between">
          <Link
            to="/comprendre"
            className="text-tag uppercase tracking-[0.18em] text-ink-3 hover:text-ink transition-colors"
          >
            {t("observatoire.back")}
          </Link>
          <LanguageToggle />
        </div>
        <h1 className="font-value text-3xl mt-4">{t("observatoire.title")}</h1>
        <p className="text-body text-ink-2 mt-3 max-w-2xl leading-relaxed">
          {t("observatoire.intro")}
        </p>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("observatoire.search")}
          className="mt-5 text-body-sm border border-paper-3 rounded-lg px-3 py-2 bg-paper outline-none focus:border-ink transition-colors w-full sm:w-80"
        />
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="border border-paper-3 rounded-2xl divide-y divide-paper-3">
          {sorted.length === 0 ? (
            <p className="p-4 text-body-sm text-ink-3">{t("observatoire.empty")}</p>
          ) : (
            sorted.map((f) => (
              <Link
                key={f.isin ?? f.ticker}
                to="/fonds/$isin"
                params={{ isin: f.isin ?? f.ticker }}
                className="p-4 flex items-center justify-between gap-3 hover:bg-paper-2/40 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-ink truncate">{f.name}</p>
                  <p className="text-caption text-ink-3 font-mono">{f.isin ?? f.ticker}</p>
                </div>
                <div className="shrink-0 flex items-center gap-3">
                  {f.seedow_score != null && (
                    <span className="font-value text-body tabular-nums text-ink-2">
                      {f.seedow_score}
                      <span className="text-ink-3 text-caption">/100</span>
                    </span>
                  )}
                  <RiskBadge risk={f.greenwashing_risk} />
                </div>
              </Link>
            ))
          )}
        </div>
        <p className="text-caption text-ink-3 mt-3">{t("observatoire.hint")}</p>
      </main>
    </div>
  );
}

const RISK_TOKEN: Record<PublicFundAsset["greenwashing_risk"], string> = {
  low: "text-mint",
  medium: "text-solar",
  high: "text-alert",
};

function RiskBadge({ risk }: { risk: PublicFundAsset["greenwashing_risk"] }) {
  const { t } = useTranslation();
  return (
    <span
      className={`shrink-0 text-label uppercase tracking-[0.14em] font-mono ${RISK_TOKEN[risk]}`}
    >
      ● {t(`observatoire.risk_${risk}`)}
    </span>
  );
}
