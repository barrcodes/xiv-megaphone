import { Plus, Trash2 } from "lucide-react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { PresetFormValues } from "./PresetForm";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface Props {
  disabled?: boolean;
}

export function LexiconTab({ disabled }: Props) {
  const { t } = useTranslation();
  const { control, register } = useFormContext<PresetFormValues>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "lexicon",
  });

  return (
    <div className="space-y-4 animate-fade-in-up">
      <p className="text-sm text-muted-foreground">{t("presets.lexiconDescription")}</p>

      {fields.length > 0 && (
        <div className="rounded-lg border border-border/40 overflow-hidden">
          <div className="grid grid-cols-[1fr_1fr_auto] gap-3 bg-secondary/30 px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <span>{t("presets.term")}</span>
            <span>{t("presets.pronunciation")}</span>
            <span className="w-9" />
          </div>
          <div className="divide-y divide-border/30">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="grid grid-cols-[1fr_1fr_auto] gap-3 items-center px-4 py-2.5 transition-colors hover:bg-secondary/20"
              >
                <Input
                  {...register(`lexicon.${index}.term` as const, {
                    required: true,
                  })}
                  placeholder={t("presets.termPlaceholder")}
                  disabled={disabled}
                  className="h-8"
                />
                <Input
                  {...register(`lexicon.${index}.pronunciation` as const, {
                    required: true,
                  })}
                  placeholder={t("presets.pronunciationPlaceholder")}
                  disabled={disabled}
                  className="h-8"
                />
                {!disabled && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="size-3.5" />
                    <span className="sr-only">{t("presets.removeEntry")}</span>
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!disabled && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ term: "", pronunciation: "" })}
        >
          <Plus className="size-3.5" />
          {t("presets.addEntry")}
        </Button>
      )}

      {fields.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-muted-foreground">{t("presets.noLexicon")}</p>
          <p className="text-xs text-muted-foreground mt-1">{t("presets.noLexiconDescription")}</p>
        </div>
      )}
    </div>
  );
}
