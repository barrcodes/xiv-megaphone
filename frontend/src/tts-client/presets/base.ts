import { beastTribeNpcs, beastTribes } from "./beastTribeNpcs";
import { customVoices } from "./customVoices";

export abstract class BasePreset {
  abstract male: string;
  abstract female: string;
  abstract default: string;
  speakingRate = 2;
  namedVoices: Record<string, string> = {};
  lexicon: Record<string, string> = {};

  applyLexicon(text: string): string {
    for (const [word, replacement] of Object.entries(this.lexicon)) {
      text = text.replaceAll(word, replacement);
    }
    return text;
  }

  getVoice(
    speaker?: string | null,
    gender?: string | null,
    race?: string | null
  ): string {
    console.log(
      `Selecting voice for speaker="${speaker}", gender="${gender}", race="${race}"`
    );

    const voice =
      this.getSpeakerVoice(speaker) ??
      this.getBeastVoice(speaker) ??
      this.getRaceVoice(race, gender) ??
      this.getGenderFallbackVoice(gender) ??
      this.default;

    console.log(`Selected voice: ${voice}`);

    return voice;
  }

  getSpeakerVoice(speaker?: string | null): string | undefined {
    return speaker ? this.namedVoices[speaker] : undefined;
  }

  getRaceVoice(
    race?: string | null,
    gender?: string | null
  ): string | undefined {
    return race && gender ? this.namedVoices[`${race} ${gender}`] : undefined;
  }

  getBeastVoice(speaker?: string | null): string | undefined {
    if (!speaker) return undefined;
    const beastNpc = beastTribeNpcs.find(
      (npc) => npc.name.toLowerCase() === speaker?.toLowerCase()
    );
    const race = beastNpc ? beastNpc.race.toLowerCase() : undefined;
    const voiceName = race ? this.namedVoices[race] : undefined;
    return customVoices[voiceName ?? ""] ?? voiceName;
  }

  getGenderFallbackVoice(gender?: string | null): string | undefined {
    return gender?.toLowerCase() === "male"
      ? this.male
      : gender?.toLowerCase() === "female"
        ? this.female
        : undefined;
  }
}
