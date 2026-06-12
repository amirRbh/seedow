import type { Lang } from "@/i18n";

const locale = (lang: Lang) => (lang === "en" ? "en-US" : "fr-FR");

export function formatCurrency(amount: number, lang: Lang, currency = "EUR") {
  return new Intl.NumberFormat(locale(lang), {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(value: number, lang: Lang, opts: Intl.NumberFormatOptions = {}) {
  return new Intl.NumberFormat(locale(lang), opts).format(value);
}

export function formatPercent(value: number, lang: Lang, digits = 2) {
  return new Intl.NumberFormat(locale(lang), {
    style: "percent",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatDate(date: Date | string, lang: Lang, opts: Intl.DateTimeFormatOptions = { year: "numeric", month: "long", day: "numeric" }) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale(lang), opts).format(d);
}
