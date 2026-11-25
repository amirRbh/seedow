/**
 * Recueil des préférences de durabilité, selon le parcours du document
 * conjoint ACPR/AMF (novembre 2025) :
 *   1. le client souhaite-t-il une prise en compte ? Non / ne se prononce pas → neutre ;
 *   2. souhaite-t-il détailler lui-même les trois critères ? Oui → détaillé ;
 *      Non → choix parmi les profils prédéfinis du cabinet.
 * Une fiche de recueil (explication neutre + réponses) est archivée à chaque
 * enregistrement. L'adaptation éventuelle se fait au moment du conseil, dans
 * le rapport — jamais en réécrivant le recueil.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { callAuthed } from "@/lib/authedServerFn";
import { clientProfileInputSchema, type PredefinedProfileRow } from "@/lib/pro/app/data";
import { PAI_CATEGORIES, type PaiCategory } from "@/lib/pro/extraction/schema";
import { PAI_CATEGORY_LABELS } from "@/lib/pro/matching/engine";
import { createClientProfile, listPredefinedProfiles } from "@/lib/pro/pro.functions";
import { ErrorText, FieldHint, PageTitle } from "./-components/ui";
import { usePro } from "./-components/pro-context";

export const Route = createFileRoute("/pro/clients/new")({ component: NewClientPage });

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function parsePct(s: string): number | null {
  const t = s.trim().replace(",", ".");
  return t === "" ? null : Number(t);
}

type Step1 = "unset" | "yes" | "no";
type Step2 = "unset" | "detailed" | "predefined";

function NewClientPage() {
  const { refresh } = usePro();
  const navigate = useNavigate();
  const [clientRef, setClientRef] = useState("");
  const [collectedAt, setCollectedAt] = useState(today());
  const [joint, setJoint] = useState(false);
  const [wants, setWants] = useState<Step1>("unset");
  const [how, setHow] = useState<Step2>("unset");
  const [taxo, setTaxo] = useState("");
  const [sfdr, setSfdr] = useState("");
  const [pai, setPai] = useState(false);
  const [cats, setCats] = useState<PaiCategory[]>([]);
  const [predefined, setPredefined] = useState<PredefinedProfileRow[] | null>(null);
  const [predefinedId, setPredefinedId] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    callAuthed(listPredefinedProfiles, undefined as never)
      .then(setPredefined)
      .catch(() => setPredefined([]));
  }, []);

  const mode = wants === "no" ? "neutral" : wants === "yes" && how !== "unset" ? how : null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!mode) {
      setErrors(["Répondez aux questions du parcours de recueil."]);
      return;
    }
    const common = { client_ref: clientRef, collected_at: collectedAt, joint_account: joint };
    const input =
      mode === "neutral"
        ? { ...common, preference_mode: "neutral" as const }
        : mode === "detailed"
          ? {
              ...common,
              preference_mode: "detailed" as const,
              taxonomy_min_pct: parsePct(taxo),
              sfdr_min_pct: parsePct(sfdr),
              pai_required: pai,
              pai_categories: pai ? cats : [],
            }
          : {
              ...common,
              preference_mode: "predefined" as const,
              predefined_profile_id: predefinedId,
            };
    const parsed = clientProfileInputSchema.safeParse(input);
    if (!parsed.success) {
      setErrors([...new Set(parsed.error.issues.map((i) => i.message))]);
      return;
    }
    setErrors([]);
    setBusy(true);
    try {
      const { id } = await callAuthed(createClientProfile, parsed.data);
      await refresh();
      toast.success("Profil enregistré, fiche de recueil archivée");
      await navigate({ to: "/pro/rapports/new", search: { profile: id } });
    } catch (err) {
      setErrors([err instanceof Error ? err.message : "Enregistrement impossible"]);
    } finally {
      setBusy(false);
    }
  }

  const choice = (on: boolean) =>
    on
      ? "rounded-[16px] bg-ink px-4 py-3 text-left text-label font-semibold text-paper"
      : "rounded-[16px] bg-paper-2 px-4 py-3 text-left text-label font-semibold text-ink hover:bg-paper-inset";

  return (
    <section className="flex flex-col gap-8">
      <PageTitle title="Recueil des préférences de durabilité">
        Parcours conforme au document conjoint ACPR/AMF de novembre 2025. Une fiche de recueil,
        reprenant l'explication neutre remise au client et ses réponses, est archivée à
        l'enregistrement.
      </PageTitle>

      <form onSubmit={submit} className="flex max-w-2xl flex-col gap-6">
        <div className="paper-card flex flex-col gap-5 p-6">
          <div className="flex flex-col gap-2">
            <Label htmlFor="client-ref" className="text-label text-ink">
              Référence client (pseudonyme)
            </Label>
            <Input
              id="client-ref"
              value={clientRef}
              onChange={(e) => setClientRef(e.target.value)}
              placeholder="CLI-2026-014"
              required
              maxLength={64}
              className="font-value"
            />
            <FieldHint>
              Référence interne au cabinet. Jamais le nom ni l'email du client : la fiche et les
              rapports sont des documents archivés.
            </FieldHint>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="collected-at" className="text-label text-ink">
              Date de recueil
            </Label>
            <Input
              id="collected-at"
              type="date"
              value={collectedAt}
              onChange={(e) => setCollectedAt(e.target.value)}
              required
              max={today()}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="joint" className="text-label text-ink">
              Compte joint (une fiche par co-titulaire)
            </Label>
            <Switch id="joint" checked={joint} onCheckedChange={setJoint} />
          </div>
        </div>

        <fieldset className="paper-card flex flex-col gap-4 p-6">
          <legend className="sr-only">Question 1</legend>
          <p className="text-body font-semibold text-ink">
            1. Le client souhaite-t-il que ses préférences en matière de durabilité soient prises en
            compte ?
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              className={choice(wants === "yes")}
              onClick={() => setWants("yes")}
            >
              Oui
            </button>
            <button
              type="button"
              className={choice(wants === "no")}
              onClick={() => {
                setWants("no");
                setHow("unset");
              }}
            >
              Non, ou ne se prononce pas
            </button>
          </div>
          {wants === "no" ? (
            <FieldHint>
              Client « neutre » : des produits présentant ou non des caractéristiques de durabilité
              pourront lui être recommandés.
            </FieldHint>
          ) : null}
        </fieldset>

        {wants === "yes" ? (
          <fieldset className="paper-card flex flex-col gap-4 p-6">
            <legend className="sr-only">Question 2</legend>
            <p className="text-body font-semibold text-ink">
              2. Souhaite-t-il préciser lui-même ses préférences selon les trois critères
              réglementaires ?
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                className={choice(how === "detailed")}
                onClick={() => setHow("detailed")}
              >
                Oui, il les détaille
              </button>
              <button
                type="button"
                className={choice(how === "predefined")}
                onClick={() => setHow("predefined")}
              >
                Non, il choisit un profil prédéfini
              </button>
            </div>
          </fieldset>
        ) : null}

        {mode === "detailed" ? (
          <fieldset className="paper-card flex flex-col gap-6 p-6">
            <legend className="sr-only">Préférences détaillées</legend>
            <PctField
              id="taxo"
              label="(a) Proportion minimale d'investissements alignés sur la taxinomie de l'UE"
              value={taxo}
              onChange={setTaxo}
            />
            <PctField
              id="sfdr"
              label="(b) Proportion minimale d'investissements durables (art. 2(17) SFDR)"
              value={sfdr}
              onChange={setSfdr}
            />
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="pai" className="text-label text-ink">
                  (c) Prise en compte des principales incidences négatives (PAI)
                </Label>
                <Switch id="pai" checked={pai} onCheckedChange={setPai} />
              </div>
              {pai ? (
                <fieldset className="flex flex-col gap-2">
                  <legend className="text-label text-ink-2">
                    Thèmes demandés (facultatif ; tous seront exigés de chaque fonds recommandé)
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {PAI_CATEGORIES.map((c) => {
                      const on = cats.includes(c);
                      return (
                        <label
                          key={c}
                          className={
                            on
                              ? "flex cursor-pointer items-center gap-2 rounded-[10px] bg-ink px-3 py-2 text-label text-paper"
                              : "flex cursor-pointer items-center gap-2 rounded-[10px] bg-paper-2 px-3 py-2 text-label text-ink"
                          }
                        >
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={() =>
                              setCats(on ? cats.filter((x) => x !== c) : [...cats, c])
                            }
                          />
                          {PAI_CATEGORY_LABELS[c]}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              ) : null}
            </div>
            <FieldHint>
              Pourcentages libres de 0 à 100 : le client peut exprimer un minimum supérieur à ce que
              l'offre propose (synthèse SPOT AMF 2026). Tous les critères exprimés s'appliquent
              ensemble.
            </FieldHint>
          </fieldset>
        ) : null}

        {mode === "predefined" ? (
          <fieldset className="paper-card flex flex-col gap-3 p-6">
            <legend className="sr-only">Profil prédéfini</legend>
            {predefined === null ? <p className="text-body text-ink-2">Chargement…</p> : null}
            {predefined?.length === 0 ? (
              <p className="text-body text-ink">
                Aucun profil prédéfini.{" "}
                <Link to="/pro/profils-predefinis" className="underline">
                  Définir les profils du cabinet
                </Link>
              </p>
            ) : null}
            {predefined?.map((p) => (
              <label
                key={p.id}
                className={
                  predefinedId === p.id
                    ? "flex cursor-pointer flex-col gap-1 rounded-[16px] p-4 ring-2 ring-ink"
                    : "flex cursor-pointer flex-col gap-1 rounded-[16px] bg-paper-2 p-4"
                }
              >
                <span className="flex items-center gap-2 text-body font-semibold text-ink">
                  <input
                    type="radio"
                    name="predefined"
                    checked={predefinedId === p.id}
                    onChange={() => setPredefinedId(p.id)}
                  />
                  {p.label}
                </span>
                <span className="text-label text-ink-2">{p.description}</span>
              </label>
            ))}
            <FieldHint>
              La description de chaque profil est reproduite sur la fiche remise au client.
            </FieldHint>
          </fieldset>
        ) : null}

        {errors.length ? (
          <div className="flex flex-col gap-1">
            {errors.map((m) => (
              <ErrorText key={m}>{m}</ErrorText>
            ))}
          </div>
        ) : null}
        <Button type="submit" disabled={busy || !mode} className="self-start">
          {busy ? "Enregistrement…" : "Enregistrer le recueil"}
        </Button>
      </form>
    </section>
  );
}

function PctField(props: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={props.id} className="text-label text-ink">
        {props.label}
      </Label>
      <div className="flex items-center gap-2">
        <Input
          id={props.id}
          inputMode="decimal"
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          placeholder="non retenu"
          className="max-w-40 font-value tabular-nums"
        />
        <span className="text-body text-ink-2">%</span>
      </div>
    </div>
  );
}
