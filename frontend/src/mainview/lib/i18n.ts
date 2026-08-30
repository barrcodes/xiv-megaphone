import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import { resolveLocale } from "../../shared/i18n/resolveLocale";
import { resources, supportedLanguages } from "../../shared/i18n/resources";
import type { SupportedLanguage } from "../../shared/i18n/types";

export async function initializeRendererI18n(): Promise<void> {
  const state = await window.electronAPI.getI18nState();
  const language = state.language ?? resolveLocale(navigator.languages ?? [navigator.language]);

  await i18next.use(initReactI18next).init({
    lng: language,
    fallbackLng: "en",
    supportedLngs: supportedLanguages,
    resources,
    interpolation: { escapeValue: false },
  });
}

export async function synchronizeRendererLanguage(language: SupportedLanguage) {
  const state = await window.electronAPI.setLanguage(language);
  await i18next.changeLanguage(state.language);
  return state;
}

export { i18next };
