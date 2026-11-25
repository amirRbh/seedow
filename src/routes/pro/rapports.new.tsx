/**
 * Préparation d'un rapport : profil client + allocation (ISIN, montants
 * facultatifs), aperçu, adaptation éventuelle, génération et archivage.
 *
 * Conformité (document conjoint ACPR/AMF nov. 2025, synthèse SPOT AMF 2026) :
 *   - l'adaptation ne s'ouvre qu'APRÈS l'aperçu, et seulement si aucun fonds
 *     (ou l'allocation, en approche portefeuille) ne correspond ;
 *   - elle ne vaut que pour ce conseil et est tracée dans le rapport :
 *     proposition, décision du client, préférences adaptées, motifs ;
 *   - un refus produit un rapport « aucune recommandation ».
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { callAuthed } from "@/lib/authedServerFn";
import { MAX_ISINS_PER_REPORT, parseAllocation } from "@/lib/pro/app/isin";
import { PAI_CATEGORIES, type PaiCategory } from "@/lib/pro/extraction/schema";
import { ALERT_LABELS, AXIS_TITLES, VERDICT_LABELS } from "@/lib/pro/labels";
import { PAI_CATEGORY_LABELS, formatPct } from "@/lib/pro/matching/engine";
import { clientPreferencesSchema, type ClientPreferences } from "@/lib/pro/matching/types";
import { generateReport, previewReport, type ReportPreview } from "@/lib/pro/pro.functions";
import { AxisStatusText, ErrorText, FieldHint, PageTitle, VerdictBadge } from "./-components/ui";
import { usePro } from "./-components/pro-context";

export const Route = createFileRoute("/pro/rapports/new")({
  validateSearch: z.object({ profile: z.string().uuid().optional() }),
  component: NewReportPage,
});

const parsePct = (s: string) => (s.trim() === "" ? null : Number(s.trim().replace(",", ".")));
const pctInput = (v: number | null) => (v === null ? "" : String(v).replace(".", ","));

function prefsSummary(p: ClientPreferences): string {
  const parts = [
    p.taxonomy_min_pct !== null ? `taxinomie ≥ ${formatPct(p.taxonomy_min_pct)}` : null,
    p.sfdr_min_pct !== null ? `durable ≥ ${formatPct(p.sfdr_min_pct)}` : null,
    p.pai_required
      ? `PAI${p.pai_categories.length ? ` (${p.pai_categories.map((c) => PAI_CATEGORY_LABELS[c]).join(", ")})` : ""}`
      : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "aucune préférence";
}

function NewReportPage() {
  const { profiles } = usePro();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [profileId, setProfileId] = useState(search.profile ?? profiles[0]?.id ?? "");
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<ReportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"preview" | "generate" | null>(null);
  // Adaptation
  const [adapting, setAdapting] = useState(false);
  const [proposal, setProposal] = useState("");
  const [decision, setDecision] = useState<"accepted" | "refused">("accepted");
  const [reasons, setReasons] = useState("");
  const [aTaxo, setATaxo] = useState("");
  const [aSfdr, setASfdr] = useState("");
  const [aPai, setAPai] = useState(false);
  const [aCats, setACats] = useState<PaiCategory[]>([]);

  const alloc = useMemo(() => parseAllocation(text), [text]);
  const profile = profiles.find((p) => p.id === profileId) ?? null;
  const prefs: ClientPreferences | null = profile
    ? {
        taxonomy_min_pct: profile.taxonomy_min_pct,
        sfdr_min_pct: profile.sfdr_min_pct,
        pai_required: profile.pai_required,
        pai_categories: profile.pai_categories,
      }
    : null;

  function reset() {
    setPreview(null);
    setAdapting(false);
  }

  function startAdaptation() {
    if (!prefs) return;
    setATaxo(pctInput(prefs.taxonomy_min_pct));
    setASfdr(pctInput(prefs.sfdr_min_pct));
    setAPai(prefs.pai_required);
    setACats(prefs.pai_categories);
    setAdapting(true);
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 1_000_000) {
      setError("Fichier trop volumineux (1 Mo maximum)");
      return;
    }
    setText(await file.text());
    reset();
  }

  const request = () => ({
    profile_id: profileId,
    isins: alloc.isins,
    ...(alloc.amounts ? { amounts: alloc.amounts } : {}),
  });

  async function runPreview() {
    setBusy("preview");
    setError(null);
    setAdapting(false);
    try {
      setPreview(await callAuthed(previewReport, request()));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Aperçu impossible");
    } finally {
      setBusy(null);
    }
  }

  async function runGenerate() {
    let adaptation;
    if (adapting) {
      const adapted =
        decision === "accepted"
          ? clientPreferencesSchema.safeParse({
              taxonomy_min_pct: parsePct(aTaxo),
              sfdr_min_pct: parsePct(aSfdr),
              pai_required: aPai,
              pai_categories: aPai ? aCats : [],
            })
          : null;
      if (adapted && !adapted.success) {
        setError(adapted.error.issues[0]?.message ?? "Préférences adaptées invalides");
        return;
      }
      if (proposal.trim() === "" || reasons.trim() === "") {
        setError("Décrivez la proposition faite au client et les motifs de sa décision.");
        return;
      }
      adaptation = { proposal, decision, adapted: adapted ? adapted.data : null, reasons };
    }
    setBusy("generate");
    setError(null);
    try {
      const r = await callAuthed(generateReport, { ...request(), adaptation });
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
          Commencez par recueillir les préférences d'un client.
        </PageTitle>
        <Button asChild className="self-start">
          <Link to="/pro/clients/new">Recueil des préférences</Link>
        </Button>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-8">
      <PageTitle title="Nouveau rapport">
        Confrontez les préférences d'un client aux annexes précontractuelles SFDR des fonds
        envisagés. Avec des montants, l'allocation est aussi évaluée en moyenne pondérée. Le rapport
        est horodaté, archivé et ne peut plus être modifié.
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
              reset();
            }}
            className="min-h-12 rounded-[16px] border border-input bg-paper px-4 text-body text-ink"
          >
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.client_ref} — recueilli le {p.collected_at}
              </option>
            ))}
          </select>
          {profile && prefs ? (
            <p className="text-label text-ink-2">
              {profile.preference_mode === "neutral"
                ? "Client neutre : pas de préférence de durabilité."
                : profile.preference_mode === "predefined"
                  ? `Profil prédéfini « ${profile.predefined_label} » : ${prefsSummary(prefs)}`
                  : `Préférences détaillées : ${prefsSummary(prefs)}`}
            </p>
          ) : null}
        </div>

        <div className="paper-card flex flex-col gap-3 p-6">
          <Label htmlFor="isins" className="text-label text-ink">
            Allocation (un fonds par ligne : ISIN, puis montant facultatif)
          </Label>
          <textarea
            id="isins"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              reset();
            }}
            rows={7}
            placeholder={"FR0010592022 ; 30 000\nLU0347711466 ; 20 000"}
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
              {alloc.isins.length} ISIN reconnu(s), {MAX_ISINS_PER_REPORT} maximum ·{" "}
              {alloc.amounts
                ? "approche portefeuille (montants sur toutes les lignes)"
                : "évaluation fonds par fonds"}
            </FieldHint>
          </div>
          {alloc.invalid.length ? (
            <ErrorText>Clé de contrôle invalide, ignoré(s) : {alloc.invalid.join(", ")}</ErrorText>
          ) : null}
          {alloc.missing_amounts.length ? (
            <ErrorText>
              Montant manquant pour {alloc.missing_amounts.join(", ")} : indiquez un montant sur
              chaque ligne, ou sur aucune.
            </ErrorText>
          ) : null}
          {alloc.truncated ? (
            <ErrorText>{alloc.truncated} ISIN au-delà de la limite, ignoré(s).</ErrorText>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          onClick={() => void runPreview()}
          disabled={
            !profileId ||
            alloc.isins.length === 0 ||
            alloc.missing_amounts.length > 0 ||
            busy !== null
          }
        >
          {busy === "preview" ? "Calcul…" : "Aperçu des résultats"}
        </Button>
        <Button onClick={() => void runGenerate()} disabled={!preview || busy !== null}>
          {busy === "generate"
            ? "Génération…"
            : adapting && decision === "refused"
              ? "Générer le rapport (aucune recommandation)"
              : "Générer le rapport"}
        </Button>
      </div>
      {error ? <ErrorText>{error}</ErrorText> : null}

      {preview ? <PreviewView preview={preview} /> : null}

      {preview?.adaptation_allowed && !adapting ? (
        <div className="paper-card-inset flex flex-col items-start gap-3 p-5">
          <p className="text-body text-ink">
            Aucun fonds {preview.portfolio ? "ni l'allocation " : ""}ne correspond aux préférences
            recueillies. Informez-en le client : il peut, s'il le souhaite, adapter ses préférences
            pour ce conseil seulement.
          </p>
          <Button variant="outline" onClick={startAdaptation}>
            Documenter une adaptation proposée au client
          </Button>
        </div>
      ) : null}

      {adapting && prefs ? (
        <div className="paper-card flex max-w-3xl flex-col gap-5 p-6">
          <h2 className="text-body-xl font-semibold text-ink">Adaptation pour ce conseil</h2>
          <FieldHint>
            Le recueil n'est pas modifié. Le rapport reproduira la proposition, la décision du
            client, les préférences adaptées et les motifs (art. 54 §10 du règlement délégué
            2017/565).
          </FieldHint>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ad-proposal" className="text-label text-ink">
              Proposition faite au client (produits ou allocation les plus proches, critères à
              adapter)
            </Label>
            <textarea
              id="ad-proposal"
              value={proposal}
              onChange={(e) => setProposal(e.target.value)}
              rows={3}
              maxLength={4000}
              className="rounded-[16px] border border-input bg-paper px-4 py-3 text-body text-ink"
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {(["accepted", "refused"] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDecision(d)}
                className={
                  decision === d
                    ? "rounded-[16px] bg-ink px-4 py-3 text-left text-label font-semibold text-paper"
                    : "rounded-[16px] bg-paper-2 px-4 py-3 text-left text-label font-semibold text-ink"
                }
              >
                {d === "accepted"
                  ? "Le client accepte l'adaptation"
                  : "Le client refuse l'adaptation"}
              </button>
            ))}
          </div>
          {decision === "accepted" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="ad-taxo" className="text-label text-ink">
                  (a) Taxinomie adaptée, minimum %
                </Label>
                <Input
                  id="ad-taxo"
                  inputMode="decimal"
                  value={aTaxo}
                  onChange={(e) => setATaxo(e.target.value)}
                  placeholder="non retenu"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="ad-sfdr" className="text-label text-ink">
                  (b) Durable adapté, minimum %
                </Label>
                <Input
                  id="ad-sfdr"
                  inputMode="decimal"
                  value={aSfdr}
                  onChange={(e) => setASfdr(e.target.value)}
                  placeholder="non retenu"
                />
              </div>
              <div className="flex items-center justify-between gap-4 sm:col-span-2">
                <Label htmlFor="ad-pai" className="text-label text-ink">
                  (c) PAI
                </Label>
                <Switch id="ad-pai" checked={aPai} onCheckedChange={setAPai} />
              </div>
              {aPai ? (
                <div className="flex flex-wrap gap-2 sm:col-span-2">
                  {PAI_CATEGORIES.map((c) => {
                    const on = aCats.includes(c);
                    return (
                      <label
                        key={c}
                        className="flex items-center gap-2 rounded-[10px] bg-paper-2 px-3 py-2 text-label text-ink"
                      >
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() =>
                            setACats(on ? aCats.filter((x) => x !== c) : [...aCats, c])
                          }
                        />
                        {PAI_CATEGORY_LABELS[c]}
                      </label>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-label text-alert-ink">
              Refus : aucun produit ne sera présenté comme correspondant aux préférences du client.
              Le rapport enregistre la décision et ses motifs.
            </p>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="ad-reasons" className="text-label text-ink">
              Motifs de la décision du client
            </Label>
            <textarea
              id="ad-reasons"
              value={reasons}
              onChange={(e) => setReasons(e.target.value)}
              rows={3}
              maxLength={4000}
              className="rounded-[16px] border border-input bg-paper px-4 py-3 text-body text-ink"
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAdapting(false)}
            className="self-start"
          >
            Annuler l'adaptation
          </Button>
        </div>
      ) : null}
    </section>
  );
}

function PreviewView({ preview }: { preview: ReportPreview }) {
  const pf = preview.portfolio;
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
      {pf ? (
        <div className="paper-card flex flex-col gap-2 p-5">
          <p className="text-body font-semibold text-ink">
            Allocation ({pf.total_amount.toLocaleString("fr-FR")} €) :{" "}
            <VerdictBadge verdict={pf.verdict} />
          </p>
          <p className="text-label text-ink-2">{pf.verdict_reason}</p>
          <ul className="flex flex-col gap-1">
            {pf.axes.map((a) => (
              <li key={a.axis} className="text-label text-ink">
                {AXIS_TITLES[a.axis]} ·{" "}
                <span className="font-value">
                  {a.requested} / {a.fund_value}
                </span>{" "}
                · <AxisStatusText status={a.status} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="paper-card overflow-x-auto p-2">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead>
            <tr className="mono-meta text-ink-3">
              <th className="p-3 font-normal">Fonds</th>
              <th className="p-3 font-normal">{pf ? "Évaluation isolée" : "Verdict"}</th>
              <th className="p-3 font-normal">Demandé / engagement</th>
              <th className="p-3 font-normal">Constats</th>
            </tr>
          </thead>
          <tbody>
            {preview.results.map((r, i) => (
              <tr key={r.isin} className="border-t border-paper-3 align-top">
                <td className="p-3">
                  <p className="mono-meta text-ink-3">{r.isin}</p>
                  <p className="text-body-sm text-ink">{r.fund_name ?? "Aucune donnée"}</p>
                  {pf ? (
                    <p className="text-caption text-ink-3">
                      {formatPct(pf.lines[i].weight_pct)} de l'allocation
                    </p>
                  ) : null}
                </td>
                <td className="p-3">
                  <VerdictBadge verdict={r.verdict} />
                  <p className="mt-1 max-w-[28ch] text-caption text-ink-3">{r.verdict_reason}</p>
                </td>
                <td className="p-3">
                  <ul className="flex flex-col gap-1.5">
                    {r.axes.map((a) => (
                      <li key={a.axis} className="text-label text-ink">
                        <span className="text-ink-2">({a.axis})</span>{" "}
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
      <p className="text-caption text-ink-3">
        Verdicts : {Object.values(VERDICT_LABELS).join(" · ")}. Les constats sur les noms appliquent
        les orientations de l'ESMA (seuil de 80 %, exclusions PAB/CTB).
      </p>
    </div>
  );
}
