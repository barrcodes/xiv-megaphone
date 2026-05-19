import { useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import type { Preset } from "shared/types";
import { GeneralTab } from "./GeneralTab";
import { NamedVoicesTab } from "./NamedVoicesTab";
import { LexiconTab } from "./LexiconTab";
import { Button } from "./ui/button";

export type PresetFormValues = {
	name: string;
	male: string;
	female: string;
	default: string;
	speakingRate: number;
	namedVoices: { name: string; voice: string }[];
	lexicon: { term: string; pronunciation: string }[];
};

interface Props {
	preset: Preset;
	onSave: (preset: Preset) => void;
	onCancel: () => void;
}

export function PresetForm({ preset, onSave, onCancel }: Props) {
	const isEditable = !preset.isDefault;
	const [activeTab, setActiveTab] = useState<"general" | "namedVoices" | "lexicon">("general");

	const methods = useForm<PresetFormValues>({
		mode: "onChange",
		disabled: !isEditable,
		defaultValues: {
			name: preset.name,
			male: preset.male,
			female: preset.female,
			default: preset.default,
			speakingRate: preset.speakingRate,
			namedVoices: Object.entries(preset.namedVoices).map(([name, voice]) => ({ name, voice })),
			lexicon: Object.entries(preset.lexicon ?? {}).map(([term, pronunciation]) => ({ term, pronunciation })),
		},
	});

	const {
		handleSubmit,
		formState: { isDirty, isValid },
	} = methods;

	function onSubmit(data: PresetFormValues) {
		const namedVoices = Object.fromEntries(
			data.namedVoices.map(({ name, voice }) => [name, voice]),
		);
		const lexicon = Object.fromEntries(
			data.lexicon.map(({ term, pronunciation }) => [term, pronunciation]),
		);
		onSave({ ...preset, ...data, namedVoices, lexicon });
	}

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="flex flex-col min-h-[calc(100vh-8rem)]">
			<div className="flex border-b mb-4">
				<button
					type="button"
					onClick={() => setActiveTab("general")}
					className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
						activeTab === "general"
							? "border-primary text-foreground"
							: "border-transparent text-muted-foreground hover:text-foreground"
					}`}
				>
					General
				</button>
				<button
					type="button"
					onClick={() => setActiveTab("namedVoices")}
					className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
						activeTab === "namedVoices"
							? "border-primary text-foreground"
							: "border-transparent text-muted-foreground hover:text-foreground"
					}`}
				>
					Named Voices
				</button>
				<button
					type="button"
					onClick={() => setActiveTab("lexicon")}
					className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
						activeTab === "lexicon"
							? "border-primary text-foreground"
							: "border-transparent text-muted-foreground hover:text-foreground"
					}`}
				>
					Lexicon
				</button>
			</div>

			<div className="flex-1 overflow-auto">
				<FormProvider {...methods}>
					{activeTab === "general" && <GeneralTab disabled={!isEditable} />}
					{activeTab === "namedVoices" && <NamedVoicesTab disabled={!isEditable} />}
					{activeTab === "lexicon" && <LexiconTab disabled={!isEditable} />}
				</FormProvider>
			</div>

			{isEditable && (
				<div className="flex gap-2 justify-end border-t p-4 sticky bottom-0 bg-background mt-4">
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