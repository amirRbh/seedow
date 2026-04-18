import { supabase } from "@/integrations/supabase/client";

/**
 * Wrap a TanStack server function call so that the current Supabase access token
 * is forwarded as `Authorization: Bearer ...`. Required for any server function
 * that uses `requireSupabaseAuth`.
 *
 * Usage:
 *   const result = await callAuthed(generatePortfolio, { causes, ... });
 */
export async function callAuthed<TArgs, TResult>(
  fn: (opts: { data: TArgs; headers?: Record<string, string> }) => Promise<TResult>,
  data: TArgs,
): Promise<TResult> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) {
    throw new Error("Not authenticated");
  }
  return fn({
    data,
    headers: { Authorization: `Bearer ${token}` },
  });
}
