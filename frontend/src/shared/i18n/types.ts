import type { en } from "./locales/en";

export type TranslationResources = typeof en;
export type SupportedLanguage = "en" | "fr" | "de" | "ja";

export interface I18nState {
  systemLanguage: SupportedLanguage;
  selectedLanguage: SupportedLanguage | null;
  language: SupportedLanguage;
}
