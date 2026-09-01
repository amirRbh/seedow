import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { WhyThis } from "@/components/common/WhyThis";
import { StiScore } from "@/components/observatory/StiScore";
import { StiBlocks } from "@/components/observatory/StiBlocks";
import { ThemeClaims } from "@/components/observatory/ThemeClaims";
import { SectorDisclosureList } from "@/components/observatory/SectorDisclosure";
import { EuroBreakdownBlock } from "@/components/impact/EuroBreakdownBlock";
import { useFundComposition } from "@/hooks/useFundComposition";
import { hasPublishedComposition } from "@/lib/impact/euroBreakdown";
import { trackAppEvent } from "@/lib/analytics/appEvents";
import type { ObservatoryFund } from "@/lib/esg/v2/observatory";

/**
 * « Ton argent finance quoi ? » — la porte d'entrée du produit.
 *
 * C'est le seul écran qui doit tenir en dix secondes : on tape le nom d'un
 * fonds, et on lit ce qu'il finance, ce qu'il publie, et ce que Seedow n'a pas
 * pu vérifier. Pas de compte, pas de questionnaire.
 *
 * ── Ce que ce widget a cessé d'afficher (grille STI 2.0) ───────────────────
 *
 * Un score de durabilité 0–100, ses piliers, des pourcentages thématiques
 * (« biodiversité 85 % ») et une liste de « drapeaux de greenwashing ». Trois
 * de ces quatre objets étaient des appréciations Seedow présentées avec la
 * précision d'une mesure — sur la surface la plus visible du produit, et sans
 * l'écran qui explique d'où elles sortent. Le pourcentage thématique était
 * saisi à la main ; le score mélangeait une donnée tierce, une estimation
 * carbone et un décompte d'exclusions ; la moitié des drapeaux décrivaient un
 * trou de données de Seedow, pas un défaut du fonds.
 *
 * À la place : l'indice de transparence, qui mesure ce que le fonds PUBLIE, et
 * qui vient du même assemblage que l'Observatoire et les fiches. Un fonds ne
 * peut plus afficher un chiffre ici et un autre là.
 *
 * ── Trois niveaux de lecture ───────────────────────────────────────────────
 *
 *   1. la composition publiée dite EN EUROS sur 1 000 € — la seule chose qui se
 *      comprend sans rien savoir de la finance —, puis ce que le fonds
 *      revendique et ce que sa documentation dit des six secteurs ;
 *   2. « Comment ce chiffre est calculé ? » → les cinq blocs du STI, avec les
 *      signaux non vérifiés nommés un par un ;
 *   3. « Et ce que Seedow ne sait pas » → les limites, dites en toutes lettres.
 *
 * Un débutant s'arrête au niveau 1 et a compris. Un professionnel descend au
 * niveau 3 et trouve de quoi vérifier.
 */

/** Combien de suggestions on propose avant toute frappe. */
const SUGGESTION_COUNT = 3;
const MAX_RESULTS = 6;

