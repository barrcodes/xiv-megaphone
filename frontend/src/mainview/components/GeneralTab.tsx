import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { PresetFormValues } from "./PresetForm";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";

interface Props {
  disabled?: boolean;
}

export function GeneralTab({ disabled }: Props) {
  const { t } = useTranslation();
  const { register } = useFormContext<PresetFormValues>();

  return (
    <div className="space-y-5 animate-fade-in-up">
      <Card>
        <CardHeader>
          <CardTitle>{t("presets.presetName")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            id="name"
            {...register("name", { required: true })}
            disabled={disabled}
            placeholder={t("presets.presetNamePlaceholder")}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("presets.speakingSpeed")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            id="speakingRate"
            type="number"
            min={0.5}
            max={2.0}
            step="0.05"
            {...register("speakingRate", {
              required: true,
              valueAsNumber: true,
              min: 0.5,
              max: 2.0,
            })}
            disabled={disabled}
          />
          <p className="text-xs text-muted-foreground mt-1">{t("presets.speedRange")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
