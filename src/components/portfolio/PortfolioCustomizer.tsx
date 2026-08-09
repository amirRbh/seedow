import { useEffect, useMemo, useState, type ReactNode } from "react";
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
  Scale,
  Activity,
} from "lucide-react";
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
import {
  describeWeight,
  diversificationBand,
  impactScore,
  perceivedRisk,
} from "@/lib/portfolio/plain-language";
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
  /** Poids courant en points de pourcentage (0..100). Le total vaut toujours 100. */
  pct: number;
}

/** Un clic = un pas compréhensible, jamais un réglage au dixième près. */
const STEP = 5;
/** Part attribuée à une ligne qu'on vient d'ajouter. */
const NEW_LINE_PCT = 10;

const clampPct = (v: number): number => Math.max(0, Math.min(100, Number.isFinite(v) ? v : 0));

/**
 * Réécrit les poids pour que le total fasse TOUJOURS 100 : la ligne ciblée
 * prend `targetPct`, le reste est redistribué proportionnellement aux poids
 * actuels des autres lignes (à parts égales si elles sont toutes à zéro).
 * L'utilisateur ne peut donc jamais produire une allocation invalide.
 */
function rebalance(lines: Line[], id: string, targetPct: number): Line[] {
  const target = clampPct(targetPct);
  const others = lines.filter((l) => l.id !== id);
  if (others.length === 0) return lines.map((l) => ({ ...l, pct: 100 }));

  const rest = 100 - target;
  const othersTotal = others.reduce((s, l) => s + l.pct, 0);
  return lines.map((l) => {
    if (l.id === id) return { ...l, pct: round1(target) };
    const share = othersTotal > 0 ? l.pct / othersTotal : 1 / others.length;
    return { ...l, pct: round1(rest * share) };
  });
}

/** Retire une ligne et redistribue sa part proportionnellement aux autres. */
function removeAndRebalance(lines: Line[], id: string): Line[] {
  const kept = lines.filter((l) => l.id !== id);
  if (kept.length === 0) return kept;
  const total = kept.reduce((s, l) => s + l.pct, 0);
  return kept.map((l) => ({
    ...l,
    pct: round1(total > 0 ? (l.pct / total) * 100 : 100 / kept.length),
  }));
}

/** Ajoute une ligne à ~10 % et ramène l'ensemble à 100 %. */
function addAndRebalance(lines: Line[], line: Line): Line[] {
  if (lines.length === 0) return [{ ...line, pct: 100 }];
  const rest = 100 - NEW_LINE_PCT;
  const total = lines.reduce((s, l) => s + l.pct, 0);
  const scaled = lines.map((l) => ({
    ...l,
    pct: round1(total > 0 ? (l.pct / total) * rest : rest / lines.length),
  }));
  return [...scaled, { ...line, pct: NEW_LINE_PCT }];
}

const round1 = (v: number): number => Math.round(v * 10) / 10;

