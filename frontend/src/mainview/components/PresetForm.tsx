import { BookOpen, Settings, Users } from "lucide-react";
import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import type { Preset } from "shared/types";
import { GeneralTab } from "./GeneralTab";
import { LexiconTab } from "./LexiconTab";
import { VoiceOverridesTab } from "./VoiceOverridesTab";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

export type PresetFormValues = {
  name: string;
  speakingRate: number;
  voiceOverrides: { name: string; voice: string }[];
  lexicon: { term: string; pronunciation: string }[];
};

interface Props {
  preset: Preset;
  onSave: (preset: Preset) => void;
  onCancel: () => void;
  readOnly?: boolean;
}

export function PresetForm({ preset, onSave, onCancel, readOnly }: Props) {
  const [activeTab, setActiveTab] = useState("general");

  const methods = useForm<PresetFormValues>({
    mode: "onChange",
    disabled: readOnly,
    defaultValues: {
      name: preset.name,
      speakingRate: preset.speakingRate,
      voiceOverrides: Object.entries(preset.voiceOverrides).map(
        ([name, voice]) => ({ name, voice }),
      ),
      lexicon: Object.entries(preset.lexicon ?? {}).map(
        ([term, pronunciation]) => ({
          term,
          pronunciation,
        }),
      ),
    },
  });

  const {
    handleSubmit,
    formState: { isDirty, isValid },
  } = methods;

  function onSubmit(data: PresetFormValues) {
    const voiceOverrides = Object.fromEntries(
      data.voiceOverrides.map(({ name, voice }) => [name, voice]),
    );
    const lexicon = Object.fromEntries(
      data.lexicon.map(({ term, pronunciation }) => [term, pronunciation]),
    );
    onSave({ ...preset, ...data, voiceOverrides, lexicon });
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col min-h-[calc(100vh-10rem)]"
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
        <TabsList variant="line" className="mb-6">
          <TabsTrigger value="general" className="gap-2">
            <Settings className="size-3.5" />
            General
          </TabsTrigger>
          <TabsTrigger value="overrides" className="gap-2">
            <Users className="size-3.5" />
            Overrides
          </TabsTrigger>
          <TabsTrigger value="lexicon" className="gap-2">
            <BookOpen className="size-3.5" />
            Lexicon
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <FormProvider {...methods}>
            <GeneralTab disabled={readOnly} />
          </FormProvider>
        </TabsContent>
        <TabsContent value="overrides">
          <FormProvider {...methods}>
            <VoiceOverridesTab disabled={readOnly} />
          </FormProvider>
        </TabsContent>
        <TabsContent value="lexicon">
          <FormProvider {...methods}>
            <LexiconTab disabled={readOnly} />
          </FormProvider>
        </TabsContent>
      </Tabs>

      <div className="flex gap-3 justify-end border-t rounded-lg border-border/40 p-4 mt-6 sticky bottom-6 glass-panel -mx-6 px-6">
        <Button type="button" variant="outline" onClick={onCancel}>
          {readOnly ? "Close" : "Cancel"}
        </Button>
        {!readOnly && (
          <Button type="submit" disabled={!isDirty || !isValid}>
            Save Changes
          </Button>
        )}
      </div>
    </form>
  );
}
