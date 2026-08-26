import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getPublicFundsList } from "@/lib/esg/public-fund.functions";
import type { PublicFundAsset } from "@/lib/esg/public-fund";
import { scoreBand } from "@/lib/esg/sustainability-classification";
import { LanguageToggle } from "@/components/LanguageToggle";
import { cn } from "@/lib/utils";

/**
 * Observatoire du greenwashing — « ce que ce fonds dit » face à « ce que ses
 * données montrent ».
 *
 * ── Ce que la page était ───────────────────────────────────────────────────
 *
 * Un annuaire : cinq cents lignes triées par risque, chacune portant un nom, un
 * score et une pastille. On y lisait un classement, jamais une démonstration. Or
 * l'Observatoire est censé être la preuve la plus concrète de la promesse
 * Seedow — et une pastille rouge sans la phrase qui l'explique n'est pas une
 * preuve, c'est une accusation.
 *
 * ── Ce qu'elle est ─────────────────────────────────────────────────────────
 *
 * Deux colonnes, sur chaque ligne : la REVENDICATION (article SFDR déclaré,
 * thèmes verts affichés) et ce que la DONNÉE montre (score Seedow, et l'écart
 * précis quand il y en a un). L'écart est écrit en toutes lettres sur la ligne,
 * pas rangé derrière un clic. C'est la seule façon de rendre lisible la
 * différence entre une promesse marketing et un fait mesuré.
 *
 * ── Les compteurs de l'en-tête ─────────────────────────────────────────────
 *
 * Ils sont CALCULÉS sur les lignes réellement chargées, jamais écrits en dur :
 * un chiffre de communication qui dérive de sa base est exactement le défaut que
 * cette page dénonce. Ils décrivent le catalogue Seedow — pas le marché, dont on
 * ne prétend rien.
 *
 * Aucun verdict : un fonds qui revendique et ne prouve pas porte un « point de
 * vigilance », pas une condamnation (CLAUDE.md §1.3).
 */
