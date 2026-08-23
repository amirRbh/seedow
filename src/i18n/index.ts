import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import fr from "./locales/fr.json";
import en from "./locales/en.json";

export const SUPPORTED_LANGS = ["fr", "en"] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];

/** Clé de persistance de la langue — lue au boot, écrite par `useLang().setLang`. */
export const LANG_STORAGE_KEY = "seedow.lang";

void i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    en: { translation: en },
  },
  lng: "fr",
  fallbackLng: "fr",
  supportedLngs: SUPPORTED_LANGS as unknown as string[],
  nonExplicitSupportedLngs: true, // 'en-US' → 'en'
  interpolation: { escapeValue: false },
  returnNull: false,
});

if (typeof window !== "undefined") {
  let stored: string | null = null;
  try {
    stored = window.localStorage.getItem(LANG_STORAGE_KEY);
  } catch {
    stored = null;
  }
  if (stored === "fr" || stored === "en") {
    void i18n.changeLanguage(stored);
    // Le shell SSR rend `lang="fr"` en dur : sans cette ligne, une session
    // restaurée en anglais garde `lang="fr"` et se fait lire avec une voix
    // française (WCAG 3.1.1). `setLang` ne couvre que la bascule manuelle.
    document.documentElement.lang = stored;
  }
}

export default i18n;
