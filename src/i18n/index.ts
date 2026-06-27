import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import fr from "./locales/fr.json";
import en from "./locales/en.json";

export const SUPPORTED_LANGS = ["fr", "en"] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];

void i18n
  .use(initReactI18next)
  .init({
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
  const stored = window.localStorage.getItem("seedow.lang");
  if (stored === "fr" || stored === "en") {
    void i18n.changeLanguage(stored);
  }
}

export default i18n;
