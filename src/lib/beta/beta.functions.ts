/**
 * Server functions pour la phase bêta (300 testeurs).
 * - checkBetaCapacity / joinWaitlist / getWaitlistCount : publiques
 * - submitRealInvestmentIntent / submitBetaFeedback : authentifiées ; logClientError : best-effort
 * - getBetaAdminStats : auth + role admin
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface BetaCapacity {
  slotsTaken: number;
  cap: number;
  status: "open" | "closed";
  slotsLeft: number;
  full: boolean;
}

export const checkBetaCapacity = createServerFn({ method: "GET" }).handler(
  async (): Promise<BetaCapacity> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ count }, capRes, statusRes] = await Promise.all([
      supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("app_config").select("value").eq("key", "beta_cap").maybeSingle(),
      supabaseAdmin.from("app_config").select("value").eq("key", "beta_status").maybeSingle(),
    ]);

    const cap = typeof capRes.data?.value === "number" ? capRes.data.value : 300;
    const status = (statusRes.data?.value === "closed" ? "closed" : "open") as "open" | "closed";
    // Chiffre réel — aucun plancher artificiel. Ce que l'utilisateur voit doit
    // correspondre exactement à la table `profiles`.
    const slotsTaken = count ?? 0;
    const slotsLeft = Math.max(0, cap - slotsTaken);
    const full = slotsLeft === 0 || status === "closed";
    return { slotsTaken, cap, status, slotsLeft, full };
  },
);

/** Nombre réel d'inscrits sur la waitlist — utilisé par la landing pour un compteur honnête. */
export const getWaitlistCount = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ count: number }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("waitlist")
      .select("*", { count: "exact", head: true });
    return { count: count ?? 0 };
  },
);

/** Hash non-réversible d'une IP pour la clé de rate-limit (pas de PII stockée en clair). */
async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(ip);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function clientIp(): string {
  const request = getRequest();
  const fwd = request?.headers?.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request?.headers?.get("cf-connecting-ip") ?? "unknown";
}

export const joinWaitlist = createServerFn({ method: "POST" })
  .inputValidator((input: { email: string; source?: string }) =>
    z
      .object({
        email: z.string().trim().email().max(255),
        source: z.string().trim().max(64).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Anti-abus : max 5 inscriptions / 10 min depuis la même IP (endpoint public,
    // sans auth — cible visible pour un bot qui spammerait la waitlist).
    const ip = clientIp();
    const rlKey = `waitlist:${await hashIp(ip)}`;
    const { data: allowed, error: rlErr } = await supabaseAdmin.rpc(
      "check_and_increment_rate_limit",
      { p_key: rlKey, p_limit: 5, p_window_seconds: 600 },
    );
    if (!rlErr && allowed === false) {
      throw new Error("Trop de tentatives. Réessaie dans quelques minutes.");
    }

    const { error } = await supabaseAdmin
      .from("waitlist")
      .insert({ email: data.email.toLowerCase(), source: data.source ?? null });

    if (error && !/duplicate key/i.test(error.message)) {
      throw new Error(error.message);
    }

    const { count } = await supabaseAdmin
      .from("waitlist")
      .select("*", { count: "exact", head: true });

    return { ok: true, position: count ?? 0 };
  });

/**
 * Journalise une erreur client (JS runtime, promesse rejetée, error boundary).
 * Best-effort, public (l'erreur peut survenir avant authentification), rate-limitée
 * par IP pour éviter qu'un bug en boucle ne remplisse la table.
 */
export const logClientError = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      message: string;
      stack?: string;
      url?: string;
      userAgent?: string;
      context?: Record<string, unknown>;
    }) =>
      z
        .object({
          message: z.string().trim().min(1).max(2000),
          stack: z.string().trim().max(8000).optional(),
          url: z.string().trim().max(2000).optional(),
          userAgent: z.string().trim().max(500).optional(),
          context: z.record(z.string(), z.unknown()).optional(),
        })
        .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const ip = clientIp();
    const rlKey = `client_error:${await hashIp(ip)}`;
    const { data: allowed, error: rlErr } = await supabaseAdmin.rpc(
      "check_and_increment_rate_limit",
      { p_key: rlKey, p_limit: 30, p_window_seconds: 600 },
    );
    if (!rlErr && allowed === false) return { ok: false };

    let userId: string | null = null;
    try {
      const authHeader = getRequest()?.headers?.get("authorization");
      const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
      if (token) {
        const { data: userData } = await supabaseAdmin.auth.getUser(token);
        userId = userData?.user?.id ?? null;
      }
    } catch {
      // pas de token / token invalide : on journalise quand même, anonyme
    }

    await supabaseAdmin.from("client_errors").insert({
      user_id: userId,
      message: data.message,
      stack: data.stack ?? null,
      url: data.url ?? null,
      user_agent: data.userAgent ?? null,
      context: (data.context ?? {}) as never,
    });
    return { ok: true };
  });

