export abstract class BasePreset {
  abstract male: string;
  abstract female: string;
  abstract default: string;
  speakingRate = 1.2;
  namedVoices: Record<string, string> = {};

  getVoice(
    speaker?: string | null,
    gender?: string | null,
    race?: string | null
  ): string {
    console.log(
      `Selecting voice for speaker="${speaker}", gender="${gender}", race="${race}"`
    );

    const speakerVoice = speaker ? this.namedVoices[speaker] : undefined;

    const genderVoice =
      gender?.toLowerCase() === "male"
        ? this.male
        : gender?.toLowerCase() === "female"
        ? this.female
        : undefined;

    const raceVoice =
      race && gender ? this.namedVoices[`${race} ${gender}`] : undefined;

    const voice = speakerVoice ?? raceVoice ?? genderVoice ?? this.default;
    console.log(
      `speaker="${speakerVoice}", gender="${genderVoice}", race="${raceVoice}", default="${this.default}. selected="${voice}"`
    );

    return voice;
  }
}
