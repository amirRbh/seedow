/**
 * Envoi d'email transactionnel — SERVER ONLY. Provider : Resend (HTTP simple,
 * pas de dépendance native → compatible edge Cloudflare/Vercel).
 *
 * Gate de configuration : tant que `RESEND_API_KEY` / `EMAIL_FROM` ne sont pas
 * définis (secrets d'environnement), l'envoi est un NO-OP explicite et loggé.
 * Le code est donc mergeable et sûr sans provider — il s'active dès que la clé
 * est fournie, sans toucher au code. Aucun secret en clair dans le repo (§6).
 */

export type SendEmailResult =
  | { sent: true; id?: string }
  | { sent: false; reason: "not_configured" | "provider_error"; detail?: string };

export interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
}

/**
 * Envoie un email via Resend si le provider est configuré, sinon no-op loggé.
 * Ne throw jamais : un échec d'email ne doit pas casser le job de dispatch.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    // Pas de provider : on ne prétend pas avoir envoyé. Le job continue.
    console.info("[email] provider non configuré (RESEND_API_KEY/EMAIL_FROM absents) — no-op");
    return { sent: false, reason: "not_configured" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: input.to,
        subject: input.subject,
        text: input.text,
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[email] provider error", res.status, detail.slice(0, 300));
      return { sent: false, reason: "provider_error", detail: `${res.status}` };
    }

    const json = (await res.json().catch(() => ({}))) as { id?: string };
    return { sent: true, id: json.id };
  } catch (err) {
    console.error("[email] send failed", err);
    return {
      sent: false,
      reason: "provider_error",
      detail: err instanceof Error ? err.message : "unknown",
    };
  }
}
