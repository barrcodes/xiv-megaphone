import { useFormContext } from "react-hook-form";
import type { PresetFormValues } from "./PresetForm";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

interface Props {
  disabled?: boolean;
}

export function GeneralTab({ disabled }: Props) {
  const { register } = useFormContext<PresetFormValues>();

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="name">Preset Name</Label>
        <Input
          id="name"
          {...register("name", { required: true })}
          disabled={disabled}
        />
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div className="space-y-1">
          <Label htmlFor="male">Male Voice</Label>
          <Input
            id="male"
            {...register("male", { required: true })}
            disabled={disabled}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="female">Female Voice</Label>
          <Input
            id="female"
            {...register("female", { required: true })}
            disabled={disabled}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="default">Default Voice</Label>
          <Input
            id="default"
            {...register("default", { required: true })}
            disabled={disabled}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="speakingRate">Speed</Label>
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
        </div>
      </div>
    </div>
  );
}
