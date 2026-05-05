import type { UseFormRegister } from "react-hook-form";
import type { PresetFormValues } from "./PresetForm";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface Props {
	index: number;
	register: UseFormRegister<PresetFormValues>;
	onRemove: () => void;
	disabled?: boolean;
}

export function NamedVoiceRow({ index, register, onRemove, disabled }: Props) {
	return (
		<div className="flex gap-2 items-center">
			<Input
				placeholder="Character name"
				className="flex-1"
				{...register(`namedVoices.${index}.name`, { required: true })}
			/>
			<Input
				placeholder="Voice"
				className="flex-1"
				{...register(`namedVoices.${index}.voice`, { required: true })}
			/>
			{!disabled && (
				<Button type="button" variant="ghost" size="sm" onClick={onRemove}>
					✕
				</Button>
			)}
		</div>
	);
}
