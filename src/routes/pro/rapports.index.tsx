/**
 * Historique des rapports du cabinet. Téléchargement par lien signé court ;
 * aucune suppression ni modification possible (immuabilité en base).
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { callAuthed } from "@/lib/authedServerFn";
import { VERDICT_LABELS } from "@/lib/pro/labels";
import type { Verdict } from "@/lib/pro/matching/types";
import { getReportDownloadUrl, listReports, type ReportListItem } from "@/lib/pro/pro.functions";
import { ErrorText, PageTitle } from "./-components/ui";

export const Route = createFileRoute("/pro/rapports/")({
  validateSearch: z.object({ created: z.string().uuid().optional() }),
  component: ReportsPage,
});

const ORDER: Verdict[] = ["ADEQUAT", "PARTIEL", "NON_ADEQUAT", "A_VERIFIER", "NEUTRE"];

function dateTime(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(iso));
}

function ReportsPage() {
  const { created } = Route.useSearch();
  const [items, setItems] = useState<ReportListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    callAuthed(listReports, undefined as never)
      .then(setItems)
      .catch((e) => setError(e instanceof Error ? e.message : "Chargement impossible"));
  }, []);

  async function download(id: string) {
    setDownloading(id);
    try {
      const { url } = await callAuthed(getReportDownloadUrl, { id });
      window.location.assign(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Téléchargement impossible");
    } finally {
      setDownloading(null);
    }
  }

  return (
    <section className="flex flex-col gap-8">
      <PageTitle title="Rapports">
        Chaque rapport est archivé tel qu'il a été généré. Il ne peut être ni modifié ni supprimé.
        L'empreinte SHA-256 du PDF permet de vérifier qu'un fichier conservé au dossier client est
        intact.
      </PageTitle>
      {error ? <ErrorText>{error}</ErrorText> : null}
      {items === null && !error ? <p className="text-body text-ink-2">Chargement…</p> : null}
      {items?.length === 0 ? (
        <div className="paper-card-inset flex flex-col items-start gap-3 p-6">
          <p className="text-body text-ink">Aucun rapport pour l'instant.</p>
          <Button asChild>
            <Link to="/pro/rapports/new">Préparer un rapport</Link>
          </Button>
        </div>
      ) : null}
      <ul className="flex flex-col gap-3">
        {items?.map((r) => (
          <li
            key={r.id}
            className={
              r.id === created
                ? "paper-card flex flex-col gap-3 p-5 ring-2 ring-mint sm:flex-row sm:items-start sm:justify-between"
                : "paper-card flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between"
            }
          >
            <div className="flex min-w-0 flex-col gap-1.5">
              <p className="text-body font-semibold text-ink">
                {r.client_ref} · <span className="font-value">{dateTime(r.created_at)}</span>
              </p>
              <p className="text-label text-ink-2">
                {r.funds} fonds :{" "}
                {ORDER.filter((v) => r.counts[v])
                  .map((v) => `${VERDICT_LABELS[v]} ${r.counts[v]}`)
                  .join(" · ")}
              </p>
              <p className="mono-meta break-all text-ink-3">
                Rapport {r.id} · moteur {r.engine_version}
              </p>
              <p className="mono-meta break-all text-ink-3">PDF SHA-256 {r.pdf_sha256}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void download(r.id)}
              disabled={downloading === r.id}
              className="shrink-0"
            >
              <Download aria-hidden /> {downloading === r.id ? "…" : "Télécharger"}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
