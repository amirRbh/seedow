import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Statut admin de l'utilisateur courant (table user_roles via has_role RPC).
 * Sert uniquement à masquer les actions admin dans l'UI — la vraie garde
 * est côté serveur (has_role check dans chaque server function sensible).
 */
export function useIsAdmin(): boolean {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["is-admin", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: user!.id,
        _role: "admin",
      });
      if (error) return false;
      return !!data;
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
  });
  return data ?? false;
}
