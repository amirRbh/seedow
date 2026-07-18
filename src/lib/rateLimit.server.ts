import { getRequest } from "@tanstack/react-start/server";

/** Hash non-réversible d'une IP pour la clé de rate-limit (pas de PII stockée en clair). */
export async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(ip);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** IP du visiteur courant, pour clé de rate-limit sur les endpoints publics (sans auth). */
export function clientIp(): string {
  const request = getRequest();
  const fwd = request?.headers?.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request?.headers?.get("cf-connecting-ip") ?? "unknown";
}
