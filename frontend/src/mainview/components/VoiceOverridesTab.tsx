import { Plus } from "lucide-react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { OverrideRow } from "./OverrideRow";
import type { PresetFormValues } from "./PresetForm";
import { Button } from "./ui/button";

interface Props {
  disabled?: boolean;
}

export function VoiceOverridesTab({ disabled }: Props) {
  const { t } = useTranslation();
  const { control, register } = useFormContext<PresetFormValues>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "voiceOverrides",
  });

  return (
    <div className="space-y-4 animate-fade-in-up">
      <p className="text-sm text-muted-foreground">
        {t("presets.overridesDescription", { fallbacks: "male, female, default" })}
      </p>

      {fields.length > 0 && (
        <div className="rounded-lg border border-border/40 overflow-hidden">
          <div className="grid grid-cols-[1fr_1fr_auto] gap-3 bg-secondary/30 px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <span>{t("presets.source")}</span>
            <span>{t("presets.voiceOverride")}</span>
            <span className="w-9" />
          </div>
          <div className="divide-y divide-border/30">
            {fields.map((field, index) => (
              <OverrideRow
                key={field.id}
                index={index}
                register={register}
                onRemove={() => remove(index)}
                disabled={disabled}
              />
            ))}
          </div>
        </div>
      )}

      {!disabled && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ name: "", voice: "" })}
        >
          <Plus className="size-3.5" />
          {t("presets.addOverride")}
        </Button>
      )}

      {fields.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-muted-foreground">{t("presets.noOverrides")}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {t("presets.noOverridesDescription")}
          </p>
        </div>
      )}
    </div>
  );
}
