import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Provenance } from "@/components/ui/Provenance";
import { WhyThis } from "@/components/common/WhyThis";
import { SeedowScore, ScorePillars } from "@/components/esg/SeedowScore";
import { notExcluded } from "@/lib/esg/exclusions";
import { trackAppEvent } from "@/lib/analytics/appEvents";
import type { EsgPreviewAsset } from "@/routes/api.public.esg-preview";

/**
 * « Ton argent finance quoi ? » — la porte d'entrée du produit.
 *
 * C'est le seul écran qui doit tenir en dix secondes : on tape le nom d'un
 * fonds, et on lit ce qu'il finance, ce qu'il ne s'interdit pas de financer, et
 * à quel point Seedow peut le prouver. Pas de compte, pas de questionnaire.
 *
 * ── Pourquoi il remplace le questionnaire en première scène ────────────────
 *
 * L'ancien parcours ouvrait sur quatre questions avant de montrer quoi que ce
 * soit : formulaire → résultat. On demandait ses convictions à quelqu'un qui ne
 * savait pas encore ce que le produit sait faire. Ici l'ordre est inversé —
 * curiosité, découverte, surprise — et le questionnaire garde tout son sens,
 * une fois qu'on a compris pourquoi il est posé.
 *
 * ── Trois niveaux de lecture ───────────────────────────────────────────────
 *
 *   1. ce que ça finance / ce que ça ne s'interdit pas + le score et sa bande ;
 *   2. « Pourquoi ce score ? » → les piliers du composite, tels qu'il les
 *      calcule vraiment (ESG, climat, exclusions) ;
 *   3. « D'où viennent ces chiffres ? » → source, date, couverture, drapeaux,
 *      et ce que Seedow ne sait PAS de ce fonds.
 *
 * Un débutant s'arrête au niveau 1 et a compris. Un professionnel descend au
 * niveau 3 et trouve de quoi vérifier. Aucun des deux ne gêne l'autre.
 *
 * ── Rien d'inventé ─────────────────────────────────────────────────────────
 *
 * Chaque valeur affichée vient d'une colonne réelle servie par
 * `/api/public/esg-preview`. Les trous sont nommés (« donnée indisponible »,
 * « couverture limitée »), jamais comblés. Notamment : « ne s'interdit pas »
 * décrit l'ABSENCE d'une exclusion déclarée — pas la présence d'une position,
 * qu'on n'a pas mesurée et qu'on n'affirme donc pas.
 */

/** Combien de suggestions on propose avant toute frappe. */
const SUGGESTION_COUNT = 3;
const MAX_RESULTS = 6;

