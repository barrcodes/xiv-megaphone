import { useFieldArray, useForm } from "react-hook-form";
import type { Preset } from "shared/types";
import { NamedVoiceRow } from "./NamedVoiceRow";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export type PresetFormValues = {
	name: string;
	male: string;
	female: string;
	default: string;
	speakingRate: number;
	namedVoices: { name: string; voice: string }[];
};

interface Props {
	preset: Preset;
	onSave: (preset: Preset) => void;
	onCancel: () => void;
}

export function PresetForm({ preset, onSave, onCancel }: Props) {
	const isEditable = !preset.isDefault;

	const {
		register,
		handleSubmit,
		control,
		formState: { isDirty, isValid },
	} = useForm<PresetFormValues>({
		mode: "onChange",
		disabled: !isEditable,
		defaultValues: {
			name: preset.name,
			male: preset.male,
			female: preset.female,
			default: preset.default,
			speakingRate: preset.speakingRate,
			namedVoices: Object.entries(preset.namedVoices).map(([name, voice]) => ({ name, voice })),
		},
	});

	const { fields, append, remove } = useFieldArray({ control, name: "namedVoices" });

	function onSubmit(data: PresetFormValues) {
		const namedVoices = Object.fromEntries(
			data.namedVoices.map(({ name, voice }) => [name, voice]),
		);
		onSave({ ...preset, ...data, namedVoices });
	}

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
			<div className="space-y-1">
				<Label htmlFor="name">Preset Name</Label>
				<Input id="name" {...register("name", { required: true })} />
			</div>

			<div className="grid grid-cols-4 gap-3">
				<div className="space-y-1">
					<Label htmlFor="male">Male Voice</Label>
					<Input id="male" {...register("male", { required: true })} />
				</div>
				<div className="space-y-1">
					<Label htmlFor="female">Female Voice</Label>
					<Input id="female" {...register("female", { required: true })} />
				</div>
				<div className="space-y-1">
					<Label htmlFor="default">Default Voice</Label>
					<Input id="default" {...register("default", { required: true })} />
				</div>
				<div className="space-y-1">
					<Label htmlFor="speakingRate">Speed ({preset.speakingRate}x)</Label>
					<Input
						id="speakingRate"
						type="number"
						step={0.1}
						min={0.5}
						max={3}
						{...register("speakingRate", {
							required: true,
							valueAsNumber: true,
							min: 0.5,
							max: 3,
						})}
					/>
				</div>
			</div>

			<div className="flex flex-col gap-2">
				<Label>Named Voices</Label>
				{fields.map((field, index) => (
					<NamedVoiceRow
						key={field.id}
						index={index}
						register={register}
						onRemove={() => remove(index)}
						disabled={!isEditable}
					/>
				))}
				{isEditable && (
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="mr-11"
						onClick={() => append({ name: "", voice: "" })}
					>
						+ Add
					</Button>
				)}
			</div>

			{isEditable && (
				<div className="flex gap-2 justify-end pt-2">
					<Button type="button" variant="outline" onClick={onCancel}>
						Cancel
					</Button>
					<Button type="submit" disabled={!isDirty || !isValid}>
						Save
					</Button>
				</div>
			)}
		</form>
	);
}
