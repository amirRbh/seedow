import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Plus, Trash2, Sprout, Compass } from "lucide-react";
import { useLang } from "@/hooks/useLang";
import { formatCurrency, formatPercent } from "@/lib/format";
import { createCustomPortfolio } from "@/lib/portfolio/customize.functions";
import {
  liteSnapshot,
  describeConsequences,
  CONCENTRATION_ALERT,
  type Consequence,
  type LiteSnapshot,
} from "@/lib/portfolio/consequences";
import { WEIGHT_EPSILON } from "@/lib/portfolio/weights";
import { diversificationBand, impactScore } from "@/lib/portfolio/plain-language";
import { AssetPickerSheet, type PickedAsset } from "./AssetPickerSheet";
import { PortfolioAnalysisPanel } from "./PortfolioAnalysisPanel";
import { usePortfolioAnalysis } from "@/hooks/usePortfolioAnalysis";
import { readPoolHandoff, type PoolHandoffIntent } from "@/lib/onboarding/poolHandoff";

interface Line {
  id: string;
  ticker: string;
  name: string;
  esgScore: number;
  /** Montant placé sur cette ligne, en euros. */
  amount: number;
}

/** Montant à répartir par défaut, quand le builder est ouvert sans questionnaire. */
const DEFAULT_TOTAL = 100;
/** Raccourcis proposés sur chaque ligne, en fraction du montant total. */
const QUICK_SHARES = [0.1, 0.25, 0.5];

const clampAmount = (v: number, max: number): number =>
  Math.max(0, Math.min(max, Number.isFinite(v) ? Math.round(v) : 0));

/**
 * Parcours « Page blanche » (mission Seedow §4) — on démarre vide et on compose
 * soi-même, sans jamais jeter le débutant dans un tableau financier.
 *
 * **On répartit des EUROS, pas des pourcentages.** Un débutant sait ce que
 * représentent 250 € ; « 50 % » lui demande un calcul mental et une abstraction
 * de plus. Le pourcentage reste affiché, mais comme un détail dérivé — jamais
 * comme la chose qu'on manipule. Ce qui n'est pas placé se lit en euros : « il
 * te reste 150 € », pas « 30 % non attribués ».
 *
 * Lignes INDÉPENDANTES : Seedow ne rééquilibre pas à la place de l'utilisateur
 * et ne le rappelle pas à l'ordre sur un « tout placé » — il accompagne
 * (diversification, concentration, impact en langage clair). Les parts sont
 * enregistrées TELLES QUELLES : ce qui n'est pas attribué reste non attribué
 * (cf. `lib/portfolio/weights`).
 */
