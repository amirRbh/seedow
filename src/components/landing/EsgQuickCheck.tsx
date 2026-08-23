import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { EsgPreviewAsset } from "@/routes/api.public.esg-preview";

/**
 * « Rayon X » — quick win pré-inscription : chercher un fonds → voir en <10 s
 * ce qu'il finance vraiment, son score /100, ses piliers E/S/G, ce qu'il
 * n'exclut pas et son risque de greenwashing. Sans compte. La démo qui vend le
 * produit à elle-même, puis pont vers l'analyse du portefeuille complet.
 *
 * Zéro chiffre inventé : tout ce qui est affiché provient des colonnes réelles
 * exposées par /api/public/esg-preview (scores fournisseur, exposition thème
 * déclarée, secteurs exclus, source + date). Les trous sont assumés (couverture),
 * jamais comblés par une estimation présentée comme un fait.
 *
 * Les données ne sont chargées qu'au premier focus/frappe : la landing reste
 * légère pour les visiteurs qui ne testent pas le widget.
 */
export function EsgQuickCheck({ embedded = false }: { embedded?: boolean } = {}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [assets, setAssets] = useState<EsgPreviewAsset[] | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "ready">("idle");
  const [selected, setSelected] = useState<EsgPreviewAsset | null>(null);
  const fetchStarted = useRef(false);

  const load = () => {
    if (fetchStarted.current) return;
    fetchStarted.current = true;
    setStatus("loading");
    fetch("/api/public/esg-preview")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((json: { assets?: EsgPreviewAsset[] }) => {
        setAssets(json.assets ?? []);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  };

  // Si l'utilisateur colle du texte avant que le fetch parte (autofocus mobile),
  // on charge aussi à la première frappe.
  const hasQuery = query.length > 0;
  useEffect(() => {
    if (hasQuery) load();
  }, [hasQuery]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!assets || q.length < 2) return [];
    return assets
      .filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.ticker.toLowerCase().includes(q) ||
          (a.isin ?? "").toLowerCase().includes(q) ||
          (a.issuer ?? "").toLowerCase().includes(q),
      )
      .slice(0, 6);
  }, [assets, query]);

  const showEmpty = status === "ready" && query.trim().length >= 2 && results.length === 0;

  // Embarqué dans la landing, le champ flottait nu sur le fond de page, ses
  // messages centrés sous un titre de section aligné à gauche : rien ne le
  // rattachait à quoi que ce soit. Il vit dans une carte, calé à gauche.
  const align = embedded ? "text-left" : "text-center";

  return (
    <section className={embedded ? "" : "px-6 py-24 md:py-32"}>
      <div className={embedded ? "" : "max-w-[760px] mx-auto"}>
        {!embedded && (
          <div className="text-center">
            <p className="apple-eyebrow" style={{ color: "var(--ice)" }}>
              {t("landing.quick_check.eyebrow")}
            </p>
            <h2 className="apple-title mx-auto mt-3">{t("landing.quick_check.title")}</h2>
            <p className="apple-subtitle mx-auto max-w-[520px] mt-5">
              {t("landing.quick_check.subtitle")}
            </p>
          </div>
        )}

        {selected ? (
          <RayonXReveal asset={selected} onReset={() => setSelected(null)} />
        ) : (
          <div className={embedded ? "paper-card p-6 md:p-7" : "mt-10"}>
            <label htmlFor="esg-quick-check" className="stamp">
              {t("landing.quick_check.field_label")}
            </label>
            <input
              id="esg-quick-check"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={load}
              placeholder={t("landing.quick_check.placeholder")}
              className="apple-input w-full mt-2.5"
            />

            <div className="mt-4 space-y-2.5" aria-live="polite">
              {status === "loading" && query.trim().length >= 2 && (
                <p className={`text-body-sm text-[color:var(--apple-text-2)] py-4 ${align}`}>
                  {t("landing.quick_check.loading")}
                </p>
              )}
              {status === "error" && (
                <p className={`text-body-sm text-[color:var(--apple-text-2)] py-4 ${align}`}>
                  {t("landing.quick_check.error")}
                </p>
              )}
              {showEmpty && (
                <p className={`text-body-sm text-[color:var(--apple-text-2)] py-4 ${align}`}>
                  {t("landing.quick_check.no_results")}
                </p>
              )}
              {results.map((a) => (
                <QuickCheckRow key={a.ticker} asset={a} onSelect={() => setSelected(a)} />
              ))}
            </div>

            {results.length > 0 && (
              <p className={`text-caption text-[color:var(--apple-text-2)] mt-4 ${align}`}>
                {t("landing.rayon_x.cta_hint")}
              </p>
            )}
            <p className={`text-body-sm text-[color:var(--apple-text-2)] mt-6 ${align}`}>
              {t("landing.quick_check.disclaimer")}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

/* ─────────────────────────── Ligne de résultat ─────────────────────────── */

const RISK_TOKEN: Record<EsgPreviewAsset["greenwashing_risk"], string> = {
  low: "var(--mint)",
  medium: "var(--solar)",
  high: "var(--alert)",
};

function RiskChip({ risk }: { risk: EsgPreviewAsset["greenwashing_risk"] }) {
  const { t } = useTranslation();
  const color = RISK_TOKEN[risk];
  return (
    <span
      className="inline-flex items-center gap-1.5 text-caption font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
      style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, color }}
    >
      {risk !== "low" && <span aria-hidden>⚠</span>}
      {t(`transparency.gw_risk.${risk}`)}
    </span>
  );
}

function QuickCheckRow({ asset, onSelect }: { asset: EsgPreviewAsset; onSelect: () => void }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onSelect}
      className="apple-card apple-lift w-full p-4 flex items-center gap-4 text-left"
      style={{ border: "1px solid var(--paper-3)" }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-body font-semibold text-[color:var(--apple-text)] truncate">
          {asset.name}
        </p>
        <p className="text-caption text-[color:var(--apple-text-2)] mt-0.5 font-mono">
          {asset.ticker}
          {asset.issuer ? ` · ${asset.issuer}` : ""}
          {asset.sfdr_article ? ` · SFDR Art. ${asset.sfdr_article}` : ""}
          {" · "}
          {t(`transparency.coverage.${asset.coverage}`)}
        </p>
      </div>
      <RiskChip risk={asset.greenwashing_risk} />
      <span aria-hidden className="text-[color:var(--apple-text-2)] text-xl flex-none">
        ›
      </span>
    </button>
  );
}

