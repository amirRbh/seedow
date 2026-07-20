/**
 * Phase 1.1 — Instrumentation client des préférences.
 *
 * Trois canaux :
 *  - trackPreference  : micro-évènement d'onboarding/usage (cause cochée, intensité, etc.)
 *  - trackTradeoff    : arbitrage explicite (coût accepté/refusé)
 *  - trackFundRejection : un fonds rejeté comme "pas assez vert"
 *
 * Tous les appels sont best-effort : on n'interrompt JAMAIS l'UX en cas d'échec
 * (réseau, RLS, etc.). Les erreurs sont loggées en console pour le debug.
 */
import { supabase } from "@/integrations/supabase/client";

// ─────────────────────────────────────────────────────────
// Session id — persiste tant que l'onglet est ouvert
// ─────────────────────────────────────────────────────────
const SESSION_KEY = "seedow.pref.session";

export function getSessionId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────
// Variant — un seul A/B par session, persistant
// ─────────────────────────────────────────────────────────
const VARIANT_KEY = "seedow.pref.variant";

export function getVariant(): string {
  if (typeof window === "undefined") return "A";
  try {
    let v = sessionStorage.getItem(VARIANT_KEY);
    if (!v) {
      v = Math.random() < 0.5 ? "A" : "B";
      sessionStorage.setItem(VARIANT_KEY, v);
    }
    return v;
  } catch {
    return "A";
  }
}

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────
export type PreferenceStep =
  | "cause_picked"
  | "cause_dropped"
  | "intensity_set"
  | "exclusion_added"
  | "exclusion_removed"
  | "risk_moved"
  | "horizon_moved"
  | "amount_set"
  | "objective_picked"
  | "step_entered"
  | "step_completed"
  | "step_back"
  | "allocation_seen"
  | "allocation_accepted"
  | "allocation_regenerated"
  | "fund_rejected"
  | "fund_swapped";

export type TradeoffLever =
  | "exclusion_fossiles"
  | "exclusion_armes"
  | "exclusion_tabac"
  | "exclusion_jeux"
  | "exclusion_animaux"
  | "exclusion_fast-fashion"
  | "cause_intensity"
  | "esg_floor"
  | "risk_target";

export type FundRejectionReason =
  | "controversy"
  | "excluded_sector"
  | "low_esg_score"
  | "low_env_score"
  | "low_social_score"
  | "low_gov_score"
  | "high_carbon"
  | "opaque_holdings"
  | "other";

interface TrackPreferenceArgs {
  step: PreferenceStep;
  payload?: Record<string, unknown>;
  portfolioId?: string | null;
  dwellMs?: number;
}

interface TrackTradeoffArgs {
  lever: TradeoffLever;
  leverValue?: string | null;
  costBps?: number | null;
  esgDelta?: number | null;
  volDelta?: number | null;
  accepted: boolean;
  altChosen?: string | null;
  portfolioId?: string | null;
  context?: Record<string, unknown>;
}

interface TrackFundRejectionArgs {
  assetId: string;
  reason: FundRejectionReason;
  reasonDetail?: string | null;
  swapAssetId?: string | null;
  portfolioId?: string | null;
  context?: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────
// API
// ─────────────────────────────────────────────────────────
async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

export async function trackPreference(args: TrackPreferenceArgs): Promise<void> {
  try {
    const userId = await getUserId();
    if (!userId) return; // pré-auth : on jette silencieusement
    const { error } = await supabase.from("preference_events").insert({
      user_id: userId,
      session_id: getSessionId(),
      portfolio_id: args.portfolioId ?? null,
      step: args.step,
      payload: args.payload ?? {},
      variant: getVariant(),
      dwell_ms: args.dwellMs ?? null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    if (error) console.warn("[trackPreference]", error.message);
  } catch (e) {
    console.warn("[trackPreference] fatal", e);
  }
}

export async function trackTradeoff(args: TrackTradeoffArgs): Promise<void> {
  try {
    const userId = await getUserId();
    if (!userId) return;
    const { error } = await supabase.from("tradeoff_decisions").insert({
      user_id: userId,
      portfolio_id: args.portfolioId ?? null,
      lever: args.lever,
      lever_value: args.leverValue ?? null,
      cost_bps: args.costBps ?? null,
      esg_delta: args.esgDelta ?? null,
      vol_delta: args.volDelta ?? null,
      accepted: args.accepted,
      alt_chosen: args.altChosen ?? null,
      context: args.context ?? {},
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    if (error) console.warn("[trackTradeoff]", error.message);
  } catch (e) {
    console.warn("[trackTradeoff] fatal", e);
  }
}

export async function trackFundRejection(args: TrackFundRejectionArgs): Promise<void> {
  try {
    const userId = await getUserId();
    if (!userId) return;
    const { error } = await supabase.from("fund_rejections").insert({
      user_id: userId,
      portfolio_id: args.portfolioId ?? null,
      asset_id: args.assetId,
      reason: args.reason,
      reason_detail: args.reasonDetail ?? null,
      swap_asset_id: args.swapAssetId ?? null,
      context: args.context ?? {},
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    if (error) console.warn("[trackFundRejection]", error.message);
  } catch (e) {
    console.warn("[trackFundRejection] fatal", e);
  }
}
