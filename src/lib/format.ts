import type { Lang } from "@/i18n";

const locale = (lang: Lang) => (lang === "en" ? "en-US" : "fr-FR");

/**
 * Évite les « -0 € » / « -0,00 % » : toute valeur qui s'arrondit à zéro
 * à la précision affichée est ramenée à zéro positif.
 */
function snapZero(value: number, digits: number): number {
  if (!Number.isFinite(value)) return value;
  const rounded = Number(value.toFixed(digits));
  return rounded === 0 ? 0 : value;
}

export function formatCurrency(amount: number, lang: Lang, currency = "EUR") {
  return new Intl.NumberFormat(locale(lang), {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(snapZero(amount, 2));
}

export function formatNumber(value: number, lang: Lang, opts: Intl.NumberFormatOptions = {}) {
  const digits = opts.maximumFractionDigits ?? 3;
  return new Intl.NumberFormat(locale(lang), opts).format(snapZero(value, digits));
}

export function formatPercent(value: number, lang: Lang, digits = 2) {
  return new Intl.NumberFormat(locale(lang), {
    style: "percent",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(snapZero(value, digits + 2));
}

export function formatDate(
  date: Date | string,
  lang: Lang,
  opts: Intl.DateTimeFormatOptions = { year: "numeric", month: "long", day: "numeric" },
) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale(lang), opts).format(d);
}
