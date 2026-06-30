import { Plus, Trash2 } from "lucide-react";
import { useFieldArray, useFormContext } from "react-hook-form";
import type { PresetFormValues } from "./PresetForm";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface Props {
	disabled?: boolean;
}

export function LexiconTab({ disabled }: Props) {
	const { control, register } = useFormContext<PresetFormValues>();
	const { fields, append, remove } = useFieldArray({ control, name: "lexicon" });

	return (
		<div className="space-y-4 animate-fade-in-up">
			<p className="text-sm text-muted-foreground">
				Add word pronunciations. The original word will be replaced with the phonetic spelling
				before sending to TTS.
			</p>

			{fields.length > 0 && (
				<div className="rounded-lg border border-border/40 overflow-hidden">
					<div className="grid grid-cols-[1fr_1fr_auto] gap-3 bg-secondary/30 px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
						<span>Term</span>
						<span>Pronunciation</span>
						<span className="w-9" />
					</div>
					<div className="divide-y divide-border/30">
						{fields.map((field, index) => (
							<div
								key={field.id}
								className="grid grid-cols-[1fr_1fr_auto] gap-3 items-center px-4 py-2.5 transition-colors hover:bg-secondary/20"
							>
								<Input
									{...register(`lexicon.${index}.term` as const, { required: true })}
									placeholder="e.g. Lechat"
									disabled={disabled}
									className="h-8"
								/>
								<Input
									{...register(`lexicon.${index}.pronunciation` as const, { required: true })}
									placeholder="e.g. Luh-shah"
									disabled={disabled}
									className="h-8"
								/>
								{!disabled && (
									<Button
										type="button"
										variant="ghost"
										size="icon-sm"
										className="text-muted-foreground hover:text-destructive"
										onClick={() => remove(index)}
									>
										<Trash2 className="size-3.5" />
									</Button>
								)}
							</div>
						))}
					</div>
				</div>
			)}

			{!disabled && (
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() => append({ term: "", pronunciation: "" })}
				>
					<Plus className="size-3.5" />
					Add Entry
				</Button>
			)}

			{fields.length === 0 && (
				<div className="flex flex-col items-center justify-center py-12 text-center">
					<p className="text-sm text-muted-foreground">No lexicon entries yet.</p>
					<p className="text-xs text-muted-foreground mt-1">
						Add pronunciation overrides for FFXIV terms.
					</p>
				</div>
			)}
		</div>
	);
}