export function MoneyXray({ variant = "hero" }: { variant?: "hero" | "section" } = {}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [assets, setAssets] = useState<EsgPreviewAsset[] | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "ready">("idle");
  const [selected, setSelected] = useState<EsgPreviewAsset | null>(null);
  const fetchStarted = useRef(false);

  /**
   * L'index n'est chargé qu'au premier contact (focus ou frappe) : la landing
   * reste légère pour qui ne teste pas le widget, et l'endpoint est mis en cache
   * une heure côté edge — un visiteur qui essaie ne coûte pas un accès base.
   */
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
      .slice(0, MAX_RESULTS);
  }, [assets, query]);

  /**
   * Suggestions de départ. Elles sortent de l'index réellement chargé — un
   * exemple codé en dur finirait un jour par désigner un fonds qui n'est plus
   * dans le catalogue, et le premier geste du produit tomberait à vide.
   */
  const suggestions = useMemo(() => (assets ?? []).slice(0, SUGGESTION_COUNT), [assets]);

  /**
   * Index chargé mais VIDE : ce n'est pas « ce fonds est introuvable », c'est
   * « le catalogue n'a rien renvoyé ». Les deux se ressemblent à l'écran et ne
   * veulent pas dire la même chose — l'un décrit un fonds, l'autre une panne.
   * Sans cette distinction, une base injoignable se lit comme un catalogue vide.
   */
  const catalogueEmpty = status === "ready" && (assets?.length ?? 0) === 0;
  const showEmpty =
    status === "ready" && !catalogueEmpty && query.trim().length >= 2 && results.length === 0;

  const pick = (asset: EsgPreviewAsset) => {
    setSelected(asset);
    void trackAppEvent("xray_fund_opened", { ticker: asset.ticker });
  };

  if (selected) {
    return <XrayReveal asset={selected} onReset={() => setSelected(null)} variant={variant} />;
  }

  return (
    <div className="paper-card p-6 md:p-7">
      <label htmlFor="money-xray" className="stamp">
        {t("xray.field_label")}
      </label>
      <input
        id="money-xray"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={load}
        placeholder={t("xray.placeholder")}
        autoComplete="off"
        className="mt-2.5 w-full h-12 px-4 rounded-[14px] border border-paper-3 bg-paper text-body text-ink placeholder:text-ink-3 outline-none transition-colors focus:border-ink focus-visible:ring-2 focus-visible:ring-ink"
      />

      <div className="mt-4 flex flex-col gap-2.5" aria-live="polite">
        {status === "loading" && (
          <p className="py-3 text-body-sm text-ink-3">{t("xray.loading")}</p>
        )}
        {status === "error" && (
          <div className="py-3">
            <p className="text-body-sm text-ink-2">{t("xray.error")}</p>
            <button
              type="button"
              onClick={() => {
                fetchStarted.current = false;
                load();
              }}
              className="mt-1.5 text-body-sm font-semibold text-mint-ink underline underline-offset-4 hover:no-underline rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
            >
              {t("common.retry")}
            </button>
          </div>
        )}
        {catalogueEmpty && (
          <p className="py-3 text-body-sm text-ink-2 leading-relaxed">
            {t("xray.catalogue_unavailable")}
          </p>
        )}
        {showEmpty && (
          <div className="py-3">
            <p className="text-body-sm text-ink-2">{t("xray.no_results")}</p>
            <p className="mt-1 text-body-sm text-ink-3 leading-relaxed">
              {t("xray.no_results_hint")}
            </p>
          </div>
        )}
        {results.map((a) => (
          <ResultRow key={a.ticker} asset={a} onSelect={() => pick(a)} />
        ))}
      </div>

      {/* Avant toute frappe : trois fonds réels de l'index, cliquables. Un champ
          vide face à quelqu'un qui ne connaît aucun nom d'ETF, c'est un cul-de-sac. */}
      {results.length === 0 && !showEmpty && !catalogueEmpty && suggestions.length > 0 && (
        <div className="mt-4">
          <p className="stamp">{t("xray.try_label")}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {suggestions.map((a) => (
              <button
                key={a.ticker}
                type="button"
                onClick={() => pick(a)}
                className="chip hover:bg-paper-inset transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
              >
                {a.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Ce que le champ va rendre, dit AVANT de taper : sans cette ligne, la
          carte demande un geste sans annoncer sa contrepartie. */}
      <p className="mt-5 text-body-sm leading-relaxed text-ink-2">{t("landing.xray_hint")}</p>
      <p className="mt-2.5 text-body-sm leading-relaxed text-ink-3">{t("xray.disclaimer")}</p>
    </div>
  );
}

/* ─────────────────────────── Ligne de résultat ─────────────────────────── */

function ResultRow({ asset, onSelect }: { asset: EsgPreviewAsset; onSelect: () => void }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onSelect}
      className="paper-card-inset w-full min-h-[56px] px-4 py-3 flex items-center gap-4 text-left hover:bg-paper-inset transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
    >
      <span className="flex-1 min-w-0">
        <span className="block text-body font-semibold text-ink truncate">{asset.name}</span>
        <span className="mono-meta block mt-0.5 truncate">
          {[asset.ticker, asset.issuer, t(`transparency.coverage.${asset.coverage}`)]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </span>
      <span aria-hidden className="text-ink-3 text-xl flex-none">
        ›
      </span>
    </button>
  );
}

/* ──────────────────────────── Le révélateur ────────────────────────────── */

function XrayReveal({
  asset,
  onReset,
  variant,
}: {
  asset: EsgPreviewAsset;
  onReset: () => void;
  variant: "hero" | "section";
}) {
  const { t } = useTranslation();

  // Ce que le fonds NE S'INTERDIT PAS. Formulation exacte : c'est l'absence
  // d'une exclusion déclarée, pas la preuve d'une position détenue.
  const allowed = notExcluded(asset.excluded_sectors);
  const coverageLabel = t(`transparency.coverage.${asset.coverage}`);

  const meta = [
    asset.ticker,
    asset.issuer,
    asset.isin,
    asset.sfdr_article != null ? `SFDR Art. ${asset.sfdr_article}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="paper-card p-6 md:p-7">
      {/* En-tête : de quoi on parle, et comment en changer. */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="mono-meta truncate">{meta}</p>
          <h3 className="mt-1 font-display text-[clamp(20px,3vw,26px)] leading-[1.12] tracking-[-0.02em] text-ink">
            {asset.name}
          </h3>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="flex-none min-h-[44px] px-1 text-body-sm font-semibold text-mint-ink underline underline-offset-4 hover:no-underline rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
        >
          {t("xray.another")}
        </button>
      </div>

      {/* ── NIVEAU 1 — la réponse ─────────────────────────────────────────── */}

      <div className="mt-7 flex flex-col gap-7">
        <section>
          <p className="stamp">{t("xray.finances_label")}</p>
          {asset.themes.length > 0 ? (
            <ul className="mt-2.5 flex flex-col">
              {asset.themes.map((th) => (
                <li
                  key={th.tag}
                  className="flex items-baseline justify-between gap-3 py-2 border-b border-paper-3"
                >
                  <span className="text-body-sm text-ink">
                    {t(`landing.rayon_x.themes_labels.${th.tag}`, { defaultValue: th.tag })}
                  </span>
                  <span className="font-value text-body-sm tabular-nums text-ink">{th.pct} %</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2.5 text-body-sm text-ink-3 leading-relaxed">
              {t("xray.finances_empty")}
            </p>
          )}
        </section>

        {/* Le moment « attends, mon argent finance ça ? ». Il vient du même
            écran que la promesse du fonds, pas trois clics plus loin. */}
        <section>
          <p className="stamp">{t("xray.not_excluded_label")}</p>
          {allowed.length > 0 ? (
            <>
              <ul className="mt-2.5 flex flex-wrap gap-2">
                {allowed.map((s) => (
                  <li key={s} className="chip chip--modelled">
                    {t(`landing.rayon_x.sectors_labels.${s}`, { defaultValue: s })}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-body-sm text-ink-3 leading-relaxed">
                {t("xray.not_excluded_note")}
              </p>
            </>
          ) : (
            <p className="mt-2.5 text-body-sm text-ink-2 leading-relaxed">
              {t("xray.not_excluded_empty")}
            </p>
          )}
        </section>
      </div>

      <div className="mt-7 pt-6 border-t border-paper-3 flex flex-wrap items-start justify-between gap-x-8 gap-y-5">
        <SeedowScore score={asset.seedow_score} size="md" />
        <div className="max-w-[34ch]">
          <p className="stamp">{t("xray.cost_label")}</p>
          <p className="font-value text-[24px] leading-none text-ink mt-2 tabular-nums">
            {(asset.ter * 100).toFixed(2).replace(".", ",")} %
          </p>
          <p className="mt-2 text-body-sm text-ink-3 leading-relaxed">{t("xray.cost_note")}</p>
        </div>
      </div>

      {/* ── NIVEAU 2 — pourquoi ce nombre ─────────────────────────────────── */}

      <div className="mt-6 border-t border-paper-3">
        <WhyThis variant="section" label={t("xray.why_score")}>
          <p className="mb-4 max-w-[60ch]">{t("xray.why_score_intro")}</p>
          <ScorePillars pillars={asset.score_breakdown} />
          <p className="mt-4 text-caption text-ink-3 leading-relaxed max-w-[60ch]">
            {t("xray.score_is_index")}
          </p>
        </WhyThis>
      </div>

      {/* ── NIVEAU 3 — d'où ça vient, et ce qu'on ignore ──────────────────── */}

      <div className="border-t border-paper-3">
        <WhyThis variant="section" label={t("xray.where_from")}>
          <Provenance
            status={asset.coverage === "estimated" ? "modelled" : "verified"}
            source={asset.source ?? t("xray.source_unknown")}
            asOf={asset.data_asof ?? undefined}
            note={coverageLabel}
          />

          {asset.greenwashing_reasons.length > 0 && (
            <div className="mt-5">
              <p className="stamp">{t("xray.flags_label")}</p>
              <ul className="mt-2">
                {asset.greenwashing_reasons.map((reason) => (
                  <li key={reason} className="py-2 border-b border-paper-3 text-body-sm text-ink-2">
                    {t(`transparency.reasons.${reason}`, { defaultValue: reason })}
                  </li>
                ))}
              </ul>
              <p className="mt-2.5 text-caption text-ink-3 leading-relaxed max-w-[60ch]">
                {t("xray.flags_note")}
              </p>
            </div>
          )}

          <p className="mt-5 max-w-[60ch]">{t("xray.limits")}</p>
        </WhyThis>
      </div>

      {/* ── La suite : le fonds complet, puis ses alternatives ────────────── */}

      <div className="mt-6 pt-6 border-t border-paper-3 flex flex-wrap items-center gap-x-6 gap-y-3">
        <Link
          to="/fonds/$isin"
          params={{ isin: asset.isin ?? asset.ticker }}
          className="text-body font-semibold text-ink underline underline-offset-4 hover:no-underline rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
        >
          {t("xray.full_sheet")} <span aria-hidden>→</span>
        </Link>
        {variant === "hero" && (
          <Link
            to="/onboarding"
            search={{ guest: true }}
            onClick={() => {
              void trackAppEvent("landing_cta_clicked", {
                placement: "xray_reveal",
                destination: "preview",
              });
            }}
            className="text-body font-semibold text-mint-ink underline underline-offset-4 hover:no-underline rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
          >
            {t("xray.find_alternatives")} <span aria-hidden>→</span>
          </Link>
        )}
      </div>
    </div>
  );
}
