import { useEffect, useMemo, useState } from "react";
import { useNavigate, useRouter } from "@tanstack/react-router";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useUserPortfolios } from "@/hooks/useUserPortfolios";
import { useAlerts } from "@/hooks/useAlerts";
import { GLOSSARY } from "@/components/ui/Glossary";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ROUTES: Array<{ path: string; label: string; hint: string; shortcut?: string }> = [
  { path: "/dashboard", label: "Vue d'ensemble", hint: "Tableau de bord", shortcut: "g d" },
  { path: "/portfolio", label: "Analyse portefeuille", hint: "Performance, allocation, historique", shortcut: "g p" },
  { path: "/comparatif", label: "Comparatif", hint: "Mes actifs vs benchmarks", shortcut: "g c" },
  { path: "/profil", label: "Profil investisseur", hint: "Préférences, horizon, risque" },
  { path: "/ethi", label: "Ethi — assistant", hint: "Réponses sur tes choix" },
  { path: "/discover", label: "Explorer", hint: "Découvrir des actifs" },
  { path: "/methodologie", label: "Méthodologie", hint: "Modèles, hypothèses, sources" },
  { path: "/reglages", label: "Réglages", hint: "Compte, notifications, sécurité" },
];

/**
 * Palette de commandes globale — ouverte par ⌘K / Ctrl+K.
 * Navigation, switch de portefeuille, actions, glossaire, aide.
 */
export function CommandPalette({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const router = useRouter();
  const { portfolios, activeId, setActiveId } = useUserPortfolios();
  const { unread, markAllRead } = useAlerts();
  const [value, setValue] = useState("");

  useEffect(() => {
    if (!open) setValue("");
  }, [open]);

  const close = () => onOpenChange(false);

  const glossaryEntries = useMemo(
    () =>
      Object.entries(GLOSSARY).map(([key, v]) => ({
        key,
        label: v.title,
        definition: v.body,
      })),
    [],
  );

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Rechercher une page, un portefeuille, un terme…"
        value={value}
        onValueChange={setValue}
      />
      <CommandList>
        <CommandEmpty>Aucun résultat.</CommandEmpty>

        <CommandGroup heading="Aller à">
          {ROUTES.map((r) => (
            <CommandItem
              key={r.path}
              value={`go ${r.label} ${r.hint}`}
              onSelect={() => {
                navigate({ to: r.path });
                close();
              }}
            >
              <span className="flex flex-col">
                <span className="text-[13px] text-ink font-medium">{r.label}</span>
                <span className="text-[11px] text-ink-3">{r.hint}</span>
              </span>
              {r.shortcut && (
                <kbd className="ml-auto text-[10px] text-ink-3 font-mono tracking-wide">{r.shortcut}</kbd>
              )}
            </CommandItem>
          ))}
        </CommandGroup>

        {portfolios.length > 1 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Portefeuilles">
              {portfolios.map((p) => (
                <CommandItem
                  key={p.id}
                  value={`portfolio ${p.name}`}
                  onSelect={() => {
                    setActiveId(p.id);
                    toast.success(`Portefeuille actif : ${p.name}`);
                    close();
                  }}
                >
                  <span className="flex flex-col">
                    <span className="text-[13px] text-ink font-medium">{p.name}</span>
                    <span className="text-[11px] text-ink-3">
                      Capital initial {p.initial_amount.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                    </span>
                  </span>
                  {p.id === activeId && (
                    <span className="ml-auto text-[10px] uppercase tracking-[0.18em] text-gold">Actif</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem
            value="action simulateur objectif"
            onSelect={() => {
              navigate({ to: "/dashboard" });
              setTimeout(() => {
                const el = document.querySelector("[data-simulator-root]") as HTMLElement | null;
                el?.scrollIntoView({ behavior: "smooth", block: "start" });
              }, 200);
              close();
            }}
          >
            <span className="text-[13px] text-ink">Simuler un objectif</span>
            <span className="ml-auto text-[11px] text-ink-3">Simulateur</span>
          </CommandItem>
          <CommandItem
            value="action stress test krach"
            onSelect={() => {
              navigate({ to: "/dashboard" });
              setTimeout(() => {
                const el = document.querySelector("[data-simulator-root]") as HTMLElement | null;
                el?.scrollIntoView({ behavior: "smooth", block: "start" });
              }, 200);
              close();
            }}
          >
            <span className="text-[13px] text-ink">Lancer un stress-test (krach -30 %)</span>
            <span className="ml-auto text-[11px] text-ink-3">Simulateur</span>
          </CommandItem>
          <CommandItem
            value="action marquer alertes lues"
            disabled={unread === 0}
            onSelect={async () => {
              await markAllRead();
              toast.success("Toutes les alertes sont marquées comme lues.");
              close();
            }}
          >
            <span className="text-[13px] text-ink">Marquer toutes les alertes comme lues</span>
            <span className="ml-auto text-[11px] text-ink-3">{unread} non lue{unread > 1 ? "s" : ""}</span>
          </CommandItem>
          <CommandItem
            value="action invalider cache router refresh"
            onSelect={async () => {
              await router.invalidate();
              toast.success("Données rafraîchies.");
              close();
            }}
          >
            <span className="text-[13px] text-ink">Rafraîchir les données</span>
            <span className="ml-auto text-[11px] text-ink-3">Recharger</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />
        <CommandGroup heading="Glossaire">
          {glossaryEntries.map((g) => (
            <CommandItem
              key={g.key}
              value={`glossary ${g.key} ${g.label}`}
              onSelect={() => {
                toast(g.label, { description: g.definition });
                close();
              }}
            >
              <span className="text-[13px] text-ink font-medium">{g.label}</span>
              <span className="ml-3 text-[11px] text-ink-3 truncate">{g.definition.slice(0, 80)}{g.definition.length > 80 ? "…" : ""}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />
        <CommandGroup heading="Aide">
          <CommandItem value="help raccourcis clavier" onSelect={() => {
            toast("Raccourcis clavier", {
              description: "⌘K palette · g d Dashboard · g p Portfolio · g c Comparatif · ? cette aide",
            });
            close();
          }}>
            <span className="text-[13px] text-ink">Voir les raccourcis clavier</span>
            <kbd className="ml-auto text-[10px] text-ink-3 font-mono">?</kbd>
          </CommandItem>
          <CommandItem value="help comprendre kpi" onSelect={() => {
            navigate({ to: "/methodologie" });
            close();
          }}>
            <span className="text-[13px] text-ink">Comprendre mes KPI</span>
            <span className="ml-auto text-[11px] text-ink-3">Méthodologie</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
