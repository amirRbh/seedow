/**
 * Profils prédéfinis du cabinet (document conjoint ACPR/AMF, nov. 2025) :
 * choix proposés au client qui ne souhaite pas détailler lui-même ses
 * préférences. Chacun repose sur au moins un critère MiFID/DDA, avec des
 * minimums que le cabinet juge suffisamment élevés au regard de son offre.
 * Un profil déjà proposé ne se réécrit pas : on l'archive.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { callAuthed } from "@/lib/authedServerFn";
import { predefinedProfileInputSchema, type PredefinedProfileRow } from "@/lib/pro/app/data";
import { PAI_CATEGORIES, type PaiCategory } from "@/lib/pro/extraction/schema";
import { PAI_CATEGORY_LABELS, formatPct } from "@/lib/pro/matching/engine";
import {
  archivePredefinedProfile,
  createPredefinedProfile,
  listPredefinedProfiles,
} from "@/lib/pro/pro.functions";
import { ErrorText, FieldHint, PageTitle } from "./-components/ui";

export const Route = createFileRoute("/pro/profils-predefinis")({ component: PredefinedPage });

const parsePct = (s: string) => (s.trim() === "" ? null : Number(s.trim().replace(",", ".")));

/** Point de départ, à adapter à l'offre du cabinet (affiché comme suggestion). */
const SUGGESTIONS = [
  {
    label: "Attentif",
    description:
      "Les fonds recommandés prennent en compte leurs principales incidences négatives sur l'environnement et la société, telles que déclarées dans leur annexe précontractuelle.",
    sfdr: "",
    pai: true,
  },
  {
    label: "Engagé",
    description:
      "Chaque fonds recommandé (ou l'allocation, en moyenne pondérée) s'engage sur au moins 25 % d'investissements durables au sens de l'article 2(17) du règlement SFDR.",
    sfdr: "25",
    pai: false,
  },
];

function PredefinedPage() {
  const [items, setItems] = useState<PredefinedProfileRow[] | null>(null);
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [taxo, setTaxo] = useState("");
  const [sfdr, setSfdr] = useState("");
  const [pai, setPai] = useState(false);
  const [cats, setCats] = useState<PaiCategory[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems(await callAuthed(listPredefinedProfiles, undefined as never));
    } catch (e) {
      setErrors([e instanceof Error ? e.message : "Chargement impossible"]);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = predefinedProfileInputSchema.safeParse({
      label,
      description,
      taxonomy_min_pct: parsePct(taxo),
      sfdr_min_pct: parsePct(sfdr),
      pai_required: pai,
      pai_categories: pai ? cats : [],
    });
    if (!parsed.success) {
      setErrors([...new Set(parsed.error.issues.map((i) => i.message))]);
      return;
    }
    setBusy(true);
    setErrors([]);
    try {
      await callAuthed(createPredefinedProfile, parsed.data);
      toast.success("Profil prédéfini créé");
      setLabel("");
      setDescription("");
      setTaxo("");
      setSfdr("");
      setPai(false);
      setCats([]);
      await load();
    } catch (err) {
      setErrors([err instanceof Error ? err.message : "Création impossible"]);
    } finally {
      setBusy(false);
    }
  }

  async function archive(id: string) {
    try {
      await callAuthed(archivePredefinedProfile, { id });
      await load();
    } catch (err) {
      setErrors([err instanceof Error ? err.message : "Archivage impossible"]);
    }
  }

  return (
    <section className="flex flex-col gap-8">
      <PageTitle title="Profils prédéfinis du cabinet">
        Proposés au client qui souhaite une prise en compte de la durabilité sans détailler lui-même
        les critères. L'ACPR et l'AMF attendent des minimums « suffisamment élevés » au regard de
        l'offre du cabinet : le scan de vos contrats aide à les calibrer.
      </PageTitle>

      <ul className="flex flex-col gap-3">
        {items?.length === 0 ? (
          <p className="text-body text-ink-2">Aucun profil pour l'instant.</p>
        ) : null}
        {items?.map((p) => (
          <li
            key={p.id}
            className="paper-card flex flex-col gap-2 p-5 sm:flex-row sm:justify-between"
          >
            <div className="flex flex-col gap-1">
              <p className="text-body font-semibold text-ink">{p.label}</p>
              <p className="text-label text-ink-2">{p.description}</p>
              <p className="text-label text-ink">
                {[
                  p.taxonomy_min_pct !== null
                    ? `taxinomie ≥ ${formatPct(p.taxonomy_min_pct)}`
                    : null,
                  p.sfdr_min_pct !== null ? `durable ≥ ${formatPct(p.sfdr_min_pct)}` : null,
                  p.pai_required
                    ? `PAI${p.pai_categories.length ? ` (${p.pai_categories.map((c) => PAI_CATEGORY_LABELS[c]).join(", ")})` : ""}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void archive(p.id)}
              className="self-start"
            >
              Archiver
            </Button>
          </li>
        ))}
      </ul>

      <form onSubmit={submit} className="paper-card flex max-w-2xl flex-col gap-5 p-6">
        <h2 className="text-body-xl font-semibold text-ink">Nouveau profil prédéfini</h2>
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <Button
              key={s.label}
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setLabel(s.label);
                setDescription(s.description);
                setSfdr(s.sfdr);
                setPai(s.pai);
                setTaxo("");
                setCats([]);
              }}
            >
              Partir de « {s.label} »
            </Button>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="pp-label" className="text-label text-ink">
            Nom
          </Label>
          <Input
            id="pp-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={80}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="pp-desc" className="text-label text-ink">
            Explication remise au client (critères et engagements chiffrés)
          </Label>
          <textarea
            id="pp-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            maxLength={2000}
            className="rounded-[16px] border border-input bg-paper px-4 py-3 text-body text-ink focus-visible:border-ink focus-visible:outline-none"
          />
          <FieldHint>
            Reproduite telle quelle sur la fiche de recueil et dans les rapports.
          </FieldHint>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="pp-taxo" className="text-label text-ink">
              (a) Taxinomie, minimum %
            </Label>
            <Input
              id="pp-taxo"
              inputMode="decimal"
              value={taxo}
              onChange={(e) => setTaxo(e.target.value)}
              placeholder="non retenu"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="pp-sfdr" className="text-label text-ink">
              (b) Investissements durables, minimum %
            </Label>
            <Input
              id="pp-sfdr"
              inputMode="decimal"
              value={sfdr}
              onChange={(e) => setSfdr(e.target.value)}
              placeholder="non retenu"
            />
          </div>
        </div>
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="pp-pai" className="text-label text-ink">
            (c) Prise en compte des PAI
          </Label>
          <Switch id="pp-pai" checked={pai} onCheckedChange={setPai} />
        </div>
        {pai ? (
          <div className="flex flex-wrap gap-2">
            {PAI_CATEGORIES.map((c) => {
              const on = cats.includes(c);
              return (
                <label
                  key={c}
                  className="flex items-center gap-2 rounded-[10px] bg-paper-2 px-3 py-2 text-label text-ink"
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => setCats(on ? cats.filter((x) => x !== c) : [...cats, c])}
                  />
                  {PAI_CATEGORY_LABELS[c]}
                </label>
              );
            })}
          </div>
        ) : null}
        {errors.map((m) => (
          <ErrorText key={m}>{m}</ErrorText>
        ))}
        <Button type="submit" disabled={busy} className="self-start">
          {busy ? "Création…" : "Créer le profil"}
        </Button>
      </form>
    </section>
  );
}
