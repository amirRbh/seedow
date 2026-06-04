import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAlerts, type AlertSeverity } from "@/hooks/useAlerts";
import { cn } from "@/lib/utils";

const TONE: Record<AlertSeverity, { dot: string; label: string }> = {
  alert: { dot: "bg-rust", label: "Important" },
  warn: { dot: "bg-gold", label: "À regarder" },
  info: { dot: "bg-moss-2", label: "Suggestion" },
};

export function AlertsBell() {
  const { alerts, unread } = useAlerts();
  const [open, setOpen] = useState(false);
  const count = alerts.length;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label={`Alertes${count > 0 ? ` (${count})` : ""}`}
          className={cn(
            "relative flex items-center justify-center w-9 h-9 rounded-full border border-paper-3 text-ink-2",
            "transition-colors duration-150 hover:text-ink hover:border-ink-3",
            "outline-none focus-visible:ring-2 focus-visible:ring-moss-1",
          )}
        >
          <BellIcon />
          {unread > 0 && (
            <span
              aria-hidden="true"
              className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-rust text-paper text-[9px] font-semibold leading-[16px] text-center tabular-nums"
            >
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md bg-paper border-paper-3 p-0">
        <SheetHeader className="px-5 pt-6 pb-4 border-b border-paper-3 text-left">
          <p className="text-[10px] uppercase tracking-[0.22em] text-gold font-semibold">
            Alertes intelligentes
          </p>
          <SheetTitle className="font-value text-2xl text-ink leading-tight">
            {count === 0 ? "Tout est en ordre" : `${count} signal${count > 1 ? "s" : ""} à examiner`}
          </SheetTitle>
        </SheetHeader>

        <div className="px-5 py-5 space-y-4 overflow-y-auto max-h-[calc(100vh-140px)]">
          {count === 0 ? (
            <p className="text-sm text-ink-3">
              Aucune dérive détectée sur ton portefeuille actif. On te préviendra dès qu'une ligne
              s'écarte de tes valeurs ou de ton allocation cible.
            </p>
          ) : (
            alerts.map((a) => {
              const tone = TONE[a.severity];
              return (
                <article
                  key={a.id}
                  className="border-t border-paper-3 pt-4 first:border-t-0 first:pt-0"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={cn("inline-block w-1.5 h-1.5 rounded-full", tone.dot)} />
                    <span className="text-[10px] uppercase tracking-[0.18em] font-semibold text-ink-3">
                      {tone.label}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-ink leading-snug">{a.title}</h3>
                  <p className="text-[13px] text-ink-2 mt-1.5 leading-relaxed">{a.body}</p>
                  {a.ctaHref && a.ctaLabel && (
                    <Link
                      to={a.ctaHref}
                      onClick={() => setOpen(false)}
                      className="mt-3 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink hover:text-moss-1 transition-colors"
                    >
                      {a.ctaLabel}
                      <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M5 12h14M13 5l7 7-7 7" />
                      </svg>
                    </Link>
                  )}
                </article>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function BellIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-[18px] h-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}