export function MoneyXray({ variant = "hero" }: { variant?: "hero" | "section" } = {}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [funds, setFunds] = useState<ObservatoryFund[] | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "ready">("idle");
  const [selected, setSelected] = useState<ObservatoryFund | null>(null);
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
      .then((json: { funds?: ObservatoryFund[] }) => {
        setFunds(json.funds ?? []);
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
    if (!funds || q.length < 2) return [];
    return funds
      .filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.tickers.some((tk) => tk.toLowerCase().includes(q)) ||
          f.isins.some((i) => i.toLowerCase().includes(q)) ||
          (f.issuer ?? "").toLowerCase().includes(q),
      )
      .slice(0, MAX_RESULTS);
  }, [funds, query]);

  /**
   * Suggestions de départ. Elles sortent de l'index réellement chargé — un
   * exemple codé en dur finirait un jour par désigner un fonds qui n'est plus
   * dans le catalogue, et le premier geste du produit tomberait à vide.
   */
  const suggestions = useMemo(() => (funds ?? []).slice(0, SUGGESTION_COUNT), [funds]);

  /**
   * Index chargé mais VIDE : ce n'est pas « ce fonds est introuvable », c'est
   * « le catalogue n'a rien renvoyé ». Les deux se ressemblent à l'écran et ne
   * veulent pas dire la même chose — l'un décrit un fonds, l'autre une panne.
   */
  const catalogueEmpty = status === "ready" && (funds?.length ?? 0) === 0;
  const showEmpty =
    status === "ready" && !catalogueEmpty && query.trim().length >= 2 && results.length === 0;

  const pick = (fund: ObservatoryFund) => {
    setSelected(fund);
    void trackAppEvent("xray_fund_opened", { ticker: fund.tickers[0] ?? fund.slug });
  };

  if (selected) {
    return <XrayReveal fund={selected} onReset={() => setSelected(null)} variant={variant} />;
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
        {results.map((f) => (
          <ResultRow key={f.key} fund={f} onSelect={() => pick(f)} />
        ))}
      </div>

      {/* Avant toute frappe : trois fonds réels de l'index, cliquables. Un champ
          vide face à quelqu'un qui ne connaît aucun nom d'ETF, c'est un cul-de-sac. */}
      {results.length === 0 && !showEmpty && !catalogueEmpty && suggestions.length > 0 && (
        <div className="mt-4">
          <p className="stamp">{t("xray.try_label")}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {suggestions.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => pick(f)}
                className="chip hover:bg-paper-inset transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
              >
                {f.name}
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

function ResultRow({ fund, onSelect }: { fund: ObservatoryFund; onSelect: () => void }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onSelect}
      className="paper-card-inset w-full min-h-[56px] px-4 py-3 flex items-center gap-4 text-left hover:bg-paper-inset transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
    >
      <span className="flex-1 min-w-0">
        <span className="block text-body font-semibold text-ink truncate">{fund.name}</span>
        <span className="mono-meta block mt-0.5 truncate">
          {[
            fund.tickers.join(" · "),
            fund.issuer,
            // Le nombre de blocs évalués voyage avec le fonds dès la liste : un
            // résultat de recherche ne doit pas laisser croire à une note pleine.
            t("sti.blocks_evaluated", {
              evaluated: fund.sti.blocksEvaluated,
              total: fund.sti.blocksTotal,
            }),
          ]
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
  fund,
  onReset,
  variant,
}: {
  fund: ObservatoryFund;
  onReset: () => void;
  variant: "hero" | "section";
}) {
  const { t } = useTranslation();
  const composition = useFundComposition(fund.slug);
  // Elle ouvre le révélateur quand elle existe. Sinon elle descend au niveau
  // des sources : le premier geste du produit ne peut pas rendre une absence.
  const composed = hasPublishedComposition(composition.holdings);

  const meta = [
    fund.tickers.join(" · "),
    fund.issuer,
    fund.isins[0],
    fund.sfdrArticle != null ? `SFDR Art. ${fund.sfdrArticle}` : null,
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
            {fund.name}
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

      {/* ── NIVEAU 1 — la réponse, en euros ───────────────────────────────
          « Sur 1 000 € placés ici, 314 € vont à la technologie » ne demande de
          savoir lire ni un score ni un pourcentage d'exposition. C'est donc ce
          qui arrive en premier. La composition n'est pas dans l'index public
          (le payload serait absurde) : elle est récupérée pour le seul fonds
          ouvert. */}
      {(composition.status !== "ready" || composed) && (
        <div className="mt-7 border-t border-paper-3 pt-6">
          {composition.status !== "ready" ? (
            <p className="text-body-sm text-ink-3" role="status">
              {t("xray.composition_loading")}
            </p>
          ) : (
            <EuroBreakdownBlock
              variant="bare"
              holdings={composition.holdings}
              asOf={composition.asOf}
              source={fund.issuer}
              sourceUrl={composition.sourceUrl}
              ter={fund.ter ?? 0}
            />
          )}
        </div>
      )}

      {/* ── NIVEAU 1 bis — ce que le fonds revendique, et ce qu'il documente ── */}

      <div className="mt-7 flex flex-col gap-7">
        <section>
          <p className="stamp">{t("fonds_page.themes_declared")}</p>
          <ThemeClaims themes={fund.themes} />
          <p className="mt-3 text-caption text-ink-3 leading-relaxed max-w-[60ch]">
            {t("themes.no_attribution_note")}
          </p>
        </section>

        {/* Le moment « attends, mon argent finance ça ? ». Il vient du même
            écran que la promesse du fonds, pas trois clics plus loin — et il
            distingue « le fonds documente qu'il n'exclut pas » de « Seedow n'a
            pas vérifié », qui ne disent pas la même chose. */}
        <section>
          <p className="stamp">{t("sti.sectors_title")}</p>
          <SectorDisclosureList sectors={fund.sectors} />
        </section>
      </div>

      <div className="mt-7 pt-6 border-t border-paper-3 flex flex-wrap items-start justify-between gap-x-8 gap-y-5">
        <StiScore sti={fund.sti} size="md" />
        <div className="max-w-[34ch]">
          <p className="stamp">{t("xray.cost_label")}</p>
          <p className="font-value text-[24px] leading-none text-ink mt-2 tabular-nums">
            {fund.ter != null ? `${(fund.ter * 100).toFixed(2).replace(".", ",")} %` : "—"}
          </p>
          <p className="mt-2 text-body-sm text-ink-3 leading-relaxed">{t("xray.cost_note")}</p>
        </div>
      </div>

      {/* ── NIVEAU 2 — comment ce chiffre est calculé ──────────────────────── */}

      <div className="mt-6 border-t border-paper-3">
        <WhyThis variant="section" label={t("sti.why_this_number")}>
          <p className="mb-4 max-w-[60ch]">{t("sti.what_it_measures")}</p>
          <StiBlocks sti={fund.sti} />
        </WhyThis>
      </div>

      {/* ── NIVEAU 3 — d'où ça vient, et ce qu'on ignore ──────────────────── */}

      <div className="border-t border-paper-3">
        <WhyThis variant="section" label={t("xray.where_from")}>
          {fund.sti.oldestDataDate && (
            <p className="mono-meta">{t("sti.oldest_data", { date: fund.sti.oldestDataDate })}</p>
          )}

          {/* Une composition non publiée est une chose que Seedow ne sait pas
              de ce fonds : elle a sa place ici, avec les autres. */}
          {composition.status === "ready" && !composed && (
            <div className="mt-5">
              <p className="font-semibold text-ink">{t("euro_breakdown.empty_title")}</p>
              <p className="mt-1.5 max-w-[60ch]">{t("euro_breakdown.empty_body")}</p>
            </div>
          )}

          <p className="mt-5 max-w-[60ch]">{t("xray.limits")}</p>
        </WhyThis>
      </div>

      {/* ── La suite : le fonds complet, puis ses alternatives ────────────── */}

      <div className="mt-6 pt-6 border-t border-paper-3 flex flex-wrap items-center gap-x-6 gap-y-3">
        <Link
          to="/fonds/$isin"
          params={{ isin: fund.slug }}
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