/* ──────────────────────────── Reveal « Rayon X » ───────────────────────── */

type BandKey = "tresaligne" | "plutot" | "mitige" | "peu" | "contra";

function bandFor(score: number): { key: BandKey; color: string } {
  if (score >= 80) return { key: "tresaligne", color: "var(--mint)" };
  if (score >= 60) return { key: "plutot", color: "var(--mint)" };
  if (score >= 40) return { key: "mitige", color: "var(--solar)" };
  if (score >= 20) return { key: "peu", color: "var(--alert)" };
  return { key: "contra", color: "var(--alert)" };
}

/** Compteur animé, coupé si l'utilisateur a demandé moins de mouvement. */
function useCountUp(target: number): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setValue(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const duration = 800;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return value;
}

function pillarColor(val: number): string {
  if (val >= 60) return "var(--mint)";
  if (val >= 40) return "var(--solar)";
  return "var(--alert)";
}

function PillarBar({ label, val }: { label: string; val: number }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setWidth(val));
    return () => cancelAnimationFrame(id);
  }, [val]);
  const color = pillarColor(val);
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-body-sm font-medium text-[color:var(--apple-text)]">{label}</span>
        <span className="font-mono text-body-sm tabular-nums text-[color:var(--apple-text)]">
          {val}
          <span className="text-[color:var(--apple-text-2)]">/100</span>
        </span>
      </div>
      <div
        className="mt-2 h-2 rounded-full overflow-hidden"
        style={{ background: "var(--apple-surface)" }}
        role="presentation"
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${width}%`,
            background: color,
            transition: "width 0.9s cubic-bezier(0.32,0.72,0,1)",
          }}
        />
      </div>
    </div>
  );
}

const ALL_EXCLUSIONS = ["fossiles", "armes", "tabac", "jeux", "animaux", "fast-fashion"] as const;

function RayonXReveal({ asset, onReset }: { asset: EsgPreviewAsset; onReset: () => void }) {
  const { t, i18n } = useTranslation();
  const score = Math.round(asset.esg * 10); // esg (0..10) → /100
  const band = bandFor(score);
  const shown = useCountUp(score);

  const pillars = [
    { label: t("landing.rayon_x.pillar.env"), val: Math.round(asset.climate * 10) },
    { label: t("landing.rayon_x.pillar.social"), val: Math.round(asset.social * 10) },
    { label: t("landing.rayon_x.pillar.gouv"), val: Math.round(asset.governance * 10) },
  ];

  const notExcluded = ALL_EXCLUSIONS.filter((e) => !asset.excluded_sectors.includes(e));

  const coverageLabel = t(`transparency.coverage.${asset.coverage}`);
  const asof = asset.data_asof
    ? new Date(asset.data_asof).toLocaleDateString(i18n.language === "en" ? "en-GB" : "fr-FR")
    : null;

  const meta = [
    asset.ticker,
    asset.issuer,
    asset.isin,
    t(`asset_class.${asset.asset_class}`, { defaultValue: asset.asset_class }),
    asset.sfdr_article ? `SFDR Art. ${asset.sfdr_article}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      className="mt-10 apple-card text-left"
      style={{
        background: "var(--apple-bg)",
        border: "1px solid var(--paper-3)",
        padding: "26px 22px 28px",
      }}
    >
      {/* En-tête */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-mono text-caption text-[color:var(--apple-text-2)] truncate">{meta}</p>
          <h3
            className="mt-1 font-bold text-[color:var(--apple-text)]"
            style={{
              fontSize: "clamp(22px, 3vw, 30px)",
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
            }}
          >
            {asset.name}
          </h3>
        </div>
        <button type="button" onClick={onReset} className="apple-link text-body flex-none">
          {t("landing.rayon_x.another")}
        </button>
      </div>

      {/* Score héros + bande */}
      <div className="mt-6 flex flex-wrap items-center gap-x-7 gap-y-4">
        <div className="flex items-baseline gap-2">
          <span
            style={{
              fontSize: "clamp(56px, 9vw, 84px)",
              fontWeight: 700,
              letterSpacing: "-0.04em",
              lineHeight: 1,
              color: band.color,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {shown}
          </span>
          <span className="font-mono text-body-lg text-[color:var(--apple-text-2)]">/ 100</span>
        </div>
        <div className="min-w-0">
          <span
            className="inline-flex items-center gap-2 text-body-sm font-semibold px-3 py-1.5 rounded-full"
            style={{
              background: `color-mix(in srgb, ${band.color} 12%, transparent)`,
              color: band.color,
            }}
          >
            <span
              aria-hidden
              className="inline-block w-2 h-2 rounded-full"
              style={{ background: band.color }}
            />
            {t(`landing.rayon_x.band.${band.key}`)}
          </span>
          <p className="text-body-sm text-[color:var(--apple-text-2)] mt-2 max-w-[360px]">
            {t(`landing.rayon_x.verdict.${band.key}`)}
          </p>
        </div>
      </div>

      {/* Signaux de confiance : couverture + greenwashing */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span className="apple-badge">{coverageLabel}</span>
        <RiskChip risk={asset.greenwashing_risk} />
      </div>

      {/* Piliers */}
      <div className="mt-8 grid sm:grid-cols-3 gap-5">
        {pillars.map((p) => (
          <PillarBar key={p.label} label={p.label} val={p.val} />
        ))}
      </div>
      <p className="mt-4 font-mono text-caption text-[color:var(--apple-text-2)]">
        {t("landing.rayon_x.ter_label")}{" "}
        {(asset.ter * 100).toFixed(2).replace(".", i18n.language === "en" ? "." : ",")}%
      </p>

      <div className="my-7 gold-rule" style={{ opacity: 0.12 }} />

      {/* Ce que finance ce fonds / ce qu'il n'exclut pas */}
      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <p className="text-body-sm font-semibold mb-3" style={{ color: "var(--mint)" }}>
            ✅ {t("landing.rayon_x.finances_pos")}
          </p>
          {asset.themes.length > 0 ? (
            <ul className="space-y-2">
              {asset.themes.map((th) => (
                <li key={th.tag} className="flex items-center justify-between gap-3">
                  <span className="text-body-sm text-[color:var(--apple-text)]">
                    {t(`landing.rayon_x.themes_labels.${th.tag}`, { defaultValue: th.tag })}
                  </span>
                  <span className="font-mono text-body-sm tabular-nums text-[color:var(--apple-text-2)]">
                    {th.pct}%
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-body-sm text-[color:var(--apple-text-2)]">
              {t("landing.rayon_x.finances_pos_empty")}
            </p>
          )}
        </div>

        <div>
          <p className="text-body-sm font-semibold mb-3" style={{ color: "var(--solar-ink)" }}>
            ⚠ {t("landing.rayon_x.not_excluded")}
          </p>
          {notExcluded.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {notExcluded.map((s) => (
                <li
                  key={s}
                  className="text-caption font-medium px-2.5 py-1 rounded-full"
                  style={{
                    background: "color-mix(in srgb, var(--solar) 10%, transparent)",
                    color: "var(--solar-ink)",
                  }}
                >
                  {t(`landing.rayon_x.sectors_labels.${s}`, { defaultValue: s })}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-body-sm text-[color:var(--apple-text-2)]">
              {t("landing.rayon_x.not_excluded_empty")}
            </p>
          )}

          {asset.greenwashing_reasons.length > 0 && (
            <div className="mt-4">
              <p className="text-caption font-semibold text-[color:var(--apple-text-2)] mb-1.5">
                {t("landing.rayon_x.flags")}
              </p>
              <ul className="space-y-1.5">
                {asset.greenwashing_reasons.map((reason) => (
                  <li
                    key={reason}
                    className="text-caption text-[color:var(--apple-text-2)] pl-3 relative"
                  >
                    <span
                      aria-hidden
                      className="absolute left-0 top-[0.5em] w-1 h-1 rounded-full"
                      style={{ background: "var(--solar)" }}
                    />
                    {t(`transparency.reasons.${reason}`, { defaultValue: reason })}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Attribution : source + date, à l'écran, jamais en petit caractère caché */}
      <p className="mt-7 font-mono text-caption text-[color:var(--apple-text-2)]">
        {t("landing.rayon_x.sources", {
          source: asset.source ?? t("landing.rayon_x.source_unknown"),
          coverage: coverageLabel,
        })}
        {asof ? ` · ${t("landing.rayon_x.asof", { date: asof })}` : ""}
      </p>

      {/* Pont vers l'offre : un fonds n'est qu'une pièce du portefeuille */}
      <div
        className="mt-8 rounded-[16px] p-6 md:p-7"
        style={{ background: "var(--apple-dark)", color: "#ffffff" }}
      >
        <p className="apple-eyebrow" style={{ color: "var(--ice)" }}>
          {t("landing.rayon_x.bridge_eyebrow")}
        </p>
        <p
          className="mt-2 font-bold"
          style={{ fontSize: "clamp(20px, 3vw, 26px)", letterSpacing: "-0.02em", color: "#ffffff" }}
        >
          {t("landing.rayon_x.bridge_title")}
        </p>
        <p className="mt-2 text-body-sm" style={{ color: "#a1a1a6" }}>
          {t("landing.rayon_x.bridge_sub")}
        </p>
        <Link
          to="/onboarding"
          className="apple-btn-primary mt-5"
          style={{ background: "var(--mint)" }}
        >
          {t("landing.rayon_x.bridge_cta")}
        </Link>
      </div>

      <p className="mt-5 text-caption text-[color:var(--apple-text-2)] text-center">
        {t("landing.rayon_x.disclaimer")}
      </p>
    </div>
  );
}
