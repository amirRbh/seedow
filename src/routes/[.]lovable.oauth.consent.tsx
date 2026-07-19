import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type OAuthNamespace = {
  getAuthorizationDetails: (id: string) => Promise<{
    data: {
      client?: { name?: string; client_id?: string } | null;
      redirect_uri?: string;
      scope?: string;
      redirect_url?: string;
      redirect_to?: string;
    } | null;
    error: { message: string } | null;
  }>;
  approveAuthorization: (id: string) => Promise<{
    data: { redirect_url?: string; redirect_to?: string } | null;
    error: { message: string } | null;
  }>;
  denyAuthorization: (id: string) => Promise<{
    data: { redirect_url?: string; redirect_to?: string } | null;
    error: { message: string } | null;
  }>;
};

function oauth(): OAuthNamespace {
  return (supabase.auth as unknown as { oauth: OAuthNamespace }).oauth;
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) {
      throw new Error("Missing authorization_id");
    }
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const next = location.pathname + location.searchStr;
      throw redirect({ to: "/auth", search: { redirect: next } });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id") ?? "";
    const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) {
      window.location.href = immediate;
    }
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="min-h-screen bg-paper flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <h1 className="font-value text-3xl text-ink">Authorization error</h1>
        <p className="mt-3 text-sm text-ink-2">{String((error as Error)?.message ?? error)}</p>
      </div>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientName = details?.client?.name ?? "an external app";

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error: err } = approve
      ? await oauth().approveAuthorization(authorization_id)
      : await oauth().denyAuthorization(authorization_id);
    if (err) {
      setBusy(false);
      setError(err.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  return (
    <main className="min-h-screen bg-paper flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-mint" />
          <span className="font-value text-lg text-ink tracking-tight">seedow</span>
        </div>
        <h1 className="font-value text-3xl text-ink leading-tight">
          Connect {clientName} to your Seedow account
        </h1>
        <p className="mt-3 text-body-sm text-ink-2">
          {clientName} will be able to call this app's enabled tools while you are signed in. This
          does not bypass Seedow's permissions or backend policies.
        </p>

        <div className="mt-6 rounded-lg border border-paper-3 bg-paper-2 p-4 text-label text-ink-2 space-y-1">
          <div>
            <span className="text-ink-3">Access:</span> read your portfolios, goals and decision
            history (simulated data)
          </div>
          <div>
            <span className="text-ink-3">Identity:</span> your Seedow account (email, id)
          </div>
          {details?.scope ? (
            <div>
              <span className="text-ink-3">Scope:</span> {details.scope}
            </div>
          ) : null}
        </div>

        {error && (
          <p role="alert" className="mt-4 text-label text-rust">
            {error}
          </p>
        )}

        <div className="mt-6 flex gap-3">
          <Button
            size="pill"
            disabled={busy}
            onClick={() => decide(true)}
            className="flex-1 justify-center disabled:opacity-50"
          >
            {busy ? "Please wait…" : "Approve"}
          </Button>
          <button
            disabled={busy}
            onClick={() => decide(false)}
            className="flex-1 py-2.5 rounded border border-paper-3 hover:border-ink transition-colors text-body-sm font-medium disabled:opacity-50"
          >
            Deny
          </button>
        </div>
      </div>
    </main>
  );
}
