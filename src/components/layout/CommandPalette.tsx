import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
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




/**
 * Palette de commandes globale — ouverte par ⌘K / Ctrl+K.
 * Navigation, switch de portefeuille, actions, glossaire, aide.
 */
export function CommandPalette({ open, onOpenChange }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const ROUTES = [
    { path: "/dashboard", label: t("command_palette.routes.dashboard_label"), hint: t("command_palette.routes.dashboard_hint"), shortcut: "g d" },
    { path: "/portfolio", label: t("command_palette.routes.portfolio_label"), hint: t("command_palette.routes.portfolio_hint"), shortcut: "g p" },
    { path: "/objectifs", label: t("command_palette.routes.objectifs_label"), hint: t("command_palette.routes.objectifs_hint"), shortcut: "g o" },
    { path: "/communaute", label: t("command_palette.routes.communaute_label"), hint: t("command_palette.routes.communaute_hint") },
    { path: "/comparatif", label: t("command_palette.routes.comparatif_label"), hint: t("command_palette.routes.comparatif_hint"), shortcut: "g c" },
    { path: "/profil", label: t("command_palette.routes.profil_label"), hint: t("command_palette.routes.profil_hint") },
    { path: "/ethi", label: t("command_palette.routes.ethi_label"), hint: t("command_palette.routes.ethi_hint") },
    { path: "/discover", label: t("command_palette.routes.discover_label"), hint: t("command_palette.routes.discover_hint") },
    { path: "/methodologie", label: t("command_palette.routes.methodologie_label"), hint: t("command_palette.routes.methodologie_hint") },
    { path: "/reglages", label: t("command_palette.routes.reglages_label"), hint: t("command_palette.routes.reglages_hint") },
  ];
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
        placeholder={t("command_palette.placeholder")}
        value={value}
        onValueChange={setValue}
      />
      <CommandList>
        <CommandEmpty>{t("command_palette.empty")}</CommandEmpty>

        <CommandGroup heading={t("command_palette.heading_navigate")}>
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
                <span className="text-body-sm text-ink font-medium">{r.label}</span>
                <span className="text-caption text-ink-3">{r.hint}</span>
              </span>
              {r.shortcut && (
                <kbd className="ml-auto text-tag text-ink-3 font-mono tracking-wide">{r.shortcut}</kbd>
              )}
            </CommandItem>
          ))}
        </CommandGroup>

        {portfolios.length > 1 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={t("command_palette.heading_portfolios")}>
              {portfolios.map((p) => (
                <CommandItem
                  key={p.id}
                  value={`portfolio ${p.name}`}
                  onSelect={() => {
                    setActiveId(p.id);
                    toast.success(t("command_palette.portfolio_switched", { name: p.name }));
                    close();
                  }}
                >
                  <span className="flex flex-col">
                    <span className="text-body-sm text-ink font-medium">{p.name}</span>
                    <span className="text-caption text-ink-3">
                      {t("command_palette.capital_initial", { amount: p.initial_amount.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) })}
                    </span>
                  </span>
                  {p.id === activeId && (
                    <span className="ml-auto text-tag uppercase tracking-[0.18em] text-gold">{t("command_palette.active")}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />
        <CommandGroup heading={t("command_palette.heading_actions")}>
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
            <span className="text-body-sm text-ink">{t("command_palette.action_simulate")}</span>
            <span className="ml-auto text-caption text-ink-3">{t("command_palette.hint_simulator")}</span>
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
            <span className="text-body-sm text-ink">{t("command_palette.action_stress")}</span>
            <span className="ml-auto text-caption text-ink-3">{t("command_palette.hint_simulator")}</span>
          </CommandItem>
          <CommandItem
            value="action marquer alertes lues"
            disabled={unread === 0}
            onSelect={async () => {
              await markAllRead();
              toast.success(t("command_palette.alerts_read_toast"));
              close();
            }}
          >
            <span className="text-body-sm text-ink">{t("command_palette.action_mark_read")}</span>
            <span className="ml-auto text-caption text-ink-3">{t(unread > 1 ? "command_palette.alerts_unread_other" : "command_palette.alerts_unread_one", { count: unread })}</span>
          </CommandItem>
          <CommandItem
            value="action invalider cache router refresh"
            onSelect={async () => {
              await router.invalidate();
              toast.success(t("command_palette.data_refreshed"));
              close();
            }}
          >
            <span className="text-body-sm text-ink">{t("command_palette.action_refresh")}</span>
            <span className="ml-auto text-caption text-ink-3">{t("command_palette.action_refresh_hint")}</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />
        <CommandGroup heading={t("command_palette.heading_glossary")}>
          {glossaryEntries.map((g) => (
            <CommandItem
              key={g.key}
              value={`glossary ${g.key} ${g.label}`}
              onSelect={() => {
                toast(g.label, { description: g.definition });
                close();
              }}
            >
              <span className="text-body-sm text-ink font-medium">{g.label}</span>
              <span className="ml-3 text-caption text-ink-3 truncate">{g.definition.slice(0, 80)}{g.definition.length > 80 ? "…" : ""}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />
        <CommandGroup heading={t("command_palette.heading_help")}>
          <CommandItem value="help raccourcis clavier" onSelect={() => {
            toast(t("command_palette.help_shortcuts"), {
              description: t("command_palette.shortcuts_desc"),
            });
            close();
          }}>
            <span className="text-body-sm text-ink">{t("command_palette.help_shortcuts")}</span>
            <kbd className="ml-auto text-tag text-ink-3 font-mono">?</kbd>
          </CommandItem>
          <CommandItem value="help comprendre kpi" onSelect={() => {
            navigate({ to: "/methodologie" });
            close();
          }}>
            <span className="text-body-sm text-ink">{t("command_palette.help_kpi")}</span>
            <span className="ml-auto text-caption text-ink-3">{t("command_palette.hint_methodology")}</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