export const submitRealInvestmentIntent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      amount: number;
      frequency: "one_shot" | "monthly";
      portfolioId?: string | null;
      contactEmail?: string;
    }) =>
      z
        .object({
          amount: z.number().positive().max(1_000_000),
          frequency: z.enum(["one_shot", "monthly"]),
          portfolioId: z.string().uuid().nullable().optional(),
          contactEmail: z.string().email().max(255).optional(),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("real_investment_intents").insert({
      user_id: context.userId,
      amount: data.amount,
      frequency: data.frequency,
      portfolio_id: data.portfolioId ?? null,
      contact_email: data.contactEmail ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const submitBetaFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { nps?: number; blocker?: string; wish?: string; routeWhenSent?: string }) =>
      z
        .object({
          nps: z.number().int().min(0).max(10).optional(),
          blocker: z.string().trim().max(2000).optional(),
          wish: z.string().trim().max(2000).optional(),
          routeWhenSent: z.string().max(255).optional(),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("beta_feedback").insert({
      user_id: context.userId,
      nps: data.nps ?? null,
      blocker: data.blocker ?? null,
      wish: data.wish ?? null,
      route_when_sent: data.routeWhenSent ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export interface BetaTester {
  id: string;
  email: string | null;
  display_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  portfolios_count: number;
  has_feedback: boolean;
}

export interface OnboardingFunnelStep {
  step: string;
  entered: number;
  completed: number;
}

export interface IngestionRun {
  id: string;
  status: "ok" | "error" | "partial";
  assets_ok: number;
  assets_failed: number;
  duration_ms: number | null;
  ran_at: string;
}

export interface BetaAdminStats {
  signups: number;
  cap: number;
  status: "open" | "closed";
  slotsLeft: number;
  fillRate: number;
  waitlist: number;
  portfoliosCreated: number;
  realIntents: number;
  realIntentsTotalAmount: number;
  feedbackCount: number;
  npsAverage: number | null;
  testers: BetaTester[];
  recentIntents: Array<{
    id: string;
    amount: number;
    frequency: string;
    created_at: string;
  }>;
  recentFeedback: Array<{
    id: string;
    nps: number | null;
    blocker: string | null;
    wish: string | null;
    created_at: string;
  }>;
  onboardingFunnel: OnboardingFunnelStep[];
  allocationSeen: number;
  allocationAccepted: number;
  ingestionRuns: IngestionRun[];
  ingestionSuccessRate: number | null;
  clientErrors24h: number;
}

export const getBetaAdminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BetaAdminStats> => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [
      signupsRes,
      capRes,
      statusRes,
      waitlistRes,
      portfoliosRes,
      intentsRes,
      feedbackRes,
      recentIntentsRes,
      recentFeedbackRes,
      profilesRes,
      portfoliosByUserRes,
      feedbackByUserRes,
      authUsersRes,
      preferenceEventsRes,
      ingestionRunsRes,
      clientErrors24hRes,
    ] = await Promise.all([
      supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("app_config").select("value").eq("key", "beta_cap").maybeSingle(),
      supabaseAdmin.from("app_config").select("value").eq("key", "beta_status").maybeSingle(),
      supabaseAdmin.from("waitlist").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("portfolios").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("real_investment_intents").select("amount"),
      supabaseAdmin.from("beta_feedback").select("nps"),
      supabaseAdmin
        .from("real_investment_intents")
        .select("id, amount, frequency, created_at")
        .order("created_at", { ascending: false })
        .limit(10),
      supabaseAdmin
        .from("beta_feedback")
        .select("id, nps, blocker, wish, created_at")
        .order("created_at", { ascending: false })
        .limit(10),
      supabaseAdmin
        .from("profiles")
        .select("id, display_name, created_at")
        .order("created_at", { ascending: false })
        .limit(300),
      supabaseAdmin.from("portfolios").select("user_id"),
      supabaseAdmin.from("beta_feedback").select("user_id"),
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 300 }),
      // Fonnel d'onboarding : step_entered / step_completed par étape, + les
      // deux jalons finaux (allocation présentée / acceptée), sur les 30 derniers jours.
      supabaseAdmin
        .from("preference_events")
        .select("step, payload, occurred_at")
        .in("step", ["step_entered", "step_completed", "allocation_seen", "allocation_accepted"])
        .gte("occurred_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .limit(20000),
      // Santé de l'ingestion des cours de marché (cron horaire Yahoo Finance).
      supabaseAdmin
        .from("cron_run_log")
        .select("id, status, assets_ok, assets_failed, duration_ms, ran_at")
        .eq("job_name", "refresh-market-data")
        .order("ran_at", { ascending: false })
        .limit(20),
      supabaseAdmin
        .from("client_errors")
        .select("*", { count: "exact", head: true })
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
    ]);

    const intents = intentsRes.data ?? [];
    const realIntentsTotalAmount = intents.reduce(
      (s, i) => s + (typeof i.amount === "number" ? i.amount : Number(i.amount ?? 0)),
      0,
    );

    const fbRows = feedbackRes.data ?? [];
    const npsValues = fbRows.map((r) => r.nps).filter((v): v is number => typeof v === "number");
    const npsAverage =
      npsValues.length > 0 ? npsValues.reduce((s, v) => s + v, 0) / npsValues.length : null;

    const cap = typeof capRes.data?.value === "number" ? capRes.data.value : 300;
    const status = (statusRes.data?.value === "closed" ? "closed" : "open") as "open" | "closed";
    const signups = signupsRes.count ?? 0;
    const slotsLeft = Math.max(0, cap - signups);
    const fillRate = cap > 0 ? Math.min(1, signups / cap) : 0;

    const portfolioCounts = new Map<string, number>();
    for (const p of portfoliosByUserRes.data ?? []) {
      const uid = p.user_id as string;
      portfolioCounts.set(uid, (portfolioCounts.get(uid) ?? 0) + 1);
    }
    const feedbackUsers = new Set((feedbackByUserRes.data ?? []).map((f) => f.user_id as string));
    const authById = new Map<string, { email: string | null; last_sign_in_at: string | null }>();
    for (const u of authUsersRes.data?.users ?? []) {
      authById.set(u.id, {
        email: u.email ?? null,
        last_sign_in_at: (u.last_sign_in_at as string | null) ?? null,
      });
    }

    const testers: BetaTester[] = (profilesRes.data ?? []).map((p) => {
      const auth = authById.get(p.id as string);
      return {
        id: p.id as string,
        email: auth?.email ?? null,
        display_name: (p.display_name as string | null) ?? null,
        created_at: p.created_at as string,
        last_sign_in_at: auth?.last_sign_in_at ?? null,
        portfolios_count: portfolioCounts.get(p.id as string) ?? 0,
        has_feedback: feedbackUsers.has(p.id as string),
      };
    });

    // ── Fonnel d'onboarding : entered/completed par step, dans l'ordre du parcours ──
    const STEP_ORDER = ["values", "exclusions", "objective", "amount"];
    const entered = new Map<string, number>();
    const completed = new Map<string, number>();
    let allocationSeen = 0;
    let allocationAccepted = 0;
    for (const ev of preferenceEventsRes.data ?? []) {
      const payload = (ev.payload as Record<string, unknown> | null) ?? {};
      const onboardingStep = payload.onboarding_step as string | undefined;
      if (ev.step === "step_entered" && onboardingStep) {
        entered.set(onboardingStep, (entered.get(onboardingStep) ?? 0) + 1);
      } else if (ev.step === "step_completed" && onboardingStep) {
        completed.set(onboardingStep, (completed.get(onboardingStep) ?? 0) + 1);
      } else if (ev.step === "allocation_seen") {
        allocationSeen += 1;
      } else if (ev.step === "allocation_accepted") {
        allocationAccepted += 1;
      }
    }
    const onboardingFunnel: OnboardingFunnelStep[] = STEP_ORDER.map((step) => ({
      step,
      entered: entered.get(step) ?? 0,
      completed: completed.get(step) ?? 0,
    }));

    // ── Santé de l'ingestion de marché ──
    const ingestionRuns: IngestionRun[] = (ingestionRunsRes.data ?? []).map((r) => ({
      id: r.id as string,
      status: r.status as "ok" | "error" | "partial",
      assets_ok: r.assets_ok as number,
      assets_failed: r.assets_failed as number,
      duration_ms: r.duration_ms as number | null,
      ran_at: r.ran_at as string,
    }));
    const ingestionSuccessRate =
      ingestionRuns.length > 0
        ? ingestionRuns.filter((r) => r.status === "ok").length / ingestionRuns.length
        : null;

    return {
      signups,
      cap,
      status,
      slotsLeft,
      fillRate,
      waitlist: waitlistRes.count ?? 0,
      portfoliosCreated: portfoliosRes.count ?? 0,
      realIntents: intents.length,
      realIntentsTotalAmount,
      feedbackCount: fbRows.length,
      npsAverage,
      testers,
      recentIntents: (recentIntentsRes.data ?? []).map((r) => ({
        id: r.id as string,
        amount: Number(r.amount),
        frequency: r.frequency as string,
        created_at: r.created_at as string,
      })),
      recentFeedback: (recentFeedbackRes.data ?? []).map((r) => ({
        id: r.id as string,
        nps: r.nps as number | null,
        blocker: r.blocker as string | null,
        wish: r.wish as string | null,
        created_at: r.created_at as string,
      })),
      onboardingFunnel,
      allocationSeen,
      allocationAccepted,
      ingestionRuns,
      ingestionSuccessRate,
      clientErrors24h: clientErrors24hRes.count ?? 0,
    };
  });

// ─────────────────────────────────────────────────────────────────────────
// Mesure de la compréhension (admin) — s'appuie sur les vues SQL
// comprehension_overview / comprehension_retention (migration 20260721140000).
// ─────────────────────────────────────────────────────────────────────────

export interface ComprehensionStats {
  usersStartedCourse: number;
  usersCompletedCourse: number;
  totalCompletions: number;
  avgQuizPct: number | null;
  modeSimpleUsers: number;
  modeExpertUsers: number;
  /** Rétention J7 des utilisateurs ayant terminé au moins un cours (0..1). */
  retentionD7Completers: number | null;
  /** Rétention J7 des utilisateurs n'ayant terminé aucun cours (0..1). */
  retentionD7NonCompleters: number | null;
}

export const getComprehensionStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ComprehensionStats> => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Vues pas encore dans les types générés par Lovable Cloud.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = supabaseAdmin as any;

    const [overviewRes, retentionRes] = await Promise.all([
      admin.from("comprehension_overview").select("*").maybeSingle(),
      admin.from("comprehension_retention").select("*"),
    ]);

    const o = overviewRes.data ?? {};
    const ratio = (row: { cohort_size: number; retained_d7: number } | undefined) =>
      row && row.cohort_size > 0 ? row.retained_d7 / row.cohort_size : null;

    const rows = (retentionRes.data ?? []) as Array<{
      completed_course: boolean;
      cohort_size: number;
      retained_d7: number;
    }>;
    const completers = rows.find((r) => r.completed_course === true);
    const nonCompleters = rows.find((r) => r.completed_course === false);

    return {
      usersStartedCourse: Number(o.users_started_course ?? 0),
      usersCompletedCourse: Number(o.users_completed_course ?? 0),
      totalCompletions: Number(o.total_completions ?? 0),
      avgQuizPct: o.avg_quiz_pct != null ? Number(o.avg_quiz_pct) : null,
      modeSimpleUsers: Number(o.mode_simple_users ?? 0),
      modeExpertUsers: Number(o.mode_expert_users ?? 0),
      retentionD7Completers: ratio(completers),
      retentionD7NonCompleters: ratio(nonCompleters),
    };
  });
