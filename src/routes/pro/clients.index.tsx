/**
 * Profils clients du cabinet et leurs fiches de recueil archivées.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { callAuthed } from "@/lib/authedServerFn";
import { PAI_CATEGORY_LABELS, formatPct } from "@/lib/pro/matching/engine";
import type { ClientProfileRow } from "@/lib/pro/app/data";
import {
  getCollectionDownloadUrl,
  listCollectionRecords,
  type CollectionRecordItem,
} from "@/lib/pro/pro.functions";
import { ErrorText, PageTitle } from "./-components/ui";
import { usePro } from "./-components/pro-context";

export const Route = createFileRoute("/pro/clients/")({ component: ClientsPage });

const MODE_LABEL = {
  neutral: "Neutre",
  detailed: "Détaillées",
  predefined: "Profil prédéfini",
} as const;

function summary(p: ClientProfileRow): string {
  if (p.preference_mode === "neutral") return "Pas de préférence de durabilité";
  return [
    p.preference_mode === "predefined" ? `« ${p.predefined_label} »` : null,
    p.taxonomy_min_pct !== null ? `taxinomie ≥ ${formatPct(p.taxonomy_min_pct)}` : null,
    p.sfdr_min_pct !== null ? `durable ≥ ${formatPct(p.sfdr_min_pct)}` : null,
    p.pai_required
      ? `PAI${p.pai_categories.length ? ` (${p.pai_categories.map((c) => PAI_CATEGORY_LABELS[c]).join(", ")})` : ""}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function ClientsPage() {
  const { profiles } = usePro();
  const [records, setRecords] = useState<CollectionRecordItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    callAuthed(listCollectionRecords, undefined as never)
      .then(setRecords)
      .catch((e) => setError(e instanceof Error ? e.message : "Chargement impossible"));
  }, []);

  async function download(id: string) {
    try {
      const { url } = await callAuthed(getCollectionDownloadUrl, { id });
      window.location.assign(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Téléchargement impossible");
    }
  }

  return (
    <section className="flex flex-col gap-8">
      <PageTitle title="Clients">
        Profils de préférences recueillis et fiches de recueil archivées (non modifiables).
      </PageTitle>
      {error ? <ErrorText>{error}</ErrorText> : null}
      {profiles.length === 0 ? (
        <Button asChild className="self-start">
          <Link to="/pro/clients/new">Recueillir les préférences d'un client</Link>
        </Button>
      ) : null}
      <ul className="flex flex-col gap-3">
        {profiles.map((p) => {
          const recs = records.filter((r) => r.client_profile_id === p.id);
          return (
            <li
              key={p.id}
              className="paper-card flex flex-col gap-2 p-5 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="flex flex-col gap-1">
                <p className="text-body font-semibold text-ink">
                  <span className="font-value">{p.client_ref}</span> · recueilli le {p.collected_at}
                  {p.joint_account ? " · compte joint" : ""}
                </p>
                <p className="text-label text-ink-2">
                  {MODE_LABEL[p.preference_mode]} — {summary(p)}
                </p>
                {recs.map((r) => (
                  <p key={r.id} className="mono-meta break-all text-ink-3">
                    Fiche {r.id} · SHA-256 {r.pdf_sha256}
                  </p>
                ))}
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {recs[0] ? (
                  <Button variant="outline" size="sm" onClick={() => void download(recs[0].id)}>
                    <Download aria-hidden /> Fiche de recueil
                  </Button>
                ) : null}
                <Button asChild size="sm">
                  <Link to="/pro/rapports/new" search={{ profile: p.id }}>
                    Nouveau rapport
                  </Link>
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
