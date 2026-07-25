import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Préférences de notification, PERSISTÉES (remplace le toggle maquette des
 * réglages). email_alerts est opt-in : false par défaut, aucun email surprise.
 *
 * `notification_preferences` n'est pas encore dans les types Supabase auto-générés
 * (migration récente) → accès via cast local commenté, comme useWatchlist. À
 * retirer après régénération des types (types.ts non éditable à la main §1.6).
 */
export function useNotificationPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;

  const { data, isLoading } = useQuery({
    queryKey: ["notification-prefs", userId],
    enabled: !!userId,
    queryFn: async (): Promise<{ email_alerts: boolean }> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("notification_preferences")
        .select("email_alerts")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return { email_alerts: Boolean(data?.email_alerts) };
    },
  });

  const setEmailAlerts = useCallback(
    async (value: boolean) => {
      if (!userId) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("notification_preferences")
        .upsert({ user_id: userId, email_alerts: value }, { onConflict: "user_id" });
      if (error) throw new Error(error.message);
      await queryClient.invalidateQueries({ queryKey: ["notification-prefs", userId] });
    },
    [userId, queryClient],
  );

  return {
    emailAlerts: data?.email_alerts ?? false,
    loading: isLoading,
    setEmailAlerts,
  };
}
