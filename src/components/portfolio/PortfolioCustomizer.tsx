import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Plus, RotateCcw, Trash2, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { useLang } from "@/hooks/useLang";
import { formatPercent } from "@/lib/format";
import type { ActiveHolding } from "@/hooks/useActivePortfolio";
import { saveCustomPortfolio } from "@/lib/portfolio/customize.functions";
import {
  describeConsequences,
  liteSnapshot,
  type ChangeDir,
  type WeightedLine,
} from "@/lib/portfolio/consequences";
import { AssetPickerSheet, type PickedAsset } from "./AssetPickerSheet";

interface Props {
  portfolioId: string;
  holdings: ActiveHolding[];
  onSaved?: () => void;
}

interface Line {
  id: string;
  ticker: string;
  name: string;
  esgScore: number;
  /** Poids courant en points de pourcentage (0..100). */
  pct: number;
}

/**
 * Éditeur d'allocation « débutant » (mission Seedow §3 — Personnaliser).
 * On part de la proposition et on peut retirer / repondérer chaque ligne ;
 * Seedow explique la conséquence en langage clair, puis l'utilisateur décide.
 */
export function PortfolioCustomizer({ portfolioId, holdings, onSaved }: Props) {
  const { t } = useTranslation();
  const { lang } = useLang();
  const save = useServerFn(saveCustomPortfolio);
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const initial: Line[] = useMemo(
    () =>
      holdings.map((h) => ({
        id: h.id,
        ticker: h.ticker,
        name: h.name,
        esgScore: h.esgScore,
        pct: Math.round(h.allocationPct * 10) / 10,
      })),
    [holdings],
  );
  const [lines, setLines] = useState<Line[]>(initial);

  const baseline = useMemo(() => liteSnapshot(initial.map(toWeighted)), [initial]);
  const current = liteSnapshot(lines.map(toWeighted));
  const consequences = describeConsequences(baseline, current);

  const activeLines = lines.filter((l) => l.pct > 0);
  const totalPct = activeLines.reduce((s, l) => s + l.pct, 0);
  const dirty = JSON.stringify(lines) !== JSON.stringify(initial);
  const canSave = dirty && activeLines.length >= 1 && !saving;

  const setWeight = (id: string, pct: number) =>
    setLines((ls) => ls.map((l) => (l.id === id ? { ...l, pct } : l)));
  const removeLine = (id: string) =>
    setLines((ls) => ls.map((l) => (l.id === id ? { ...l, pct: 0 } : l)));
  const reset = () => setLines(initial);
  // Ajout d'une ligne via le sélecteur : réactive une ligne retirée, sinon
  // ajoute au poids de départ modeste (10 %) — le total se renormalise à la sauvegarde.
  const addAsset = (a: PickedAsset) =>
    setLines((ls) => {
      if (ls.some((l) => l.id === a.id)) {
        return ls.map((l) => (l.id === a.id ? { ...l, pct: l.pct > 0 ? l.pct : 10 } : l));
      }
      return [...ls, { id: a.id, ticker: a.ticker, name: a.name, esgScore: a.esgScore, pct: 10 }];
    });

  const onSave = async () => {
    setSaving(true);
    try {
      // Normalisation en 0..1 (le serveur renormalise aussi, ceinture + bretelles).
      const total = activeLines.reduce((s, l) => s + l.pct, 0);
      const weights: Record<string, number> = {};
      for (const l of activeLines) weights[l.id] = l.pct / total;
      await save({ data: { portfolio_id: portfolioId, weights } });
      toast.success(t("portfolio_customizer.saved"), {
        description: t("portfolio_customizer.saved_desc"),
      });
      onSaved?.();
    } catch (err) {
      toast.error(t("portfolio_customizer.save_error"), {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <header className="space-y-1.5">
        <p className="text-tag font-semibold uppercase tracking-[0.18em] text-ink-3">
          {t("portfolio_customizer.eyebrow")}
        </p>
        <h2 className="text-lg font-semibold text-ink leading-tight">
          {t("portfolio_customizer.title")}
        </h2>
        <p className="text-label text-ink-2 leading-relaxed">{t("portfolio_customizer.desc")}</p>
      </header>

      {/* Conséquences en langage clair — le cœur du copilote */}
      {consequences.length > 0 && (
        <ul className="rounded-2xl border border-paper-3 bg-paper-2 p-4 space-y-2">
          {consequences.map((c) => (
            <li
              key={c.key}
              className="flex items-start gap-2 text-body-sm text-ink leading-relaxed"
            >
              <ConsequenceIcon dir={c.dir} />
              <span>{t(c.key, c.vars)}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Lignes éditables */}
      <ul className="space-y-4">
        {lines.map((l) => {
          const removed = l.pct <= 0;
          return (
            <li key={l.id} className={removed ? "opacity-45" : ""}>
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
                    disabled={removed}
                    aria-label={t("portfolio_customizer.remove")}
                    className="text-ink-3 hover:text-rust transition-colors disabled:opacity-30"
                  >
                    <Trash2 className="w-4 h-4" strokeWidth={1.8} />
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
                aria-label={t("portfolio_customizer.weight_of", { name: l.name })}
              />
            </li>
          );
        })}
      </ul>

      {/* Total + normalisation */}
      <div className="flex items-center justify-between text-caption text-ink-2 border-t border-paper-3 pt-3">
        <span>{t("portfolio_customizer.total")}</span>
        <span className="tabular-nums font-semibold text-ink">
          {formatPercent(totalPct / 100, lang, 0)}
        </span>
      </div>
      {Math.abs(totalPct - 100) > 0.5 && (
        <p className="text-tag text-ink-3 leading-relaxed">
          {t("portfolio_customizer.normalize_note")}
        </p>
      )}

      {/* Ajouter — via le sélecteur d'actifs partagé (recherche dans l'univers réel) */}
      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        className="w-full h-11 rounded-full border border-dashed border-paper-3 text-ink-2 text-body-sm font-semibold hover:bg-paper-2 transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" strokeWidth={2} />
        {t("portfolio_customizer.add")}
      </button>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={reset}
          disabled={!dirty || saving}
          className="h-11 px-4 rounded-full border border-paper-3 text-ink text-body-sm font-semibold hover:bg-paper-2 transition-colors disabled:opacity-40 flex items-center gap-1.5"
        >
          <RotateCcw className="w-4 h-4" strokeWidth={1.8} />
          {t("portfolio_customizer.reset")}
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!canSave}
          className="flex-1 h-11 rounded-full bg-ink text-paper text-body-sm font-semibold hover:bg-highlight-2 transition-colors disabled:opacity-40"
        >
          {saving ? t("portfolio_customizer.saving") : t("portfolio_customizer.save")}
        </button>
      </div>

      <p className="text-tag text-ink-3 leading-relaxed text-center">
        {t("portfolio_customizer.simulation_note")}
      </p>

      <AssetPickerSheet
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        excludeIds={lines.filter((l) => l.pct > 0).map((l) => l.id)}
        onPick={addAsset}
      />
    </div>
  );
}

function toWeighted(l: Line): WeightedLine {
  return { id: l.id, esgScore: l.esgScore, weight: l.pct / 100 };
}

function ConsequenceIcon({ dir }: { dir: ChangeDir }) {
  if (dir === "up")
    return (
      <TrendingUp
        className="w-4 h-4 text-mint-ink flex-shrink-0 mt-0.5"
        strokeWidth={1.8}
        aria-hidden
      />
    );
  if (dir === "down")
    return (
      <TrendingDown
        className="w-4 h-4 text-solar-ink flex-shrink-0 mt-0.5"
        strokeWidth={1.8}
        aria-hidden
      />
    );
  return (
    <Minus className="w-4 h-4 text-ink-3 flex-shrink-0 mt-0.5" strokeWidth={1.8} aria-hidden />
  );
}
