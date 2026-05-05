import type { Preset } from "./types";

export const DEFAULT_PORT = 57575;

export const DEFAULT_PRESET: Preset = {
	id: "default",
	name: "Default",
	isDefault: true,
	male: "Graham",
	female: "Wendy",
	default: "Luna",
	namedVoices: {
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
		"au ra female": "Elena"
	}
};
