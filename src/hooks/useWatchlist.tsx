import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { trackAppEvent } from "@/lib/analytics/appEvents";

// Table `watchlists` créée par la migration 20260720100000 — pas encore dans
// les types générés par Lovable Cloud (régénérés au prochain sync).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface State {
  /** asset_ids suivis, ordre anté-chronologique d'ajout. */
  assetIds: string[];
  isWatched: (assetId: string) => boolean;
  /** Ajoute/retire avec update optimiste + toast — jamais d'action silencieuse. */
  toggle: (assetId: string, assetName?: string) => void;
  loading: boolean;
}

const QUERY_KEY = "watchlist";

export function useWatchlist(): State {
  const { user } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => [QUERY_KEY, user?.id], [user?.id]);

  const { data, isLoading } = useQuery({
    queryKey,
    enabled: !!user,
    queryFn: async (): Promise<string[]> => {
      const { data: rows, error } = await db
        .from("watchlists")
        .select("asset_id, created_at")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (rows ?? []).map((r: { asset_id: string }) => r.asset_id);
    },
  });

  const assetIds = useMemo(() => data ?? [], [data]);
  const watched = useMemo(() => new Set(assetIds), [assetIds]);

  const mutation = useMutation({
    mutationFn: async ({ assetId, add }: { assetId: string; add: boolean }) => {
      if (!user) throw new Error("not-authed");
      if (add) {
        const { error } = await db
          .from("watchlists")
          .upsert(
            { user_id: user.id, asset_id: assetId },
            { onConflict: "user_id,asset_id", ignoreDuplicates: true },
          );
        if (error) throw new Error(error.message);
      } else {
        const { error } = await db.from("watchlists").delete().eq("asset_id", assetId);
        if (error) throw new Error(error.message);
      }
    },
    onMutate: async ({ assetId, add }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<string[]>(queryKey);
      queryClient.setQueryData<string[]>(queryKey, (old = []) =>
        add ? [assetId, ...old.filter((id) => id !== assetId)] : old.filter((id) => id !== assetId),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
      toast.error(t("watchlist.error_toast"));
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  const toggle = useCallback(
    (assetId: string, assetName?: string) => {
      if (!user) return;
      const add = !watched.has(assetId);
      mutation.mutate({ assetId, add });
      toast.success(
        add
          ? t("watchlist.added_toast", { name: assetName ?? "" }).trim()
          : t("watchlist.removed_toast", { name: assetName ?? "" }).trim(),
      );
      void trackAppEvent(add ? "watchlist_added" : "watchlist_removed", { assetId });
    },
    [user, watched, mutation, t],
  );

  return {
    assetIds,
    isWatched: useCallback((assetId: string) => watched.has(assetId), [watched]),
    toggle,
    loading: isLoading,
  };
}
