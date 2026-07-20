import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { EsgPreviewAsset } from "@/routes/api.public.esg-preview";

/**
 * Quick win pré-inscription : chercher un fonds → voir score ESG + risque
 * greenwashing en <10 s, sans compte. La démo qui vend le produit à elle-même.
 *
 * Les données ne sont chargées qu'au premier focus/frappe : la landing reste
 * légère pour les visiteurs qui ne testent pas le widget.
 */
export function EsgQuickCheck() {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [assets, setAssets] = useState<EsgPreviewAsset[] | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "ready">("idle");
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
          (a.issuer ?? "").toLowerCase().includes(q),
      )
      .slice(0, 5);
  }, [assets, query]);

  const showEmpty = status === "ready" && query.trim().length >= 2 && results.length === 0;

  return (
    <section className="px-6 py-24 md:py-32">
      <div className="max-w-[720px] mx-auto text-center">
        <p className="apple-eyebrow" style={{ color: "var(--mint)" }}>
          {t("landing.quick_check.eyebrow")}
        </p>
        <h2 className="apple-title mx-auto mt-3">{t("landing.quick_check.title")}</h2>
        <p className="apple-subtitle mx-auto max-w-[520px] mt-5">
          {t("landing.quick_check.subtitle")}
        </p>

        <div className="mt-10 text-left">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={load}
            placeholder={t("landing.quick_check.placeholder")}
            aria-label={t("landing.quick_check.placeholder")}
            className="apple-input w-full"
          />

          <div className="mt-4 space-y-2.5" aria-live="polite">
            {status === "loading" && query.trim().length >= 2 && (
              <p className="text-body-sm text-[color:var(--apple-text-2)] text-center py-4">
                {t("landing.quick_check.loading")}
              </p>
            )}
            {status === "error" && (
              <p className="text-body-sm text-[color:var(--apple-text-2)] text-center py-4">
                {t("landing.quick_check.error")}
              </p>
            )}
            {showEmpty && (
              <p className="text-body-sm text-[color:var(--apple-text-2)] text-center py-4">
                {t("landing.quick_check.no_results")}
              </p>
            )}
            {results.map((a) => (
              <QuickCheckRow key={a.ticker} asset={a} />
            ))}
          </div>

          {results.length > 0 && (
            <div className="mt-8 text-center">
              <Link to="/onboarding" className="apple-btn-primary">
                {t("landing.quick_check.cta")}
              </Link>
              <p className="text-caption text-[color:var(--apple-text-2)] mt-4">
                {t("landing.quick_check.disclaimer")}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

const RISK_STYLE: Record<EsgPreviewAsset["greenwashing_risk"], { bg: string; fg: string }> = {
  low: { bg: "rgba(29,131,72,0.12)", fg: "#1d8348" },
  medium: { bg: "rgba(180,120,0,0.12)", fg: "#8a5a00" },
  high: { bg: "rgba(200,60,30,0.12)", fg: "#b03a20" },
};

function QuickCheckRow({ asset }: { asset: EsgPreviewAsset }) {
  const { t } = useTranslation();
  const risk = RISK_STYLE[asset.greenwashing_risk];
  return (
    <div className="apple-card p-4 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-body font-semibold text-[color:var(--apple-text)] truncate">
          {asset.name}
        </p>
        <p className="text-caption text-[color:var(--apple-text-2)] mt-0.5">
          {asset.ticker}
          {asset.issuer ? ` · ${asset.issuer}` : ""}
          {asset.sfdr_article ? ` · SFDR Art. ${asset.sfdr_article}` : ""}
          {" · "}
          {t(`transparency.coverage.${asset.coverage}`)}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-[22px] font-bold leading-none text-[color:var(--apple-text)]">
          {asset.esg.toFixed(1)}
          <span className="text-caption font-normal text-[color:var(--apple-text-2)]">/10</span>
        </p>
        <span
          className="inline-block mt-1.5 text-caption font-semibold px-2 py-0.5 rounded-full"
          style={{ background: risk.bg, color: risk.fg }}
        >
          {asset.greenwashing_risk !== "low" && <span aria-hidden>⚠ </span>}
          {t(`transparency.gw_risk.${asset.greenwashing_risk}`)}
        </span>
      </div>
    </div>
  );
}
