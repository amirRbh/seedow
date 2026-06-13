import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import fr from "./locales/fr.json";
import en from "./locales/en.json";

export const SUPPORTED_LANGS = ["fr", "en"] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: fr },
      en: { translation: en },
    },
    fallbackLng: "fr",
    supportedLngs: SUPPORTED_LANGS as unknown as string[],
    nonExplicitSupportedLngs: true, // 'en-US' → 'en'
    interpolation: { escapeValue: false },
    nsSeparator: false,
    keySeparator: ".",
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "seedow.lang",
      caches: ["localStorage"],
    },
    returnNull: false,
  });

export default i18n;
