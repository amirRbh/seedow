/**
 * Acquittement « simulation, pas de recommandation ».
 *
 * Cadre réglementaire (mission §1.1) : Seedow n'est ni PSI ni CIF. L'éditeur
 * d'allocation est un outil de simulation ; on demande donc une reconnaissance
 * explicite, une seule fois, à la première sauvegarde d'un portefeuille
 * personnalisé, et on en garde la date pour pouvoir la prouver.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Renvoie la date d'acquittement, ou null si l'utilisateur ne l'a jamais donné. */
export const getSimulationAck = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId, supabase } = context;
    const { data } = await supabase
      .from("profiles")
      .select("simulation_ack_at")
      .eq("id", userId)
      .maybeSingle();
    return { acknowledgedAt: data?.simulation_ack_at ?? null };
  });

/** Enregistre l'acquittement (idempotent : on conserve la première date). */
export const acknowledgeSimulation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId, supabase } = context;
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("profiles")
      .update({ simulation_ack_at: now })
      .eq("id", userId)
      .is("simulation_ack_at", null);
    if (error) {
      console.error("[acknowledgeSimulation] update error:", error);
      throw new Error("Impossible d'enregistrer votre confirmation. Réessaie dans un instant.");
    }
    return { acknowledgedAt: now };
  });