export const Route = createFileRoute("/observatoire")({
  loader: async () => ({ funds: await getPublicFundsList() }),
  head: () => ({
    meta: [
      { title: "Observatoire du greenwashing — Seedow" },
      {
        name: "description",
        content:
          "Ce que chaque fonds revendique, face à ce que ses données montrent. Écarts sourcés et datés, sans verdict.",
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

type Filter = "all" | "flagged" | "claiming";

/** Le fonds se déclare durable au sens SFDR (article 8 ou 9). */
function claimsSustainable(f: PublicFundAsset): boolean {
  return f.sfdr_article === 8 || f.sfdr_article === 9;
}

function ObservatoryPage() {
  const { funds } = Route.useLoaderData();
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  // Compteurs dérivés des lignes chargées — pas une affirmation de campagne.
  const counts = useMemo(() => {
    const claiming = funds.filter(claimsSustainable);
    return {
      total: funds.length,
      claiming: claiming.length,
      claimingFlagged: claiming.filter((f) => f.greenwashing_reasons.length > 0).length,
    };
  }, [funds]);

  const sorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    return funds
      .filter((f) => {
        if (filter === "flagged" && f.greenwashing_reasons.length === 0) return false;
        if (filter === "claiming" && !claimsSustainable(f)) return false;
        if (!q) return true;
        return (
          f.name.toLowerCase().includes(q) ||
          f.ticker.toLowerCase().includes(q) ||
          (f.isin ?? "").toLowerCase().includes(q) ||
          (f.issuer ?? "").toLowerCase().includes(q)
        );
      })
      .sort(
        (a, b) =>
          RISK_ORDER[a.greenwashing_risk] - RISK_ORDER[b.greenwashing_risk] ||
          a.name.localeCompare(b.name),
      );
  }, [funds, query, filter]);

  const FILTERS: { id: Filter; label: string }[] = [
    { id: "all", label: t("observatoire.filter_all") },
    { id: "flagged", label: t("observatoire.filter_flagged") },
    { id: "claiming", label: t("observatoire.filter_claiming") },
  ];

  return (
    <div className="min-h-screen bg-paper-2 text-ink">
      <header className="max-w-4xl mx-auto px-6 pt-10 pb-8">
        <div className="flex items-center justify-between gap-4">
          <Link to="/" className="stamp hover:text-ink transition-colors">
            {t("observatoire.back")}
          </Link>
          <LanguageToggle />
        </div>

        <h1 className="mt-6 font-display text-[clamp(28px,5vw,44px)] leading-[1.06] tracking-[-0.02em] max-w-[18ch]">
          {t("observatoire.title")}
        </h1>
        <p className="mt-4 max-w-[60ch] text-body-lg leading-relaxed text-ink-2">
          {t("observatoire.intro")}
        </p>

        {/* Le constat, chiffré sur le catalogue lui-même. */}
        <div className="mt-9 grid gap-6 sm:grid-cols-3">
          <Counter value={counts.total} label={t("observatoire.stat_total")} />
          <Counter value={counts.claiming} label={t("observatoire.stat_claiming")} />
          <Counter
            value={counts.claimingFlagged}
            label={t("observatoire.stat_flagged")}
            // Le rouge dit « voilà le problème ». À zéro, il n'y en a pas :
            // un 0 en alerte se lit comme une alarme sur une bonne nouvelle.
            tone={counts.claimingFlagged > 0 ? "alert" : "ink"}
          />
        </div>
        <p className="mt-4 text-body-sm leading-relaxed text-ink-3 max-w-[64ch]">
          {t("observatoire.stat_note")}
        </p>
      </header>

      <div className="max-w-4xl mx-auto px-6 pb-16">
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="observatoire-search" className="sr-only">
            {t("observatoire.search")}
          </label>
          <input
            id="observatoire-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("observatoire.search")}
            className="h-11 flex-1 min-w-[200px] rounded-[14px] border border-paper-3 bg-paper px-4 text-body-sm text-ink placeholder:text-ink-3 outline-none transition-colors focus:border-ink focus-visible:ring-2 focus-visible:ring-ink"
          />
          <div role="group" aria-label={t("observatoire.filter_aria")} className="flex gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                aria-pressed={filter === f.id}
                className={cn(
                  "chip min-h-[44px] transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink",
                  filter === f.id ? "bg-ink text-paper border-ink" : "hover:bg-paper-inset",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <ul className="mt-6 flex flex-col gap-3">
          {sorted.length === 0 ? (
            <li className="paper-card p-6 text-body-sm text-ink-3">{t("observatoire.empty")}</li>
          ) : (
            sorted.map((f) => <FundRow key={f.isin ?? f.ticker} fund={f} />)
          )}
        </ul>

        <p className="mt-6 text-body-sm leading-relaxed text-ink-3 max-w-[64ch]">
          {t("observatoire.hint")}
        </p>
      </div>
    </div>
  );
}

function Counter({
  value,
  label,
  tone = "ink",
}: {
  value: number;
  label: string;
  tone?: "ink" | "alert";
}) {
  return (
    <div>
      <p
        className={cn(
          "font-value text-[clamp(32px,5vw,44px)] leading-none tabular-nums",
          tone === "alert" ? "text-alert-ink" : "text-ink",
        )}
      >
        {value}
      </p>
      <p className="mt-2.5 text-body-sm leading-snug text-ink-2 max-w-[28ch]">{label}</p>
    </div>
  );
}

/**
 * Une ligne = un fonds, en deux colonnes. À gauche ce qu'il revendique, à droite
 * ce que la donnée en dit. Quand rien ne contredit la revendication, on l'écrit
 * aussi : « aucun écart relevé » est une information, pas un vide.
 */
function FundRow({ fund }: { fund: PublicFundAsset }) {
  const { t } = useTranslation();
  const band = scoreBand(fund.seedow_score);

  const claims: string[] = [];
  if (fund.sfdr_article != null) claims.push(`Article ${fund.sfdr_article} SFDR`);
  for (const th of fund.themes.slice(0, 2)) {
    claims.push(
      `${t(`landing.rayon_x.themes_labels.${th.tag}`, { defaultValue: th.tag })} ${th.pct} %`,
    );
  }
  if (claims.length === 0) claims.push(t("observatoire.claim_none"));

  return (
    <li>
      <Link
        to="/fonds/$isin"
        params={{ isin: fund.isin ?? fund.ticker }}
        className="paper-card block p-5 hover:bg-paper-inset transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ink"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-body font-semibold text-ink">{fund.name}</p>
            <p className="mono-meta mt-0.5 truncate">
              {[fund.isin ?? fund.ticker, fund.issuer].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p
              className={cn(
                "font-value text-[22px] leading-none tabular-nums",
                band === "strong"
                  ? "text-mint-ink"
                  : band === "partial"
                    ? "text-solar-ink"
                    : band === "weak"
                      ? "text-alert-ink"
                      : "text-ink-3",
              )}
            >
              {fund.seedow_score ?? "—"}
              <span className="text-ink-3 text-caption"> /100</span>
            </p>
            <p className="mono-meta mt-1">{t(`seedow_score.band.${band}`)}</p>
          </div>
        </div>

        <div className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <div>
            <p className="stamp">{t("landing.observatory.col_claim")}</p>
            <p className="mt-1.5 text-body-sm leading-snug text-ink-2">{claims.join(" · ")}</p>
          </div>
          <div>
            <p className="stamp">{t("landing.observatory.col_data")}</p>
            {fund.greenwashing_reasons.length > 0 ? (
              <ul className="mt-1.5 flex flex-col gap-1">
                {fund.greenwashing_reasons.slice(0, 2).map((r) => (
                  <li key={r} className="text-body-sm leading-snug text-alert-ink">
                    {t(`transparency.reasons.${r}`, { defaultValue: r })}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1.5 text-body-sm leading-snug text-ink-2">
                {t("observatoire.no_gap")}
              </p>
            )}
          </div>
        </div>
      </Link>
    </li>
  );
}
