import { useFieldArray, useFormContext } from "react-hook-form";
import type { PresetFormValues } from "./PresetForm";
import { NamedVoiceRow } from "./NamedVoiceRow";
import { Button } from "./ui/button";
import { Label } from "./ui/label";

interface Props {
	disabled?: boolean;
}

export function NamedVoicesTab({ disabled }: Props) {
	const { control, register } = useFormContext<PresetFormValues>();
	const { fields, append, remove } = useFieldArray({ control, name: "namedVoices" });

	return (
		<div className="flex flex-col gap-2">
			<Label>Named Voices</Label>
			{fields.map((field, index) => (
				<NamedVoiceRow
					key={field.id}
					index={index}
					register={register}
					onRemove={() => remove(index)}
					disabled={disabled}
				/>
			))}
			{!disabled && (
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="mr-11 self-start"
					onClick={() => append({ name: "", voice: "" })}
				>
					+ Add
				</Button>
			)}
		</div>
	);
}