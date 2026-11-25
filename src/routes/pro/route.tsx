/**
 * Layout de Seedow Pro (`/pro/*`) : garde d'authentification (rendu client,
 * comme `_authenticated`), chargement du cabinet et des profils, création du
 * cabinet au premier passage, navigation.
 */
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { callAuthed } from "@/lib/authedServerFn";
import { requireAuthedUser } from "@/lib/auth/requireAuthedUser";
import { LEGAL_NOTICE } from "@/lib/pro/labels";
import { createCabinet, getProContext, type ProContext } from "@/lib/pro/pro.functions";
import { ErrorText, FieldHint, PageTitle } from "./-components/ui";
import { ProCtx } from "./-components/pro-context";

export const Route = createFileRoute("/pro")({
  ssr: false,
  beforeLoad: async ({ location }) => ({ user: await requireAuthedUser(location.pathname) }),
  head: () => ({
    meta: [{ title: "Seedow Pro — adéquation durabilité" }, { name: "robots", content: "noindex" }],
  }),
  component: ProLayout,
});

const NAV = [
  { to: "/pro/rapports", label: "Rapports" },
  { to: "/pro/rapports/new", label: "Nouveau rapport" },
  { to: "/pro/clients", label: "Clients" },
  { to: "/pro/clients/new", label: "Recueil" },
  { to: "/pro/profils-predefinis", label: "Profils prédéfinis" },
  { to: "/pro/fonds", label: "Fonds" },
] as const;

function ProLayout() {
  const [ctx, setCtx] = useState<ProContext | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setCtx(await callAuthed(getProContext, undefined as never));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chargement impossible");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div className="mx-auto flex w-full max-w-[1160px] flex-col gap-8 px-5 py-10 sm:px-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="mono-meta text-mint-ink">SEEDOW PRO</p>
        {ctx?.cabinet ? (
          <p className="mono-meta text-ink-3">
            {ctx.cabinet.name} · ORIAS {ctx.cabinet.orias_number}
          </p>
        ) : null}
      </div>

      {error ? <ErrorText>{error}</ErrorText> : null}
      {!ctx && !error ? <p className="text-body text-ink-2">Chargement…</p> : null}
      {ctx && !ctx.cabinet ? <CabinetForm onCreated={refresh} /> : null}
      {ctx?.cabinet ? (
        <ProCtx.Provider value={{ ...ctx, refresh }}>
          <nav aria-label="Seedow Pro" className="flex flex-wrap gap-2">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                activeOptions={{ exact: true }}
                className="rounded-full bg-paper-2 px-4 py-2 text-label font-semibold text-ink-2 hover:bg-paper-inset"
                activeProps={{ className: "bg-ink !text-paper hover:bg-ink" }}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <Outlet />
        </ProCtx.Provider>
      ) : null}

      <p className="border-t border-paper-3 pt-4 text-caption text-ink-3">{LEGAL_NOTICE}</p>
    </div>
  );
}

function CabinetForm({ onCreated }: { onCreated: () => Promise<void> }) {
  const [name, setName] = useState("");
  const [orias, setOrias] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await callAuthed(createCabinet, { name, orias_number: orias });
      await onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Création impossible");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="paper-card flex max-w-xl flex-col gap-6 p-6 sm:p-8">
      <PageTitle title="Votre cabinet">
        Ces informations figurent en en-tête de chaque rapport. Un compte correspond à un cabinet.
      </PageTitle>
      <form onSubmit={submit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="cab-name" className="text-label text-ink">
            Nom du cabinet
          </Label>
          <Input
            id="cab-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={200}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="cab-orias" className="text-label text-ink">
            Numéro ORIAS
          </Label>
          <Input
            id="cab-orias"
            inputMode="numeric"
            pattern="[0-9]{8}"
            value={orias}
            onChange={(e) => setOrias(e.target.value.trim())}
            required
            className="font-value tabular-nums"
          />
          <FieldHint>8 chiffres, tel qu'inscrit au registre ORIAS.</FieldHint>
        </div>
        {error ? <ErrorText>{error}</ErrorText> : null}
        <Button type="submit" disabled={busy} className="self-start">
          {busy ? "Création…" : "Créer le cabinet"}
        </Button>
      </form>
    </section>
  );
}
