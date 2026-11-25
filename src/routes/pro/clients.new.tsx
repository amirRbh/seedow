/**
 * Recueil des préférences de durabilité d'un client (règl. délégué 2017/565
 * art. 2(7)) : trois axes indépendants, catégories PAI, adaptation documentée.
 * Le client est désigné par un pseudonyme interne au cabinet (RGPD).
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { callAuthed } from "@/lib/authedServerFn";
import { clientProfileInputSchema } from "@/lib/pro/app/data";
import { PAI_CATEGORY_LABELS } from "@/lib/pro/matching/engine";
import { PAI_CATEGORIES, type PaiCategory } from "@/lib/pro/extraction/schema";
import { createClientProfile } from "@/lib/pro/pro.functions";
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

function NewClientPage() {
  const { refresh } = usePro();
  const navigate = useNavigate();
  const [clientRef, setClientRef] = useState("");
  const [collectedAt, setCollectedAt] = useState(today());
  const [taxo, setTaxo] = useState("");
  const [sfdr, setSfdr] = useState("");
  const [pai, setPai] = useState(false);
  const [cats, setCats] = useState<PaiCategory[]>([]);
  const [adapted, setAdapted] = useState(false);
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = clientProfileInputSchema.safeParse({
      client_ref: clientRef,
      collected_at: collectedAt,
      taxonomy_min_pct: parsePct(taxo),
      sfdr_min_pct: parsePct(sfdr),
      pai_required: pai,
      pai_categories: pai ? cats : [],
      adapted,
      adaptation_note: adapted ? note : null,
    });
    if (!parsed.success) {
      setErrors(parsed.error.issues.map((i) => i.message));
      return;
    }
    setErrors([]);
    setBusy(true);
    try {
      const { id } = await callAuthed(createClientProfile, parsed.data);
      await refresh();
      toast.success("Profil enregistré");
      await navigate({ to: "/pro/rapports/new", search: { profile: id } });
    } catch (err) {
      setErrors([err instanceof Error ? err.message : "Enregistrement impossible"]);
    } finally {
      setBusy(false);
    }
  }

  const noPreference = taxo.trim() === "" && sfdr.trim() === "" && !pai;

  return (
    <section className="flex flex-col gap-8">
      <PageTitle title="Nouveau profil client">
        Préférences de durabilité recueillies auprès du client. Chaque axe est facultatif : laissez
        vide ce que le client n'a pas exprimé.
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
              Référence interne au cabinet. Jamais le nom ni l'email du client : le rapport est un
              document archivé.
            </FieldHint>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="collected-at" className="text-label text-ink">
              Date de recueil des préférences
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
        </div>

        <fieldset className="paper-card flex flex-col gap-6 p-6">
          <legend className="sr-only">Préférences de durabilité</legend>
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
                  Catégories demandées (facultatif ; sinon, toute prise en compte des PAI suffit)
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
                          className="accent-current"
                          checked={on}
                          onChange={() => setCats(on ? cats.filter((x) => x !== c) : [...cats, c])}
                        />
                        {PAI_CATEGORY_LABELS[c]}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ) : null}
          </div>
          {noPreference ? (
            <FieldHint>
              Aucun axe renseigné : les fonds seront présentés comme « neutres » (le client n'a pas
              exprimé de préférence de durabilité).
            </FieldHint>
          ) : null}
        </fieldset>

        <div className="paper-card flex flex-col gap-4 p-6">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="adapted" className="text-label text-ink">
              Les préférences ont été adaptées avec le client
            </Label>
            <Switch id="adapted" checked={adapted} onCheckedChange={setAdapted} />
          </div>
          {adapted ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="note" className="text-label text-ink-2">
                Préférences initiales, raison et date de l'adaptation
              </Label>
              <textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                maxLength={4000}
                required
                className="rounded-[16px] border border-input bg-paper px-4 py-3 text-body text-ink focus-visible:border-ink focus-visible:outline-none"
              />
              <FieldHint>Reproduit tel quel dans le rapport.</FieldHint>
            </div>
          ) : null}
        </div>

        {errors.length ? (
          <div className="flex flex-col gap-1">
            {errors.map((m) => (
              <ErrorText key={m}>{m}</ErrorText>
            ))}
          </div>
        ) : null}
        <Button type="submit" disabled={busy} className="self-start">
          {busy ? "Enregistrement…" : "Enregistrer et préparer un rapport"}
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
          placeholder="non exprimée"
          className="max-w-40 font-value tabular-nums"
        />
        <span className="text-body text-ink-2">%</span>
      </div>
    </div>
  );
}
