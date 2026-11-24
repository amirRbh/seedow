/**
 * Fonds : recherche par ISIN ou nom, statut des données, dépôt d'annexes.
 *
 * L'ingestion (extraction par le modèle, vérification des citations) est trop
 * lourde pour le Worker : le PDF déposé part dans le Storage
 * (`pro-annexes/inbox/<uid>/<ISIN>__….pdf`) et est traité par le script
 * `scripts/pro/ingest.ts --inbox`.
 */
import { createFileRoute } from "@tanstack/react-router";
import { Upload } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { callAuthed } from "@/lib/authedServerFn";
import { inboxFileName, isValidIsin } from "@/lib/pro/app/isin";
import { pctOrDash as pct } from "@/lib/pro/labels";
import {
  listMyAnnexUploads,
  searchFunds,
  type AnnexUpload,
  type FundSearchRow,
} from "@/lib/pro/pro.functions";
import { DataStatus, ErrorText, FieldHint, PageTitle } from "./-components/ui";

export const Route = createFileRoute("/pro/fonds")({ component: FundsPage });

const MAX_PDF_BYTES = 20 * 1024 * 1024;
const UPLOAD_STATE: Record<AnnexUpload["state"], string> = {
  en_attente: "En file d'attente",
  traite: "Traité",
  echec: "Échec du traitement",
};

function FundsPage() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<FundSearchRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string) => {
    setError(null);
    try {
      setRows(await callAuthed(searchFunds, { q: query }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Recherche impossible");
    }
  }, []);

  useEffect(() => {
    void search("");
  }, [search]);

  return (
    <section className="flex flex-col gap-8">
      <PageTitle title="Fonds">
        Fonds dont l'annexe précontractuelle SFDR a été ingérée. Chaque chiffre provient de
        l'annexe, avec sa page et sa citation ; les données non revues sont signalées comme telles.
      </PageTitle>

      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          void search(q);
        }}
        className="flex max-w-xl gap-2"
        role="search"
      >
        <Label htmlFor="fund-q" className="sr-only">
          ISIN ou nom du fonds
        </Label>
        <Input
          id="fund-q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ISIN ou nom du fonds"
          maxLength={100}
        />
        <Button type="submit" variant="outline">
          Rechercher
        </Button>
      </form>
      {error ? <ErrorText>{error}</ErrorText> : null}

      {rows ? (
        rows.length === 0 ? (
          <p className="text-body text-ink-2">Aucun fonds trouvé.</p>
        ) : (
          <div className="paper-card overflow-x-auto p-2">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead>
                <tr className="mono-meta text-ink-3">
                  <th className="p-3 font-normal">Fonds</th>
                  <th className="p-3 font-normal">Art.</th>
                  <th className="p-3 font-normal">Durable min.</th>
                  <th className="p-3 font-normal">Taxinomie min.</th>
                  <th className="p-3 font-normal">PAI</th>
                  <th className="p-3 font-normal">Annexe</th>
                  <th className="p-3 font-normal">Données</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.isin} className="border-t border-paper-3 align-top">
                    <td className="p-3">
                      <p className="mono-meta text-ink-3">{r.isin}</p>
                      <p className="text-body-sm text-ink">{r.name}</p>
                      {r.management_company ? (
                        <p className="text-caption text-ink-3">{r.management_company}</p>
                      ) : null}
                    </td>
                    <td className="p-3 font-value text-label text-ink">{r.sfdr_article ?? "—"}</td>
                    <td className="p-3 font-value text-label text-ink">
                      {pct(r.min_sustainable_pct)}
                    </td>
                    <td className="p-3 font-value text-label text-ink">
                      {pct(r.min_taxonomy_pct)}
                    </td>
                    <td className="p-3 text-label text-ink">
                      {r.considers_pai === null ? "—" : r.considers_pai ? "Oui" : "Non"}
                    </td>
                    <td className="p-3 font-value text-label text-ink-2">
                      {r.doc_date ?? "non datée"}
                    </td>
                    <td className="p-3">
                      <DataStatus status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : null}

      <AnnexUploader />
    </section>
  );
}

function AnnexUploader() {
  const [isin, setIsin] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploads, setUploads] = useState<AnnexUpload[]>([]);

  const loadUploads = useCallback(async () => {
    try {
      setUploads(await callAuthed(listMyAnnexUploads, undefined as never));
    } catch {
      setUploads([]);
    }
  }, []);

  useEffect(() => {
    void loadUploads();
  }, [loadUploads]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const code = isin.trim().toUpperCase();
    if (!isValidIsin(code)) return setError("ISIN invalide (clé de contrôle).");
    if (!file) return setError("Choisissez le PDF de l'annexe.");
    if (file.size > MAX_PDF_BYTES) return setError("PDF trop volumineux (20 Mo maximum).");
    const magic = new TextDecoder().decode(await file.slice(0, 4).arrayBuffer());
    if (magic !== "%PDF") return setError("Le fichier n'est pas un PDF.");

    setBusy(true);
    try {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user.id;
      if (!uid) throw new Error("Session expirée");
      const path = `inbox/${uid}/${inboxFileName(code, Date.now())}`;
      const { error: upErr } = await supabase.storage
        .from("pro-annexes")
        .upload(path, file, { contentType: "application/pdf", upsert: false });
      if (upErr) throw upErr;
      toast.success("Annexe déposée : elle sera traitée puis revue avant usage.");
      setIsin("");
      setFile(null);
      await loadUploads();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Dépôt impossible");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="paper-card flex flex-col gap-5 p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-body-xl font-semibold text-ink">Déposer une annexe précontractuelle</h2>
        <FieldHint>
          Annexe II (article 8) ou III (article 9) du règlement délégué 2022/1288, en français ou en
          anglais. L'extraction a lieu hors ligne ; les valeurs n'apparaissent qu'une fois traitées.
        </FieldHint>
      </div>
      <form
        onSubmit={submit}
        className="grid gap-4 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_auto] sm:items-end"
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="up-isin" className="text-label text-ink">
            ISIN de la part
          </Label>
          <Input
            id="up-isin"
            value={isin}
            onChange={(e) => setIsin(e.target.value)}
            required
            className="font-value"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="up-file" className="text-label text-ink">
            Fichier PDF
          </Label>
          <Input
            id="up-file"
            type="file"
            accept="application/pdf,.pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            required
          />
        </div>
        <Button type="submit" disabled={busy}>
          <Upload aria-hidden /> {busy ? "Envoi…" : "Déposer"}
        </Button>
      </form>
      {error ? <ErrorText>{error}</ErrorText> : null}
      {uploads.length ? (
        <ul className="flex flex-col gap-1 border-t border-paper-3 pt-4">
          {uploads.map((u) => (
            <li
              key={`${u.state}-${u.name}`}
              className="flex flex-wrap justify-between gap-2 text-label"
            >
              <span className="mono-meta text-ink-2">{u.name}</span>
              <span
                className={
                  u.state === "echec"
                    ? "text-alert-ink"
                    : u.state === "traite"
                      ? "text-mint-ink"
                      : "text-ink-2"
                }
              >
                {UPLOAD_STATE[u.state]}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
