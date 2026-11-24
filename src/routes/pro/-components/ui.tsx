/**
 * Petits éléments d'interface partagés par les pages `/pro`. Couleurs par
 * tokens uniquement ; un verdict n'est jamais porté par la couleur seule.
 */
import { CheckCircle2, CircleAlert, CircleHelp, CircleMinus, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { AXIS_STATUS_LABELS, VERDICT_LABELS } from "@/lib/pro/labels";
import type { AxisStatus, Verdict } from "@/lib/pro/matching/types";
import { cn } from "@/lib/utils";

const VERDICT_STYLE: Record<Verdict, { cls: string; Icon: typeof CheckCircle2 }> = {
  ADEQUAT: { cls: "text-mint-ink", Icon: CheckCircle2 },
  PARTIEL: { cls: "text-solar-ink", Icon: CircleAlert },
  A_VERIFIER: { cls: "text-solar-ink", Icon: CircleHelp },
  NON_ADEQUAT: { cls: "text-alert-ink", Icon: XCircle },
  NEUTRE: { cls: "text-ink-2", Icon: CircleMinus },
};

export function VerdictBadge({ verdict, className }: { verdict: Verdict; className?: string }) {
  const { cls, Icon } = VERDICT_STYLE[verdict];
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 text-label font-semibold", cls, className)}
    >
      <Icon aria-hidden className="h-4 w-4 shrink-0" />
      {VERDICT_LABELS[verdict]}
    </span>
  );
}

const AXIS_CLS: Record<AxisStatus, string> = {
  PASS: "text-mint-ink",
  FAIL: "text-alert-ink",
  DONNEE_MANQUANTE: "text-solar-ink",
  A_CONFIRMER: "text-solar-ink",
};

export function AxisStatusText({ status }: { status: AxisStatus }) {
  return (
    <span className={cn("text-label font-semibold", AXIS_CLS[status])}>
      {AXIS_STATUS_LABELS[status]}
    </span>
  );
}

export function PageTitle({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <header className="flex flex-col gap-2">
      <h1 className="text-h1-page text-ink">{title}</h1>
      {children ? <p className="max-w-[68ch] text-body text-ink-2">{children}</p> : null}
    </header>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="text-label text-alert-ink">
      {children}
    </p>
  );
}

export function FieldHint({ children }: { children: ReactNode }) {
  return <p className="text-caption text-ink-3">{children}</p>;
}

const DATA_STATUS: Record<"auto" | "needs_review" | "validated", { label: string; cls: string }> = {
  validated: { label: "Validées", cls: "text-mint-ink" },
  auto: { label: "Automatiques, non revues", cls: "text-ink-2" },
  needs_review: { label: "À revoir", cls: "text-solar-ink" },
};

export function DataStatus({ status }: { status: "auto" | "needs_review" | "validated" | null }) {
  if (!status) return <span className="text-label text-ink-3">Aucune donnée</span>;
  const s = DATA_STATUS[status];
  return <span className={cn("text-label font-semibold", s.cls)}>{s.label}</span>;
}