/**
 * Éditeur d'allocation « langage clair » (mission Seedow §3 — Personnaliser).
 *
 * Pas de curseur à 0,1 % près ni de total à faire tomber juste : l'utilisateur
 * renforce ou réduit une ligne par paliers, Seedow rééquilibre le reste et lui
 * dit, en français, ce que ça change. Les pourcentages restent lisibles mais
 * secondaires — les vraies métriques (risque, frais) sont recalculées côté
 * serveur à l'enregistrement.
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
        pct: round1(h.allocationPct),
      })),
    [holdings],
  );
  const [lines, setLines] = useState<Line[]>(initial);

  // Resynchronise l'éditeur quand l'allocation RÉELLE change (ex. après un
  // enregistrement), mais pas sur un simple rafraîchissement de cours.
  const holdingsSig = useMemo(
    () => holdings.map((h) => `${h.id}:${Math.round(h.allocationPct * 10)}`).join("|"),
    [holdings],
  );
  useEffect(() => {
    setLines(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holdingsSig]);

  const baseline = useMemo(() => liteSnapshot(initial.map(toWeighted)), [initial]);
  const current = liteSnapshot(lines.map(toWeighted));
  const consequences = describeConsequences(baseline, current);

  // État courant en langage clair — le copilote parle même avant toute édition.
  const impact = impactScore(current.impact);
  const spread = diversificationBand(current.diversification);
  const risk = perceivedRisk(current.diversification);

  const dirty = JSON.stringify(lines) !== JSON.stringify(initial);
  const canSave = dirty && lines.length >= 1 && !saving;

  const bump = (id: string, delta: number) =>
    setLines((ls) => {
      const line = ls.find((l) => l.id === id);
      if (!line) return ls;
      return rebalance(ls, id, line.pct + delta);
    });
  const removeLine = (id: string) => setLines((ls) => removeAndRebalance(ls, id));
  const reset = () => setLines(initial);
  const addAsset = (a: PickedAsset) =>
    setLines((ls) =>
      ls.some((l) => l.id === a.id)
        ? ls
        : addAndRebalance(ls, {
            id: a.id,
            ticker: a.ticker,
            name: a.name,
            esgScore: a.esgScore,
            pct: NEW_LINE_PCT,
          }),
    );

  const onSave = async () => {
    const active = lines.filter((l) => l.pct > 0);
    const total = active.reduce((s, l) => s + l.pct, 0);
    if (active.length === 0 || total <= 0) {
      toast.error(t("portfolio_customizer.need_one"));
      return;
    }
    const weights: Record<string, number> = {};
    for (const l of active) weights[l.id] = Math.min(1, Math.round((l.pct / total) * 1e6) / 1e6);

    setSaving(true);
    try {
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
        <p className="text-label text-ink-2 leading-relaxed">{t("portfolio_customizer.desc_v2")}</p>
      </div>

      {/* Où j'en suis — trois repères en mots, le chiffre en second plan */}
      <div className="grid grid-cols-3 gap-2">
        <GlanceStat
          icon={<Leaf className="w-4 h-4" strokeWidth={1.8} aria-hidden />}
          label={t("portfolio_glance.chip.impact")}
          value={t(`portfolio_customizer.impact_level.${impact.level}`)}
          hint={`${impact.score}/100`}
          mint
        />
        <GlanceStat
          icon={<Scale className="w-4 h-4" strokeWidth={1.8} aria-hidden />}
          label={t("portfolio_customizer.spread_label")}
          value={t(`portfolio_glance.div.${spread.band}`)}
          hint={t("portfolio_customizer.positions", { count: current.positions })}
        />
        <GlanceStat
          icon={<Activity className="w-4 h-4" strokeWidth={1.8} aria-hidden />}
          label={t("portfolio_customizer.risk_label")}
          value={t(`portfolio_glance.risk.${risk}`)}
          hint={t("portfolio_customizer.risk_hint")}
        />
      </div>

      {/* Ce que ça change — uniquement après une modification */}
      {consequences.length > 0 && (
        <div className="rounded-2xl border border-paper-3 bg-paper-2 p-4">
          <p className="text-tag uppercase tracking-[0.14em] font-semibold text-ink-3">
            {t("portfolio_customizer.what_changes")}
          </p>
          <ul className="mt-2.5 space-y-2">
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
        </div>
      )}

      {/* Une carte par ligne : réduire / renforcer par paliers */}
      <ul className="space-y-3">
        {lines.map((l) => {
          const desc = describeWeight(l.pct / 100);
          return (
            <li key={l.id} className="rounded-2xl border border-paper-3 bg-paper p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-body-sm font-semibold text-ink truncate">{l.name}</p>
                  <p className="text-tag text-ink-3 truncate">
                    {t(`portfolio_customizer.share.${desc.band}`)}
                    {desc.oneInN ? ` · ${t("portfolio_customizer.one_in", { n: desc.oneInN })}` : ""}
                    {" · "}
                    {formatPercent(l.pct / 100, lang, 0)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeLine(l.id)}
                  aria-label={t("portfolio_customizer.remove")}
                  className="text-ink-3 hover:text-rust transition-colors flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" strokeWidth={1.8} aria-hidden />
                </button>
              </div>

              {/* Barre de poids relative — un repère visuel, pas une cible */}
              <div
                className="mt-3 h-2 rounded-full bg-paper-2 overflow-hidden"
                role="img"
                aria-label={t("portfolio_customizer.weight_of", { name: l.name })}
              >
                <div
                  className="h-full rounded-full bg-mint transition-all duration-200"
                  style={{ width: `${l.pct}%` }}
                />
              </div>

              <div className="mt-3 flex items-center gap-2">
                <StepButton
                  onClick={() => bump(l.id, -STEP)}
                  disabled={l.pct <= 0}
                  label={t("portfolio_customizer.decrease")}
                  ariaLabel={t("portfolio_customizer.decrease_of", { name: l.name })}
                  icon={<Minus className="w-4 h-4" strokeWidth={2} aria-hidden />}
                />
                <StepButton
                  onClick={() => bump(l.id, STEP)}
                  disabled={l.pct >= 100 || lines.length === 1}
                  label={t("portfolio_customizer.increase")}
                  ariaLabel={t("portfolio_customizer.increase_of", { name: l.name })}
                  icon={<Plus className="w-4 h-4" strokeWidth={2} aria-hidden />}
                />
              </div>
            </li>
          );
        })}
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

function StepButton({
  onClick,
  disabled,
  label,
  ariaLabel,
  icon,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
  ariaLabel: string;
  icon: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className="flex-1 h-10 rounded-full border border-paper-3 bg-paper-2 text-ink text-body-sm font-semibold hover:bg-paper-3/60 transition-colors disabled:opacity-35 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
    >
      {icon}
      {label}
    </button>
  );
}

function GlanceStat({
  icon,
  label,
  value,
  hint,
  mint = false,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
  mint?: boolean;
}) {
  return (
    <div className="rounded-xl border border-paper-3 bg-paper px-3 py-3">
      <div className="flex items-center gap-1.5 text-ink-3">
        {icon}
        <span className="text-tag uppercase tracking-[0.14em] font-semibold truncate">{label}</span>
      </div>
      <p
        className={`mt-1.5 text-body-sm font-semibold leading-tight ${mint ? "text-mint-ink" : "text-ink"}`}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-tag text-ink-3 tabular-nums">{hint}</p>}
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
