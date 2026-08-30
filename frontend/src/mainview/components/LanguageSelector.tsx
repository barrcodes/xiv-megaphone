import { useState } from "react";
import { useTranslation } from "react-i18next";
import { i18next, synchronizeRendererLanguage } from "@/lib/i18n";
import { supportedLanguages } from "../../shared/i18n/resources";
import type { SupportedLanguage } from "../../shared/i18n/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

const languageNames: Record<SupportedLanguage, string> = {
  en: "English",
  fr: "Français",
  de: "Deutsch",
  ja: "日本語",
};

export function LanguageSelector() {
  const { t } = useTranslation();
  const [changing, setChanging] = useState(false);
  const currentLanguage = (i18next.resolvedLanguage ?? "en") as SupportedLanguage;

  async function handleChange(language: SupportedLanguage) {
    setChanging(true);
    try {
      await synchronizeRendererLanguage(language);
    } finally {
      setChanging(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="language-selector" className="text-sm text-muted-foreground">
        {t("common.language")}
      </label>
      <Select value={currentLanguage} onValueChange={handleChange} disabled={changing}>
        <SelectTrigger id="language-selector" className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {supportedLanguages.map((language) => (
            <SelectItem key={language} value={language}>
              {languageNames[language]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
