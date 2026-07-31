import { useFormContext } from "react-hook-form";
import type { PresetFormValues } from "./PresetForm";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";

interface Props {
  disabled?: boolean;
}

export function GeneralTab({ disabled }: Props) {
  const { register } = useFormContext<PresetFormValues>();

  return (
    <div className="space-y-5 animate-fade-in-up">
      <Card>
        <CardHeader>
          <CardTitle>Preset Name</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            id="name"
            {...register("name", { required: true })}
            disabled={disabled}
            placeholder="My Custom Preset"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Speaking Speed</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            id="speakingRate"
            type="number"
            min={0.5}
            max={1.5}
            step="0.05"
            {...register("speakingRate", {
              required: true,
              valueAsNumber: true,
              min: 0.5,
              max: 1.5,
            })}
            disabled={disabled}
          />
          <p className="text-xs text-muted-foreground mt-1">Range: 0.5x to 1.5x</p>
        </CardContent>
      </Card>
    </div>
  );
}
