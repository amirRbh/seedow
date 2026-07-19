/**
 * Monitoring d'erreurs client, sans dépendance tierce (pas de Sentry/DSN requis).
 * Capture les erreurs JS non gérées et les promesses rejetées, les envoie à
 * `logClientError` (best-effort, jamais bloquant) et les rend visibles dans
 * l'admin bêta (`clientErrors24h` sur /admin/beta).
 *
 * Pour brancher un vrai APM plus tard (Sentry, etc.), c'est le seul fichier à
 * modifier : remplacer le corps de `report()` par le SDK choisi.
 */
import { supabase } from "@/integrations/supabase/client";
import { logClientError } from "@/lib/beta/beta.functions";

const seen = new Set<string>();
const MAX_DISTINCT_ERRORS_PER_SESSION = 25;

function dedupeKey(message: string, stack?: string): string {
  return `${message}::${(stack ?? "").slice(0, 200)}`;
}

async function report(message: string, stack?: string, context?: Record<string, unknown>) {
  const key = dedupeKey(message, stack);
  if (seen.has(key) || seen.size >= MAX_DISTINCT_ERRORS_PER_SESSION) return;
  seen.add(key);

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    await logClientError({
      data: {
        message: message.slice(0, 2000),
        stack: stack?.slice(0, 8000),
        url: typeof window !== "undefined" ? window.location.href : undefined,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        context,
      },
      ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
    });
  } catch {
    // Best-effort : on ne journalise jamais une erreur de journalisation dans une boucle.
  }
}

let installed = false;

/** À appeler une seule fois, côté client, au montage de l'app. */
export function installGlobalErrorReporting() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  window.addEventListener("error", (event) => {
    void report(event.message || "Unknown error", event.error?.stack, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const message = reason instanceof Error ? reason.message : String(reason);
    const stack = reason instanceof Error ? reason.stack : undefined;
    void report(message || "Unhandled promise rejection", stack, { kind: "unhandledrejection" });
  });
}

/** À appeler explicitement depuis un error boundary React. */
export function reportReactError(error: Error, componentStack?: string) {
  void report(error.message, error.stack, { kind: "react_error_boundary", componentStack });
}

/**
 * À appeler depuis n'importe quel catch qui avalerait sinon l'erreur en
 * silence (un `try/catch` local ne remonte jamais à `window.onerror` ni
 * `unhandledrejection`, même si l'erreur n'est affichée nulle part à
 * l'utilisateur). Convention unique pour tous les catch "best-effort".
 */
export function reportCaughtError(error: unknown, context?: Record<string, unknown>) {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  void report(message, stack, { kind: "caught", ...context });
}
