import { useMemo, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Plus,
  RotateCcw,
  Trash2,
  TrendingDown,
  TrendingUp,
  Minus,
  Leaf,
  Network,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { useLang } from "@/hooks/useLang";
import { formatPercent } from "@/lib/format";
import type { ActiveHolding } from "@/hooks/useActivePortfolio";
import { saveCustomPortfolio } from "@/lib/portfolio/customize.functions";
import {
  describeConsequences,
  liteSnapshot,
  CONCENTRATION_ALERT,
  type ChangeDir,
  type WeightedLine,
} from "@/lib/portfolio/consequences";
import { diversificationBand, impactScore } from "@/lib/portfolio/plain-language";
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
 * On part de la proposition et on ajuste chaque part au doigt ; Seedow montre en
 * permanence l'état (impact, diversification, concentration) et, dès qu'on change
 * quelque chose, la conséquence en langage clair. L'utilisateur garde la main.
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

  // État courant traduit en langage clair — toujours affiché (le copilote parle
  // même avant toute modification).
  const impact = impactScore(current.impact).score;
  const divBand = diversificationBand(current.diversification).band;
  const concentrated = current.maxWeight > CONCENTRATION_ALERT;

  const totalPct = lines.reduce((s, l) => s + l.pct, 0);
  const dirty = JSON.stringify(lines) !== JSON.stringify(initial);
  const canSave = dirty && lines.length >= 1 && !saving;

  const setWeight = (id: string, pct: number) =>
    setLines((ls) => ls.map((l) => (l.id === id ? { ...l, pct } : l)));
  // Retirer = enlever la ligne (pas de ligne « fantôme » à 0 %). Pour la
  // remettre, on repasse par « Ajouter ».
  const removeLine = (id: string) => setLines((ls) => ls.filter((l) => l.id !== id));
  const reset = () => setLines(initial);
  const addAsset = (a: PickedAsset) =>
    setLines((ls) => {
      if (ls.some((l) => l.id === a.id)) return ls;
      return [...ls, { id: a.id, ticker: a.ticker, name: a.name, esgScore: a.esgScore, pct: 10 }];
    });

  const onSave = async () => {
    setSaving(true);
    try {
      // Normalisation en 0..1 (le serveur renormalise aussi, ceinture + bretelles).
      const total = lines.reduce((s, l) => s + l.pct, 0);
      const weights: Record<string, number> = {};
      for (const l of lines) if (l.pct > 0) weights[l.id] = l.pct / total;
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
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-ink leading-tight">
          {t("portfolio_customizer.title")}
        </h2>
        <p className="text-label text-ink-2 leading-relaxed">{t("portfolio_customizer.desc")}</p>
      </div>

      {/* Coup d'œil vivant — l'état courant, toujours visible */}
      <div className="rounded-2xl border border-paper-3 bg-paper-2 p-4">
        <div className="grid grid-cols-2 gap-3">
          <GlanceStat
            icon={<Leaf className="w-4 h-4" strokeWidth={1.8} aria-hidden />}
            label={t("portfolio_glance.chip.impact")}
            value={`${impact}/100`}
            mint
          />
          <GlanceStat
            icon={<Network className="w-4 h-4" strokeWidth={1.8} aria-hidden />}
            label={t("portfolio_glance.chip.diversification")}
            value={t(`portfolio_glance.div.${divBand}`)}
          />
        </div>
        {concentrated && (
          <p className="mt-3 text-body-sm text-solar-ink leading-relaxed">
            {t("blank_builder.glance_concentrated")}
          </p>
        )}
        {/* Conséquences de la modification en cours */}
        {consequences.length > 0 && (
          <ul className="mt-3 space-y-2 border-t border-paper-3 pt-3">
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
      </div>

      {/* Lignes éditables */}
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
                  aria-label={t("portfolio_customizer.remove")}
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
              aria-label={t("portfolio_customizer.weight_of", { name: l.name })}
            />
          </li>
        ))}
      </ul>

      {/* Ajouter — via le sélecteur d'actifs partagé */}
      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        className="w-full h-11 rounded-full border border-dashed border-paper-3 text-ink-2 text-body-sm font-semibold hover:bg-paper-2 transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" strokeWidth={2} aria-hidden />
        {t("portfolio_customizer.add")}
      </button>

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

      {/* Actions — enregistrer en primaire, réinitialiser seulement si modifié */}
      <div className="flex items-center gap-2">
        {dirty && (
          <button
            type="button"
            onClick={reset}
            disabled={saving}
            className="h-12 px-4 rounded-full border border-paper-3 text-ink text-body-sm font-semibold hover:bg-paper-2 transition-colors disabled:opacity-40 flex items-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4" strokeWidth={1.8} aria-hidden />
            {t("portfolio_customizer.reset")}
          </button>
        )}
        <button
          type="button"
          onClick={onSave}
          disabled={!canSave}
          className="flex-1 h-12 rounded-full bg-ink text-paper text-body-sm font-semibold hover:opacity-90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
        excludeIds={lines.map((l) => l.id)}
        onPick={addAsset}
      />
    </div>
  );
}

function toWeighted(l: Line): WeightedLine {
  return { id: l.id, esgScore: l.esgScore, weight: l.pct / 100 };
}

function GlanceStat({
  icon,
  label,
  value,
  mint = false,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  mint?: boolean;
}) {
  return (
    <div className="rounded-xl border border-paper-3 bg-paper px-3.5 py-3">
      <div className="flex items-center gap-1.5 text-ink-3">
        {icon}
        <span className="text-tag uppercase tracking-[0.14em] font-semibold">{label}</span>
      </div>
      <p
        className={`mt-1.5 font-value text-lg leading-none ${mint ? "text-mint-ink" : "text-ink"}`}
      >
        {value}
      </p>
    </div>
  );
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
