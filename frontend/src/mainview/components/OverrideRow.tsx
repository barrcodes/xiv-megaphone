import { Trash2 } from "lucide-react";
import type { UseFormRegister } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { PresetFormValues } from "./PresetForm";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface Props {
  index: number;
  register: UseFormRegister<PresetFormValues>;
  onRemove: () => void;
  disabled?: boolean;
}

export function OverrideRow({ index, register, onRemove, disabled }: Props) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-[1fr_1fr_auto] gap-3 items-center px-4 py-2.5 transition-colors hover:bg-secondary/20">
      <Input
        placeholder={t("presets.sourcePlaceholder")}
        className="h-8 text-xs"
        {...register(`voiceOverrides.${index}.name`, { required: true })}
        disabled={disabled}
      />
      <Input
        placeholder={t("presets.voicePlaceholder")}
        className="h-8 text-xs"
        {...register(`voiceOverrides.${index}.voice`, { required: true })}
        disabled={disabled}
      />
      {!disabled && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-destructive"
          onClick={onRemove}
        >
          <Trash2 className="size-3.5" />
          <span className="sr-only">{t("presets.removeOverride")}</span>
        </Button>
      )}
    </div>
  );
}
