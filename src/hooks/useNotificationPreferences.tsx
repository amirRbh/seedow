import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Préférences de notification, persistées. `email_alerts` est opt-in : false par
 * défaut, aucun email surprise.
 *
 * ── Quand la table n'est pas là ───────────────────────────────────────────
 *
 * `notification_preferences` est créée par la migration 20260725180000, qui
 * n'est pas appliquée sur l'environnement courant. Le hook lançait alors une
 * erreur brute, et /reglages répondait à un clic sur l'interrupteur par un
 * message Postgres en rouge.
 *
 * Deux réponses possibles, une seule honnête. Faire semblant que l'option est
 * enregistrée serait un dark pattern sur un consentement email (§5). On expose
 * donc `available` : l'écran désactive l'interrupteur et dit que l'option
 * n'est pas encore active, plutôt que de promettre un réglage qui n'est nulle
 * part.
 *
 * Le jour où la migration est appliquée, `available` repasse à true sans
 * qu'aucun écran ne change.
 */

/** Codes rendus quand la table (ou son cache de schéma) n'existe pas. */
const TABLE_MISSING = new Set([
  "PGRST205", // table absente du cache de schéma PostgREST
  "PGRST204", // colonne absente du cache de schéma
  "42P01", // undefined_table
]);

interface PrefsState {
  email_alerts: boolean;
  /** false = la table n'existe pas sur cet environnement. */
  available: boolean;
}

function isMissingTable(error: { code?: string | null } | null): boolean {
  return !!error?.code && TABLE_MISSING.has(error.code);
}

export function useNotificationPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;

  const { data, isLoading } = useQuery({
    queryKey: ["notification-prefs", userId],
    enabled: !!userId,
    queryFn: async (): Promise<PrefsState> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("notification_preferences")
        .select("email_alerts")
        .eq("user_id", userId)
        .maybeSingle();
      // Table absente : ce n'est pas une panne, c'est une fonctionnalité non
      // déployée. On le dit à l'écran au lieu de faire échouer la page.
      if (isMissingTable(error)) return { email_alerts: false, available: false };
      if (error) throw new Error(error.message);
      return { email_alerts: Boolean(data?.email_alerts), available: true };
    },
  });

  const setEmailAlerts = useCallback(
    async (value: boolean) => {
      if (!userId) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("notification_preferences")
        .upsert({ user_id: userId, email_alerts: value }, { onConflict: "user_id" });
      if (isMissingTable(error)) {
        // Ne jamais laisser croire que le consentement est enregistré.
        await queryClient.invalidateQueries({ queryKey: ["notification-prefs", userId] });
        throw new Error("UNAVAILABLE");
      }
      if (error) throw new Error(error.message);
      await queryClient.invalidateQueries({ queryKey: ["notification-prefs", userId] });
    },
    [userId, queryClient],
  );

  return {
    emailAlerts: data?.email_alerts ?? false,
    /** false = l'option n'est pas déployée sur cet environnement. */
    available: data?.available ?? true,
    loading: isLoading,
    setEmailAlerts,
  };
}
