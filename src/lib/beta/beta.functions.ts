/**
 * Server functions pour la phase bêta (300 testeurs).
 * - checkBetaCapacity / joinWaitlist : publiques
 * - submitRealInvestmentIntent / submitBetaFeedback / logBetaEvent : authentifiées
 * - getBetaAdminStats : auth + role admin
 */
import { createServerFn } from "@tanstack/react-start";
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
    const slotsTaken = count ?? 0;
    const slotsLeft = Math.max(0, cap - slotsTaken);
    const full = slotsLeft === 0 || status === "closed";
    return { slotsTaken, cap, status, slotsLeft, full };
  },
);

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

export const submitRealInvestmentIntent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
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
  .inputValidator((input: {
    nps?: number;
    blocker?: string;
    wish?: string;
    routeWhenSent?: string;
  }) =>
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

export const logBetaEvent = createServerFn({ method: "POST" })
  .inputValidator((input: { event: string; payload?: Record<string, unknown>; userId?: string }) =>
    z
      .object({
        event: z.string().min(1).max(64),
        payload: z.record(z.string(), z.unknown()).optional(),
        userId: z.string().uuid().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("beta_events").insert({
      user_id: data.userId ?? null,
      event: data.event,
      payload: data.payload ?? null,
    });
    return { ok: true };
  });

export interface BetaAdminStats {
  signups: number;
  cap: number;
  waitlist: number;
  portfoliosCreated: number;
  realIntents: number;
  realIntentsTotalAmount: number;
  feedbackCount: number;
  npsAverage: number | null;
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
      waitlistRes,
      portfoliosRes,
      intentsRes,
      feedbackRes,
      recentIntentsRes,
      recentFeedbackRes,
    ] = await Promise.all([
      supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("app_config").select("value").eq("key", "beta_cap").maybeSingle(),
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

    return {
      signups: signupsRes.count ?? 0,
      cap: typeof capRes.data?.value === "number" ? capRes.data.value : 300,
      waitlist: waitlistRes.count ?? 0,
      portfoliosCreated: portfoliosRes.count ?? 0,
      realIntents: intents.length,
      realIntentsTotalAmount,
      feedbackCount: fbRows.length,
      npsAverage,
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
    };
  });
