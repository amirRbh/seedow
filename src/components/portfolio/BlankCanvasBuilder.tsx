import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Plus, Trash2, Sprout, Compass } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { useLang } from "@/hooks/useLang";
import { formatPercent } from "@/lib/format";
import { createCustomPortfolio } from "@/lib/portfolio/customize.functions";
import { liteSnapshot, CONCENTRATION_ALERT } from "@/lib/portfolio/consequences";
import { diversificationBand, impactScore } from "@/lib/portfolio/plain-language";
import { AssetPickerSheet, type PickedAsset } from "./AssetPickerSheet";

interface Line {
  id: string;
  ticker: string;
  name: string;
  esgScore: number;
  /** Poids en points de pourcentage (0..100), édité librement. */
  pct: number;
}

const clampPct = (v: number): number => Math.max(0, Math.min(100, Number.isFinite(v) ? v : 0));

/**
 * Parcours « Page blanche » (mission Seedow §4) — on démarre vide et on compose
 * soi-même, sans jamais jeter le débutant dans un tableau financier. Curseurs
 * INDÉPENDANTS : Seedow ne rééquilibre pas à la place de l'utilisateur et ne le
 * rappelle pas à l'ordre sur un « 100 % » — il accompagne (diversification,
 * concentration, impact en langage clair). Risque et frais exacts sont calculés
 * à l'enregistrement ; les parts sont normalisées à ce moment-là.
 */
export function BlankCanvasBuilder() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const navigate = useNavigate();
  const create = useServerFn(createCustomPortfolio);
  const [lines, setLines] = useState<Line[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const active = lines.filter((l) => l.pct > 0);

  // Curseurs indépendants : ajouter pose une part de départ, bouger une ligne
  // ne touche pas les autres, retirer enlève simplement la ligne.
  const addAsset = (a: PickedAsset) =>
    setLines((ls) =>
      ls.some((l) => l.id === a.id)
        ? ls
        : [...ls, { id: a.id, ticker: a.ticker, name: a.name, esgScore: a.esgScore, pct: 10 }],
    );
  const setWeight = (id: string, pct: number) =>
    setLines((ls) => ls.map((l) => (l.id === id ? { ...l, pct: clampPct(pct) } : l)));
  const removeLine = (id: string) => setLines((ls) => ls.filter((l) => l.id !== id));

  const snapshot = liteSnapshot(
    active.map((l) => ({ id: l.id, esgScore: l.esgScore, weight: l.pct })),
  );
  const divBand = diversificationBand(snapshot.diversification).band;
  const concentrated = snapshot.maxWeight > CONCENTRATION_ALERT;
  const impact = impactScore(snapshot.impact).score;

  const onSave = async () => {
    // Normalisation robuste : lignes positives uniquement, somme ramenée à 1,
    // chaque poids borné à ≤ 1 et arrondi — l'enregistrement n'est jamais bloqué.
    const total = active.reduce((s, l) => s + l.pct, 0);
    if (active.length === 0 || total <= 0) {
      toast.error(t("blank_builder.need_one"));
      return;
    }
    const weights: Record<string, number> = {};
    for (const l of active) weights[l.id] = Math.min(1, Math.round((l.pct / total) * 1e6) / 1e6);

    setSaving(true);
    try {
      await create({ data: { weights } });
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
          {/* Coup d'œil copilote — accompagne sans décider ni rappeler un « 100 % » */}
          <div className="rounded-2xl border border-paper-3 bg-paper-2 p-4 space-y-1.5">
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

          {/* Lignes éditables — chaque curseur est indépendant */}
          <ul className="space-y-4">
            {lines.map((l) => (
              <li key={l.id}>
                <div className="flex items-baseline justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-body-sm font-semibold text-ink truncate">{l.name}</p>
                    <p className="text-tag text-ink-3 truncate">{l.ticker}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="font-value text-sm text-ink tabular-nums w-12 text-right">
                      {formatPercent(l.pct / 100, lang, 0)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeLine(l.id)}
                      aria-label={t("blank_builder.remove")}
                      className="text-ink-3 hover:text-rust transition-colors"
                    >
                      <Trash2 className="w-4 h-4" strokeWidth={1.8} aria-hidden />
                    </button>
                  </div>
                </div>
                <Slider
                  className="mt-2.5"
                  value={[l.pct]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={(v) => setWeight(l.id, v[0])}
                  aria-label={t("blank_builder.weight_of", { name: l.name })}
                />
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
            disabled={active.length < 1 || saving}
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
      />
    </div>
  );
}
