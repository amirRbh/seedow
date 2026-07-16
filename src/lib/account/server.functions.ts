import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Export everything RLS lets the authenticated user read about themselves,
 * as a single JSON payload (droit à la portabilité — RGPD art. 20).
 */
export const exportAccountData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase: userClient, userId } = context;

    const [
      profile,
      portfolios,
      financialGoals,
      alerts,
      decisionEvents,
      preferenceEvents,
      tradeoffDecisions,
      fundRejections,
      realInvestmentIntents,
      betaFeedback,
      scheduledContributions,
      portfolioShares,
      deposits,
    ] = await Promise.all([
      userClient.from("profiles").select("*").eq("id", userId).maybeSingle(),
      userClient.from("portfolios").select("*").eq("user_id", userId),
      userClient.from("financial_goals").select("*").eq("user_id", userId),
      userClient.from("alerts").select("*").eq("user_id", userId),
      userClient.from("decision_events").select("*").eq("user_id", userId),
      userClient.from("preference_events").select("*").eq("user_id", userId),
      userClient.from("tradeoff_decisions").select("*").eq("user_id", userId),
      userClient.from("fund_rejections").select("*").eq("user_id", userId),
      userClient.from("real_investment_intents").select("*").eq("user_id", userId),
      userClient.from("beta_feedback").select("*").eq("user_id", userId),
      userClient.from("scheduled_contributions").select("*").eq("user_id", userId),
      userClient.from("portfolio_shares").select("*").eq("user_id", userId),
      userClient
        .from("deposits" as never)
        .select("*")
        .eq("user_id", userId),
    ]);

    return {
      exported_at: new Date().toISOString(),
      profile: profile.data ?? null,
      portfolios: portfolios.data ?? [],
      financial_goals: financialGoals.data ?? [],
      alerts: alerts.data ?? [],
      decision_events: decisionEvents.data ?? [],
      preference_events: preferenceEvents.data ?? [],
      tradeoff_decisions: tradeoffDecisions.data ?? [],
      fund_rejections: fundRejections.data ?? [],
      real_investment_intents: realInvestmentIntents.data ?? [],
      beta_feedback: betaFeedback.data ?? [],
      scheduled_contributions: scheduledContributions.data ?? [],
      portfolio_shares: portfolioShares.data ?? [],
      deposits: deposits.data ?? [],
    };
  });

/**
 * Permanently deletes the authenticated user's account (droit à l'effacement —
 * RGPD art. 17). Cascades to every table referencing auth.users(id) ON DELETE CASCADE.
 * Irreversible — the client must have the user confirm explicitly before calling this.
 */
export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(context.userId);
    if (error) {
      throw new Error(error.message);
    }
    return { ok: true } as const;
  });
