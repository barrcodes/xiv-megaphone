import { useFieldArray, useFormContext } from "react-hook-form";
import type { PresetFormValues } from "./PresetForm";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { TrashIcon } from "lucide-react";

interface Props {
	disabled?: boolean;
}

export function LexiconTab({ disabled }: Props) {
	const { control, register } = useFormContext<PresetFormValues>();
	const { fields, append, remove } = useFieldArray({ control, name: "lexicon" });

	return (
		<div className="flex flex-col gap-2">
			<p className="text-sm text-muted-foreground mb-2">
				Add word pronunciations for pronunciation modifications. The original word will be replaced with the
				phonetic spelling before sending to Inworld.
			</p>
			<Label>Lexicon Entries</Label>
			{fields.map((field, index) => (
				<div key={field.id} className="flex gap-2 items-center">
					<Input
						{...register(`lexicon.${index}.term` as const, { required: true })}
						placeholder="Term (e.g., Lechat)"
						disabled={disabled}
						className="flex-1"
					/>
					<Input
						{...register(`lexicon.${index}.pronunciation` as const, { required: true })}
						placeholder="Pronunciation (e.g., Luh-shah)"
						disabled={disabled}
						className="flex-1"
					/>
					{!disabled && (
						<Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
							<TrashIcon className="h-4 w-4" />
						</Button>
					)}
				</div>
			))}
			{!disabled && (
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="self-start"
					onClick={() => append({ term: "", pronunciation: "" })}
				>
					+ Add Entry
				</Button>
			)}
		</div>
	);
}