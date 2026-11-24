/**
 * Préparation d'un rapport : profil client + liste d'ISIN (collée ou CSV),
 * aperçu des verdicts, puis génération et archivage du PDF.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { callAuthed } from "@/lib/authedServerFn";
import { MAX_ISINS_PER_REPORT, parseIsinList } from "@/lib/pro/app/isin";
import { ALERT_LABELS, AXIS_TITLES } from "@/lib/pro/labels";
import { PAI_CATEGORY_LABELS, formatPct } from "@/lib/pro/matching/engine";
import { generateReport, previewReport, type ReportPreview } from "@/lib/pro/pro.functions";
import { AxisStatusText, ErrorText, FieldHint, PageTitle, VerdictBadge } from "./-components/ui";
import { usePro } from "./-components/pro-context";

export const Route = createFileRoute("/pro/rapports/new")({
  validateSearch: z.object({ profile: z.string().uuid().optional() }),
  component: NewReportPage,
});

function NewReportPage() {
  const { profiles } = usePro();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [profileId, setProfileId] = useState(search.profile ?? profiles[0]?.id ?? "");
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<ReportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"preview" | "generate" | null>(null);

  const parsed = useMemo(() => parseIsinList(text), [text]);
  const profile = profiles.find((p) => p.id === profileId) ?? null;

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 1_000_000) {
      setError("Fichier trop volumineux (1 Mo maximum)");
      return;
    }
    setText(await file.text());
    setPreview(null);
  }

  async function runPreview() {
    setBusy("preview");
    setError(null);
    try {
      setPreview(await callAuthed(previewReport, { profile_id: profileId, isins: parsed.isins }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Aperçu impossible");
    } finally {
      setBusy(null);
    }
  }

  async function runGenerate() {
    setBusy("generate");
    setError(null);
    try {
      const r = await callAuthed(generateReport, { profile_id: profileId, isins: parsed.isins });
      toast.success("Rapport généré et archivé");
      await navigate({ to: "/pro/rapports", search: { created: r.id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Génération impossible");
    } finally {
      setBusy(null);
    }
  }

  if (profiles.length === 0) {
    return (
      <section className="flex flex-col gap-4">
        <PageTitle title="Nouveau rapport">
          Commencez par enregistrer les préférences d'un client.
        </PageTitle>
        <Button asChild className="self-start">
          <Link to="/pro/clients/new">Nouveau profil client</Link>
        </Button>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-8">
      <PageTitle title="Nouveau rapport">
        Confrontez les préférences d'un client aux annexes précontractuelles SFDR des fonds que vous
        envisagez. Le rapport généré est horodaté, archivé et ne peut plus être modifié.
      </PageTitle>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="paper-card flex flex-col gap-4 p-6">
          <Label htmlFor="profile" className="text-label text-ink">
            Profil client
          </Label>
          <select
            id="profile"
            value={profileId}
            onChange={(e) => {
              setProfileId(e.target.value);
              setPreview(null);
            }}
            className="min-h-12 rounded-[16px] border border-input bg-paper px-4 text-body text-ink"
          >
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.client_ref} — recueilli le {p.collected_at}
              </option>
            ))}
          </select>
          {profile ? (
            <ul className="flex flex-col gap-1 text-label text-ink-2">
              <li>
                (a) Taxinomie :{" "}
                {profile.taxonomy_min_pct === null
                  ? "non exprimée"
                  : `≥ ${formatPct(profile.taxonomy_min_pct)}`}
              </li>
              <li>
                (b) Investissements durables :{" "}
                {profile.sfdr_min_pct === null
                  ? "non exprimée"
                  : `≥ ${formatPct(profile.sfdr_min_pct)}`}
              </li>
              <li>
                (c) PAI :{" "}
                {!profile.pai_required
                  ? "non exprimée"
                  : profile.pai_categories.length
                    ? profile.pai_categories.map((c) => PAI_CATEGORY_LABELS[c]).join(", ")
                    : "demandée"}
              </li>
              {profile.adapted ? <li>Adaptation documentée</li> : null}
            </ul>
          ) : null}
        </div>

        <div className="paper-card flex flex-col gap-3 p-6">
          <Label htmlFor="isins" className="text-label text-ink">
            ISIN des fonds
          </Label>
          <textarea
            id="isins"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setPreview(null);
            }}
            rows={7}
            placeholder={"FR0010592022\nLU0347711466"}
            className="rounded-[16px] border border-input bg-paper px-4 py-3 font-value text-body text-ink focus-visible:border-ink focus-visible:outline-none"
          />
          <div className="flex flex-wrap items-center gap-3">
            <label className="cursor-pointer text-label font-semibold text-ink underline underline-offset-4">
              Importer un CSV
              <input
                type="file"
                accept=".csv,text/csv,text/plain"
                className="sr-only"
                onChange={(e) => void onFile(e.target.files?.[0])}
              />
            </label>
            <FieldHint>
              {parsed.isins.length} ISIN reconnu(s), {MAX_ISINS_PER_REPORT} maximum. Colonnes et
              noms ignorés.
            </FieldHint>
          </div>
          {parsed.invalid.length ? (
            <ErrorText>Clé de contrôle invalide, ignoré(s) : {parsed.invalid.join(", ")}</ErrorText>
          ) : null}
          {parsed.truncated ? (
            <ErrorText>{parsed.truncated} ISIN au-delà de la limite, ignoré(s).</ErrorText>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          onClick={() => void runPreview()}
          disabled={!profileId || parsed.isins.length === 0 || busy !== null}
        >
          {busy === "preview" ? "Calcul…" : "Aperçu des résultats"}
        </Button>
        <Button onClick={() => void runGenerate()} disabled={!preview || busy !== null}>
          {busy === "generate" ? "Génération…" : "Générer le rapport"}
        </Button>
      </div>
      {error ? <ErrorText>{error}</ErrorText> : null}

      {preview ? <PreviewTable preview={preview} /> : null}
    </section>
  );
}

function PreviewTable({ preview }: { preview: ReportPreview }) {
  return (
    <div className="flex flex-col gap-3">
      {preview.missing.length ? (
        <p className="text-label text-solar-ink">
          {preview.missing.length} fonds sans annexe ingérée : verdict « à vérifier ». Déposez leur
          annexe dans{" "}
          <Link to="/pro/fonds" className="underline">
            Fonds
          </Link>
          .
        </p>
      ) : null}
      <div className="paper-card overflow-x-auto p-2">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead>
            <tr className="mono-meta text-ink-3">
              <th className="p-3 font-normal">Fonds</th>
              <th className="p-3 font-normal">Verdict</th>
              <th className="p-3 font-normal">Demandé / engagement</th>
              <th className="p-3 font-normal">Constats</th>
            </tr>
          </thead>
          <tbody>
            {preview.results.map((r) => (
              <tr key={r.isin} className="border-t border-paper-3 align-top">
                <td className="p-3">
                  <p className="mono-meta text-ink-3">{r.isin}</p>
                  <p className="text-body-sm text-ink">{r.fund_name ?? "Aucune donnée"}</p>
                </td>
                <td className="p-3">
                  <VerdictBadge verdict={r.verdict} />
                  <p className="mt-1 max-w-[28ch] text-caption text-ink-3">{r.verdict_reason}</p>
                </td>
                <td className="p-3">
                  <ul className="flex flex-col gap-1.5">
                    {r.axes.map((a) => (
                      <li key={a.axis} className="text-label text-ink">
                        <span className="text-ink-2">{AXIS_TITLES[a.axis].split(" ")[0]}</span>{" "}
                        <span className="font-value">
                          {a.requested} / {a.fund_value}
                        </span>{" "}
                        · <AxisStatusText status={a.status} />
                      </li>
                    ))}
                  </ul>
                </td>
                <td className="p-3">
                  <ul className="flex flex-col gap-1 text-label text-ink-2">
                    {r.alerts.map((al) => (
                      <li key={al.code} title={al.message}>
                        {ALERT_LABELS[al.code]}
                      </li>
                    ))}
                  </ul>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