export function BlankCanvasBuilder() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const navigate = useNavigate();
  const create = useServerFn(createCustomPortfolio);
  const [lines, setLines] = useState<Line[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  // Intention transmise par l'aperçu : mode (premier portefeuille vs ajout),
  // convictions à conserver, nom. Sans seed → défauts (replace, aucune cause).
  const [intent, setIntent] = useState<PoolHandoffIntent | null>(null);
  // Le montant à répartir. Il vient du questionnaire quand il y en a eu un, et
  // reste modifiable ici : c'est le chiffre autour duquel toute la composition
  // se lit, il ne doit pas être subi.
  const [total, setTotal] = useState(DEFAULT_TOTAL);
  const [editingTotal, setEditingTotal] = useState(false);

  // Amorçage depuis le pool de l'aperçu (bascule « pool plutôt qu'allocation ») :
  // le builder démarre pré-rempli des actifs sélectionnés, à 0 % — Seedow ne
  // propose pas de poids, l'utilisateur alloue lui-même (curseurs). Lecture
  // client-only (localStorage indisponible en SSR) et à usage unique (le seed
  // est purgé à la lecture) — sans seed, on reste sur le builder vide habituel.
  useEffect(() => {
    const seed = readPoolHandoff();
    if (!seed) return;
    setIntent({
      mode: seed.mode,
      causes: seed.causes,
      exclusions: seed.exclusions,
      name: seed.name,
      initialAmount: seed.initialAmount,
      riskTarget: seed.riskTarget,
      horizonYears: seed.horizonYears,
    });
    if (seed.initialAmount != null && seed.initialAmount > 0) setTotal(seed.initialAmount);
    setLines((ls) =>
      ls.length > 0
        ? ls
        : seed.assets.map((a) => ({
            id: a.id,
            ticker: a.ticker,
            name: a.name,
            esgScore: a.esgScore,
            // Rien n'est placé d'office : Seedow ne propose pas de répartition.
            amount: 0,
          })),
    );
    // Au montage uniquement : le seed est déterministe et à usage unique.
  }, []);

  // ── Copilote ───────────────────────────────────────────────────────────
  // Après chaque geste TERMINÉ (curseur relâché, ligne ajoutée ou retirée), on
  // compare l'avant et l'après pour dire ce que le choix a changé. Purement
  // analytique : aucun poids n'est modifié ici, jamais.
  const committed = useRef<{ snapshot: LiteSnapshot; amounts: Record<string, number> } | null>(
    null,
  );
  const [changed, setChanged] = useState<{
    name: string;
    from: number;
    to: number;
    consequences: Consequence[];
  } | null>(null);

  // `liteSnapshot` normalise défensivement : lui passer des euros donne les
  // mêmes parts relatives que des pourcentages.
  const snapshotOf = (ls: Line[]): LiteSnapshot =>
    liteSnapshot(
      ls
        .filter((l) => l.amount > 0)
        .map((l) => ({ id: l.id, esgScore: l.esgScore, weight: l.amount })),
    );

  /** À appeler une fois le geste terminé, avec l'état résultant. */
  const commit = (next: Line[], movedId?: string) => {
    const snapshot = snapshotOf(next);
    const amounts = Object.fromEntries(next.map((l) => [l.id, l.amount]));
    const before = committed.current;
    if (before && movedId) {
      const from = before.amounts[movedId] ?? 0;
      const to = amounts[movedId] ?? 0;
      const moved = next.find((l) => l.id === movedId);
      const consequences = describeConsequences(before.snapshot, snapshot);
      setChanged(from !== to && moved ? { name: moved.name, from, to, consequences } : null);
    } else {
      setChanged(null);
    }
    committed.current = { snapshot, amounts };
  };

  // Lignes indépendantes : ajouter n'impose rien, changer un montant ne touche
  // pas les autres, retirer enlève simplement la ligne. Les mutateurs restent
  // purs — le bilan est déclenché à part, une fois le geste terminé.
  const addAsset = (a: PickedAsset) => {
    if (lines.some((l) => l.id === a.id)) return;
    // Ajouté à 0 € : c'est l'utilisateur qui décide combien, pas Seedow.
    const next = [
      ...lines,
      { id: a.id, ticker: a.ticker, name: a.name, esgScore: a.esgScore, amount: 0 },
    ];
    setLines(next);
    commit(next);
  };
  const setAmount = (id: string, amount: number) => {
    const next = lines.map((l) => (l.id === id ? { ...l, amount: clampAmount(amount, total) } : l));
    setLines(next);
    commit(next, id);
  };
  const removeLine = (id: string) => {
    const next = lines.filter((l) => l.id !== id);
    setLines(next);
    commit(next);
  };

  const active = lines.filter((l) => l.amount > 0);

  // Ce que l'utilisateur a réellement placé, en euros. Seedow l'affiche, il ne
  // le corrige pas : laisser une partie de côté est un choix valide.
  const allocated = active.reduce((sum, l) => sum + l.amount, 0);
  const remaining = Math.max(0, total - allocated);
  const overAllocated = total > 0 && allocated > total * (1 + WEIGHT_EPSILON);

  const snapshot = liteSnapshot(
    active.map((l) => ({ id: l.id, esgScore: l.esgScore, weight: l.amount })),
  );
  // Analyse complète, débouncée : le copilote donne le ressenti immédiat du
  // geste, celle-ci donne la lecture de fond (alignement, exclusions, horizon,
  // qualité des données) — elle ne touche à aucun poids.
  const { analysis, loading: analysisLoading } = usePortfolioAnalysis({
    weights: Object.fromEntries(active.map((l) => [l.id, total > 0 ? l.amount / total : 0])),
    causes: intent?.causes ?? [],
    exclusions: intent?.exclusions ?? [],
    horizonYears: intent?.horizonYears ?? null,
  });

  const divBand = diversificationBand(snapshot.diversification).band;
  const concentrated = snapshot.maxWeight > CONCENTRATION_ALERT;
  const impact = impactScore(snapshot.impact).score;

  const onSave = async () => {
    // Les parts partent TELLES QUELLES : 250 € sur un montant de 500 valent 0,5
    // du portefeuille, pas 0,5 d'un total ramené à 1. Une composition à 400 €
    // sur 500 s'enregistre à 80 %, les 100 € restants sont du liquide non
    // attribué (cf. lib/portfolio/weights).
    if (active.length === 0) {
      toast.error(t("blank_builder.need_one"));
      return;
    }
    if (overAllocated) {
      toast.error(
        t("blank_builder.over_allocated", { amount: formatCurrency(allocated - total, lang) }),
      );
      return;
    }
    const weights: Record<string, number> = {};
    for (const l of active) weights[l.id] = Math.round((l.amount / total) * 1e6) / 1e6;

    setSaving(true);
    try {
      // Intention issue de l'aperçu (mode/convictions/nom/cadre chiffré) ;
      // défauts sûrs si le builder a été ouvert directement (replace, aucune
      // cause, et côté serveur les défauts documentés du schéma).
      await create({
        data: {
          weights,
          mode: intent?.mode ?? "replace",
          causes: intent?.causes ?? [],
          exclusions: intent?.exclusions ?? [],
          ...(intent?.name ? { name: intent.name } : {}),
          // Le montant enregistré est celui que l'utilisateur a sous les yeux
          // pendant qu'il compose — modifiable ici, donc source de vérité.
          initial_amount: total,
          ...(intent?.riskTarget != null ? { risk_target: intent.riskTarget } : {}),
          ...(intent?.horizonYears != null ? { horizon_years: intent.horizonYears } : {}),
        },
      });
      toast.success(t("blank_builder.saved"), { description: t("blank_builder.saved_desc") });
      await navigate({ to: "/le-fil" });
    } catch (err) {
      toast.error(t("blank_builder.save_error"), {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {lines.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-paper-3 bg-paper-2 p-8 text-center flex flex-col items-center">
          <Sprout className="w-9 h-9 text-ink-3 mb-3" strokeWidth={1.6} aria-hidden />
          <h2 className="font-value text-xl text-ink">{t("blank_builder.empty_title")}</h2>
          <p className="text-body-sm text-ink-2 mt-2 max-w-[280px] leading-relaxed">
            {t("blank_builder.empty_desc")}
          </p>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="mt-6 h-12 px-6 rounded-full bg-ink text-paper text-body-sm font-semibold hover:opacity-90 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" strokeWidth={2.2} aria-hidden />
            {t("blank_builder.add")}
          </button>
          <button
            type="button"
            onClick={() => navigate({ to: "/discover" })}
            className="mt-4 inline-flex items-center gap-1.5 text-caption text-ink-3 hover:text-ink-2 transition-colors"
          >
            <Compass className="w-3.5 h-3.5" aria-hidden />
            {t("blank_builder.discover")}
          </button>
        </div>
      ) : (
        <>
          {/* La boussole de l'écran : combien il y a à répartir, et combien il
              reste. Tout le reste se lit par rapport à ces deux chiffres. */}
          <div className="rounded-2xl border border-paper-3 bg-paper p-4">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-body-sm text-ink-2">{t("blank_builder.total_label")}</span>
              {editingTotal ? (
                <span className="flex items-center gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    autoFocus
                    aria-label={t("blank_builder.total_label")}
                    value={total === 0 ? "" : String(total)}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "").slice(0, 7);
                      setTotal(digits === "" ? 0 : Number(digits));
                    }}
                    onBlur={() => setEditingTotal(false)}
                    onKeyDown={(e) => e.key === "Enter" && setEditingTotal(false)}
                    className="w-28 rounded-lg border border-paper-3 bg-paper-2 px-2 py-1 text-right font-value text-lg text-ink tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ink"
                  />
                  <span className="text-ink-2" aria-hidden>
                    €
                  </span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingTotal(true)}
                  className="font-value text-2xl text-ink tabular-nums underline decoration-paper-3 underline-offset-4 hover:decoration-ink transition-colors"
                >
                  {formatCurrency(total, lang)}
                </button>
              )}
            </div>
            <p className="mt-2 text-body-sm leading-snug text-ink-2">
              {overAllocated
                ? t("blank_builder.over_by", { amount: formatCurrency(allocated - total, lang) })
                : remaining > 0
                  ? t("blank_builder.remaining", { amount: formatCurrency(remaining, lang) })
                  : t("blank_builder.all_placed")}
            </p>
            {overAllocated && (
              <p role="status" className="mt-1 text-body-sm text-alert-ink leading-snug">
                {t("blank_builder.over_hint")}
              </p>
            )}
          </div>

          {/* Copilote — ce que le DERNIER geste a changé. Purement analytique :
              il nomme les conséquences, il ne repondère jamais à la place. */}
          {changed && changed.consequences.length > 0 && (
            <div role="status" className="rounded-2xl border border-paper-3 bg-paper p-4">
              <p className="text-tag uppercase tracking-[0.14em] font-mono text-ink-3">
                {t("blank_builder.copilot_title")}
              </p>
              <p className="mt-1.5 text-body-sm text-ink leading-relaxed">
                {t("blank_builder.copilot_moved", {
                  name: changed.name,
                  from: formatCurrency(changed.from, lang),
                  to: formatCurrency(changed.to, lang),
                })}
              </p>
              <ul className="mt-2.5 space-y-1.5">
                {changed.consequences.map((c) => (
                  <li key={c.key} className="flex items-start gap-2 text-body-sm text-ink-2">
                    {/* La direction est doublée d'un mot : jamais la couleur seule (§4). */}
                    <span
                      aria-hidden
                      className={
                        c.dir === "up"
                          ? "text-mint-ink"
                          : c.dir === "down"
                            ? "text-solar-ink"
                            : "text-ink-3"
                      }
                    >
                      {c.dir === "up" ? "↑" : c.dir === "down" ? "↓" : "="}
                    </span>
                    <span>{t(c.key, c.vars)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Coup d'œil copilote — accompagne sans décider ni rappeler un « 100 % » */}
          <div className="rounded-2xl border border-paper-3 bg-paper-2 p-4 space-y-1.5">
            {/* La part attribuée est un CONSTAT, pas un objectif à atteindre :
                laisser 20 % de côté est un choix valide, on l'écrit sans le corriger. */}
            <p className="text-body-sm text-ink leading-relaxed">
              {t("blank_builder.glance_positions", { count: active.length })}{" "}
              {t(`blank_builder.glance_div_${divBand}`)}
            </p>
            {concentrated && (
              <p className="text-body-sm text-solar-ink leading-relaxed">
                {t("blank_builder.glance_concentrated")}
              </p>
            )}
            <p className="text-caption text-ink-3 leading-relaxed">
              {t("blank_builder.glance_impact", { score: impact })} ·{" "}
              {t("blank_builder.glance_riskfees_note")}
            </p>
          </div>

          {/* Lecture de fond — ce que cette composition implique. */}
          {(analysis || analysisLoading) && (
            <div className="rounded-2xl border border-paper-3 bg-paper p-4">
              <p className="text-tag uppercase tracking-[0.14em] font-mono text-ink-3">
                {t("blank_builder.analysis_title")}
              </p>
              {analysis ? (
                <PortfolioAnalysisPanel className="mt-3" analysis={analysis} />
              ) : (
                <p role="status" className="mt-2 text-body-sm text-ink-3">
                  {t("blank_builder.analysis_loading")}
                </p>
              )}
            </div>
          )}

          {/* Lignes éditables — chaque curseur est indépendant */}
          <ul className="space-y-4">
            {lines.map((l) => (
              <li key={l.id}>
                <div className="flex items-baseline justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-body-sm font-semibold text-ink truncate">{l.name}</p>
                    <p className="text-tag text-ink-3 truncate">{l.ticker}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeLine(l.id)}
                    aria-label={t("blank_builder.remove")}
                    className="flex-shrink-0 text-ink-3 hover:text-alert-ink transition-colors"
                  >
                    <Trash2 className="w-4 h-4" strokeWidth={1.8} aria-hidden />
                  </button>
                </div>

                {/* On saisit des EUROS. Le pourcentage suit, en petit — c'est une
                    conséquence du choix, pas la chose qu'on manipule. */}
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={l.amount === 0 ? "" : String(l.amount)}
                      placeholder="0"
                      aria-label={t("blank_builder.amount_of", { name: l.name })}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, "").slice(0, 7);
                        setAmount(l.id, digits === "" ? 0 : Number(digits));
                      }}
                      className="w-24 rounded-lg border border-paper-3 bg-paper-2 px-2 py-1.5 text-right font-value text-body text-ink tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ink"
                    />
                  </span>
                  <span className="text-body text-ink-2" aria-hidden>
                    €
                  </span>
                  {l.amount > 0 && total > 0 && (
                    <span className="text-tag text-ink-3">
                      {t("blank_builder.share_of_total", {
                        pct: formatPercent(l.amount / total, lang, 0),
                      })}
                    </span>
                  )}
                </div>

                {/* Raccourcis : un débutant n'a pas à calculer un quart de 500. */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {QUICK_SHARES.map((share) => {
                    const value = Math.round(total * share);
                    return (
                      <button
                        key={share}
                        type="button"
                        onClick={() => setAmount(l.id, value)}
                        className="rounded-full border border-paper-3 px-3 py-1 text-caption text-ink-2 hover:border-ink hover:text-ink transition-colors"
                      >
                        {formatCurrency(value, lang)}
                      </button>
                    );
                  })}
                  {remaining > 0 && (
                    <button
                      type="button"
                      onClick={() => setAmount(l.id, l.amount + remaining)}
                      className="rounded-full border border-paper-3 px-3 py-1 text-caption text-ink-2 hover:border-ink hover:text-ink transition-colors"
                    >
                      {t("blank_builder.the_rest", {
                        amount: formatCurrency(remaining, lang),
                      })}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="w-full h-11 rounded-full border border-dashed border-paper-3 text-ink-2 text-body-sm font-semibold hover:bg-paper-2 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" strokeWidth={2} aria-hidden />
            {t("blank_builder.add")}
          </button>

          <button
            type="button"
            onClick={onSave}
            disabled={active.length < 1 || overAllocated || saving}
            className="w-full h-14 rounded-full bg-ink text-paper font-semibold text-body-sm hover:opacity-90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? t("blank_builder.saving") : t("blank_builder.save")}
          </button>

          <p className="text-tag text-ink-3 leading-relaxed text-center">
            {t("blank_builder.simulation_note")}
          </p>
        </>
      )}

      <AssetPickerSheet
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        excludeIds={lines.map((l) => l.id)}
        onPick={addAsset}
        // Les convictions du questionnaire suivent jusqu'ici : c'est ce qui
        // permet à la feuille de dire pourquoi une ligne mérite d'être ajoutée.
        causes={intent?.causes ?? []}
      />
    </div>
  );
}
