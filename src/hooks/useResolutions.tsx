import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { callAuthed } from "@/lib/authedServerFn";
import {
  listResolutions,
  getMyVotes,
  castVote,
  getWrapped,
  type ResolutionWithBloc,
  type CastVoteResult,
} from "@/lib/vote/vote.functions";
import type { VoteChoice } from "@/lib/vote/bloc";
import type { WrappedStats } from "@/lib/vote/wrapped";

/** Toutes les résolutions + le décompte agrégé du Bloc (public). */
export function useResolutions() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["resolutions"],
    queryFn: () => listResolutions(),
    staleTime: 30_000,
  });
  return { resolutions: (data ?? []) as ResolutionWithBloc[], loading: isLoading, error };
}

/** Les votes de l'utilisateur courant : { resolutionId: choice }. */
export function useMyVotes() {
  const { user, loading: authLoading } = useAuth();
  const { data } = useQuery({
    queryKey: ["my-votes", user?.id],
    queryFn: () => callAuthed(getMyVotes, undefined as never),
    enabled: !authLoading && !!user,
  });
  return (data ?? {}) as Record<string, VoteChoice>;
}

/** Bilan « Seedow Wrapped » de l'utilisateur (agrégé depuis ses vrais votes). */
export function useWrapped() {
  const { user, loading: authLoading } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["wrapped", user?.id],
    queryFn: () => callAuthed(getWrapped, undefined as never),
    enabled: !authLoading && !!user,
  });
  return { wrapped: (data ?? null) as WrappedStats | null, loading: isLoading };
}

/** Enregistre / modifie le vote de l'utilisateur, puis rafraîchit le Bloc. */
export function useCastVote() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const mutation = useMutation({
    mutationFn: (input: { resolutionId: string; choice: VoteChoice }) =>
      callAuthed(castVote, input),
    onSuccess: (result: CastVoteResult) => {
      void queryClient.invalidateQueries({ queryKey: ["resolutions"] });
      void queryClient.invalidateQueries({ queryKey: ["my-votes", user?.id] });
      return result;
    },
  });

  const submit = useCallback(
    (resolutionId: string, choice: VoteChoice) => mutation.mutateAsync({ resolutionId, choice }),
    [mutation],
  );

  return { submit, casting: mutation.isPending, lastResult: mutation.data ?? null };
}
