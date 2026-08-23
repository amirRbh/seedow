import { useTranslation } from "react-i18next";
import { LANG_STORAGE_KEY, type Lang } from "@/i18n";

/**
 * Applique la langue au document. `<html lang>` porte l'information au lecteur
 * d'écran (WCAG 3.1.1) : sans ça, du contenu anglais est prononcé avec la voix
 * française héritée du shell SSR.
 */
function applyLang(next: Lang) {
  if (typeof document !== "undefined") {
    document.documentElement.lang = next;
  }
  try {
    window.localStorage.setItem(LANG_STORAGE_KEY, next);
  } catch {
    // Stockage indisponible (navigation privée) : la langue tient le temps
    // de la session, ce qui vaut mieux que de casser la bascule.
  }
}

export function useLang() {
  const { i18n } = useTranslation();
  const raw = (i18n.resolvedLanguage || i18n.language || "fr").slice(0, 2);
  const lang: Lang = raw === "en" ? "en" : "fr";
  const setLang = (next: Lang) => {
    void i18n.changeLanguage(next);
    applyLang(next);
  };
  return { lang, setLang };
}
