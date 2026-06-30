import { BasePreset } from "./base";
import type { Preset } from "../../shared/types";

export class ConfigurablePreset extends BasePreset {
  male: string;
  female: string;
  default: string;
  namedVoices: Record<string, string>;
  speakingRate: number;

  constructor(preset: Preset) {
    super();
    this.male = preset.male;
    this.female = preset.female;
    this.default = preset.default;
    this.namedVoices = preset.namedVoices;
    this.speakingRate = preset.speakingRate;
    this.lexicon = preset.lexicon ?? {};
  }
}
