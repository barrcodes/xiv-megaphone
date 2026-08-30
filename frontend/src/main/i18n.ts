import { app } from "electron";
import i18next from "i18next";
import { resolveLocale } from "../shared/i18n/resolveLocale";
import { resources, supportedLanguages } from "../shared/i18n/resources";
import type { I18nState, SupportedLanguage } from "../shared/i18n/types";
import { getLanguage } from "./config";

let state: I18nState;

export async function initializeMainI18n(): Promise<void> {
  const storedLanguage = await getLanguage();
  const selectedLanguage = (supportedLanguages as readonly string[]).includes(storedLanguage ?? "")
    ? (storedLanguage as SupportedLanguage)
    : null;
  const systemLanguage = resolveLocale([app.getLocale(), ...app.getPreferredSystemLanguages()]);
  const language = selectedLanguage ?? systemLanguage;

  await i18next.init({
    lng: language,
    fallbackLng: "en",
    supportedLngs: supportedLanguages,
    resources,
    interpolation: { escapeValue: false },
  });

  state = { systemLanguage, selectedLanguage, language };
}

export function getI18nState(): I18nState {
  if (!state) throw new Error("Main i18n has not been initialized");
  return state;
}

export async function setMainLanguage(language: SupportedLanguage | null): Promise<I18nState> {
  const systemLanguage = resolveLocale([app.getLocale(), ...app.getPreferredSystemLanguages()]);
  const selectedLanguage = language;
  const resolvedLanguage = selectedLanguage ?? systemLanguage;
  await i18next.changeLanguage(resolvedLanguage);
  state = { systemLanguage, selectedLanguage, language: resolvedLanguage };
  return state;
}

export function translate(key: string, options?: Record<string, unknown>): string {
  return i18next.t(key, options);
}
