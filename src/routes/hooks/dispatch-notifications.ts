import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  selectAlertsForDigest,
  buildAlertDigest,
  type DigestAlert,
} from "@/lib/notifications/digest";
import { sendEmail } from "@/lib/notifications/email.server";

/**
 * POST /hooks/dispatch-notifications
 *
 * Envoie par email les alertes non encore notifiées aux utilisateurs qui ont
 * activé les alertes email (opt-in). Le moteur d'alertes (trigger DB) crée les
 * alertes ; ce job les LIVRE hors-app pour faire revenir l'utilisateur.
 *
 * Auth : Authorization: Bearer <CRON_SECRET> (même contrat que les autres hooks).
 * Idempotent : ne renvoie jamais une alerte déjà marquée notified_at. Sans
 * provider email configuré, no-op (les alertes restent non notifiées, prêtes à
 * partir dès que la clé est fournie).
 */

const APP_URL = "https://seedow.life";
const SETTINGS_URL = `${APP_URL}/reglages`;
const MAX_USERS_PER_RUN = 200; // borne anti-timeout
const LOOKBACK_DAYS = 7; // on n'envoie pas un backlog trop ancien

export const Route = createFileRoute("/hooks/dispatch-notifications")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const startedAt = Date.now();

        // ── Auth ──────────────────────────────────────────────
        const token = (request.headers.get("authorization") ?? "")
          .replace(/^Bearer\s+/i, "")
          .trim();
        const expected = process.env.CRON_SECRET;
        if (!expected) return json({ error: "CRON_SECRET not configured" }, 500);
        if (!token || token !== expected) return json({ error: "Unauthorized" }, 401);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const admin = supabaseAdmin as any;

        // ── Utilisateurs opt-in ───────────────────────────────
        const { data: prefs, error: prefErr } = await admin
          .from("notification_preferences")
          .select("user_id")
          .eq("email_alerts", true);
        if (prefErr) return json({ error: `prefs: ${prefErr.message}` }, 500);
        const optedIn = new Set<string>((prefs ?? []).map((p: { user_id: string }) => p.user_id));
        if (optedIn.size === 0) {
          return json({ ok: true, users_notified: 0, alerts_sent: 0, reason: "no_opt_in" });
        }

        // ── Alertes à livrer (non notifiées, non écartées, emailables) ──
        const sinceIso = new Date(Date.now() - LOOKBACK_DAYS * 86400_000).toISOString();
        const { data: alertRows, error: alertErr } = await admin
          .from("alerts")
          .select("id, user_id, severity, title, body, cta_href, created_at")
          .is("notified_at", null)
          .is("dismissed_at", null)
          .in("severity", ["warn", "alert"])
          .gte("created_at", sinceIso)
          .order("created_at", { ascending: false })
          .limit(2000);
        if (alertErr) return json({ error: `alerts: ${alertErr.message}` }, 500);

        // ── Groupement par utilisateur opt-in ─────────────────
        const byUser = new Map<string, DigestAlert[]>();
        for (const r of (alertRows ?? []) as AlertRow[]) {
          if (!optedIn.has(r.user_id)) continue;
          const list = byUser.get(r.user_id) ?? [];
          list.push({
            id: r.id,
            severity: r.severity,
            title: r.title,
            body: r.body,
            ctaHref: r.cta_href,
            createdAt: r.created_at,
          });
          byUser.set(r.user_id, list);
        }

        let usersNotified = 0;
        let alertsSent = 0;
        let providerConfigured = true;
        const users = [...byUser.keys()].slice(0, MAX_USERS_PER_RUN);

        for (const userId of users) {
          const selected = selectAlertsForDigest(byUser.get(userId) ?? []);
          if (selected.length === 0) continue;

          // Email de l'utilisateur via l'API admin.
          const { data: userRes, error: userErr } = await admin.auth.admin.getUserById(userId);
          const email: string | undefined = userRes?.user?.email;
          if (userErr || !email) continue;

          const digest = buildAlertDigest(selected, {
            appUrl: APP_URL,
            settingsUrl: SETTINGS_URL,
          });
          if (!digest) continue;

          const result = await sendEmail({ to: email, subject: digest.subject, text: digest.text });
          if (!result.sent) {
            if (result.reason === "not_configured") providerConfigured = false;
            // On NE marque PAS notified_at : les alertes restent prêtes à partir
            // dès que le provider est configuré.
            continue;
          }

          // Marque les alertes envoyées.
          const ids = selected.map((a) => a.id);
          const { error: markErr } = await admin
            .from("alerts")
            .update({ notified_at: new Date().toISOString() })
            .in("id", ids);
          if (markErr) {
            console.error("[dispatch-notifications] mark notified failed", markErr.message);
            continue;
          }
          usersNotified += 1;
          alertsSent += ids.length;
        }

        return json({
          ok: true,
          users_notified: usersNotified,
          alerts_sent: alertsSent,
          provider_configured: providerConfigured,
          took_ms: Date.now() - startedAt,
        });
      },
    },
  },
});

interface AlertRow {
  id: string;
  user_id: string;
  severity: "info" | "warn" | "alert";
  title: string;
  body: string;
  cta_href: string | null;
  created_at: string;
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
