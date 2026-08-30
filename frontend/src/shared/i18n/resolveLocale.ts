import { supportedLanguages } from "./resources";
import type { SupportedLanguage } from "./types";

export function resolveLocale(preferred: readonly string[]): SupportedLanguage {
  for (const locale of preferred) {
    const language = locale.split("-")[0].toLowerCase();
    if ((supportedLanguages as readonly string[]).includes(language)) {
      return language as SupportedLanguage;
    }
  }

  return "en";
}
