/**
 * Construction du digest email d'alertes — logique PURE (aucune I/O), testable.
 *
 * On n'envoie par email que les alertes qui MÉRITENT de faire revenir l'utilisateur
 * (sévérité warn/alert), jamais les simples infos. Le contenu reste factuel et
 * sobre (ton de marque, §7) — pas d'urgence fabriquée, pas de clickbait. L'email
 * porte toujours un lien de désinscription (géré par l'appelant), jamais de dark
 * pattern (§1.5).
 */

export type DigestSeverity = "info" | "warn" | "alert";

export interface DigestAlert {
  id: string;
  severity: DigestSeverity;
  title: string;
  body: string;
  ctaHref?: string | null;
  createdAt: string; // ISO
}

const SEVERITY_RANK: Record<DigestSeverity, number> = { alert: 3, warn: 2, info: 1 };

/** Sévérités qui justifient un email (l'info reste in-app uniquement). */
export const EMAILABLE_SEVERITIES: ReadonlySet<DigestSeverity> = new Set(["warn", "alert"]);

/** Nombre max d'alertes détaillées dans un digest (le reste est résumé en compteur). */
export const DEFAULT_DIGEST_MAX = 8;

/**
 * Sélectionne et ordonne les alertes à inclure dans un digest email.
 * L'appelant a déjà filtré sur `notified_at IS NULL` / `dismissed_at IS NULL` :
 * ici on ne garde que les sévérités emailables, triées (plus grave d'abord, puis
 * plus récent), et on borne le nombre.
 */
export function selectAlertsForDigest(
  alerts: DigestAlert[],
  max: number = DEFAULT_DIGEST_MAX,
): DigestAlert[] {
  return alerts
    .filter((a) => EMAILABLE_SEVERITIES.has(a.severity))
    .sort((a, b) => {
      const s = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
      if (s !== 0) return s;
      return b.createdAt.localeCompare(a.createdAt);
    })
    .slice(0, Math.max(0, max));
}

export interface DigestContent {
  subject: string;
  text: string;
}

interface DigestStrings {
  subjectOne: (title: string) => string;
  subjectMany: (n: number) => string;
  intro: string;
  ctaWord: string;
  footer: (settingsUrl: string) => string;
}

const STRINGS: Record<"fr" | "en", DigestStrings> = {
  fr: {
    subjectOne: (title) => `Seedow · ${title}`,
    subjectMany: (n) => `Seedow · ${n} signaux sur tes investissements`,
    intro: "Voici ce qui a bougé sur les actifs que tu suis :",
    ctaWord: "Voir",
    footer: (url) =>
      `Tu reçois cet email parce que tu as activé les alertes. Gérer ou désactiver : ${url}`,
  },
  en: {
    subjectOne: (title) => `Seedow · ${title}`,
    subjectMany: (n) => `Seedow · ${n} signals on your investments`,
    intro: "Here's what changed on the assets you follow:",
    ctaWord: "View",
    footer: (url) => `You get this email because you enabled alerts. Manage or turn off: ${url}`,
  },
};

/**
 * Construit le contenu texte du digest à partir d'alertes déjà sélectionnées.
 * Renvoie null si rien à envoyer (sécurité : on n'envoie jamais un email vide).
 *
 * @param appUrl      Base URL de l'app (pour préfixer les liens relatifs des CTA).
 * @param settingsUrl Lien de gestion/désinscription (obligatoire, anti-dark-pattern).
 */
export function buildAlertDigest(
  alerts: DigestAlert[],
  opts: { lang?: "fr" | "en"; appUrl: string; settingsUrl: string },
): DigestContent | null {
  if (alerts.length === 0) return null;
  const s = STRINGS[opts.lang === "en" ? "en" : "fr"];

  const subject =
    alerts.length === 1 ? s.subjectOne(alerts[0].title) : s.subjectMany(alerts.length);

  const lines: string[] = [s.intro, ""];
  for (const a of alerts) {
    lines.push(`• ${a.title}`);
    if (a.body) lines.push(`  ${a.body}`);
    if (a.ctaHref) lines.push(`  ${s.ctaWord} : ${absoluteUrl(opts.appUrl, a.ctaHref)}`);
    lines.push("");
  }
  lines.push(s.footer(opts.settingsUrl));

  return { subject, text: lines.join("\n") };
}

/** Préfixe un href relatif par l'URL de l'app ; laisse une URL absolue intacte. */
function absoluteUrl(appUrl: string, href: string): string {
  if (/^https?:\/\//i.test(href)) return href;
  return `${appUrl.replace(/\/$/, "")}/${href.replace(/^\//, "")}`;
}
