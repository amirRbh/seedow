import { useTranslation } from "react-i18next";
import type { Lang } from "@/i18n";

export function useLang() {
  const { i18n } = useTranslation();
  const raw = (i18n.resolvedLanguage || i18n.language || "fr").slice(0, 2);
  const lang: Lang = raw === "en" ? "en" : "fr";
  const setLang = (next: Lang) => {
    void i18n.changeLanguage(next);
    if (typeof document !== "undefined") {
      document.documentElement.lang = next;
    }
  };
  return { lang, setLang };
}
