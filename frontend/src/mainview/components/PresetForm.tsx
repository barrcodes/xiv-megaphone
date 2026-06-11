import { BookOpen, Settings, Users } from "lucide-react";
import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import type { Preset } from "shared/types";
import { GeneralTab } from "./GeneralTab";
import { LexiconTab } from "./LexiconTab";
import { NamedVoicesTab } from "./NamedVoicesTab";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

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
	const [activeTab, setActiveTab] = useState("general");

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
			lexicon: Object.entries(preset.lexicon ?? {}).map(([term, pronunciation]) => ({
				term,
				pronunciation,
			})),
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
		<form onSubmit={handleSubmit(onSubmit)} className="flex flex-col min-h-[calc(100vh-10rem)]">
			<Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
				<TabsList variant="line" className="mb-6">
					<TabsTrigger value="general" className="gap-2">
						<Settings className="size-3.5" />
						General
					</TabsTrigger>
					<TabsTrigger value="namedVoices" className="gap-2">
						<Users className="size-3.5" />
						Named Voices
					</TabsTrigger>
					<TabsTrigger value="lexicon" className="gap-2">
						<BookOpen className="size-3.5" />
						Lexicon
					</TabsTrigger>
				</TabsList>

				<TabsContent value="general">
					<FormProvider {...methods}>
						<GeneralTab disabled={!isEditable} />
					</FormProvider>
				</TabsContent>
				<TabsContent value="namedVoices">
					<FormProvider {...methods}>
						<NamedVoicesTab disabled={!isEditable} />
					</FormProvider>
				</TabsContent>
				<TabsContent value="lexicon">
					<FormProvider {...methods}>
						<LexiconTab disabled={!isEditable} />
					</FormProvider>
				</TabsContent>
			</Tabs>

			{isEditable && (
				<div className="flex gap-3 justify-end border-t border-border/40 pt-4 mt-6 sticky bottom-0 glass-panel -mx-6 px-6">
					<Button type="button" variant="outline" onClick={onCancel}>
						Cancel
					</Button>
					<Button type="submit" disabled={!isDirty || !isValid}>
						Save Changes
					</Button>
				</div>
			)}
		</form>
	);
}
