import { BasePreset } from "./base";

export class DefaultPreset extends BasePreset {
  male = "Graham";
  female = "Wendy";
  default = "Luna";
  namedVoices: Record<string, string> = {
    "hyur male": "Graham",
    "hyur female": "Wendy",
    "elezen male": "Clive",
    "elezen female": "Claire",
    "lalafell male": "Abby",
    "lalafell female": "Pixie",
    "miqo'te male": "Satoshi",
    "miqo'te female": "Jing",
    "roegadyn male": "Hades",
    "roegadyn female": "Victoria",
    "hrothgar male": "Malcom",
    "hrothgar female": "Veronica",
    "viera male": "Seojun",
    "viera female": "Yoona",
    "au ra male": "Nikolai",
    "au ra female": "Elena",
  };
}
