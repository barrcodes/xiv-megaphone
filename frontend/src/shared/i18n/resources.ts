import { de } from "./locales/de";
import { en } from "./locales/en";
import { fr } from "./locales/fr";
import { ja } from "./locales/ja";

export const resources = {
  en: { translation: en },
  fr: { translation: fr },
  de: { translation: de },
  ja: { translation: ja },
} as const;

export const supportedLanguages = ["en", "fr", "de", "ja"] as const;
