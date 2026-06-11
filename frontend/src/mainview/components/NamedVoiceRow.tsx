import { Trash2 } from "lucide-react";
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
		<div className="grid grid-cols-[1fr_1fr_auto] gap-3 items-center px-4 py-2.5 transition-colors hover:bg-secondary/20">
			<Input
				placeholder="e.g. Hyur Male, Alphinaud"
				className="h-8"
				{...register(`namedVoices.${index}.name`, { required: true })}
			/>
			<Input
				placeholder="e.g. Graham, Clive"
				className="h-8"
				{...register(`namedVoices.${index}.voice`, { required: true })}
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
				</Button>
			)}
		</div>
	);
}
