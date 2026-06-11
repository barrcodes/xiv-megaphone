import type { Preset } from "./types";

export const DEFAULT_PORT = 57575;

/**
 * As reasonable of defaults as I could come up with from Inworld's built-in voices.
 */
export const DEFAULT_PRESET: Preset = {
  id: "default",
  name: "Default Premium",
  isDefault: true,
  male: "Graham",
  female: "Wendy",
  default: "Luna",
  speakingRate: 1.25,
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
    "hrothgar male": "Malcolm",
    "hrothgar female": "Veronica",
    "viera male": "Seojun",
    "viera female": "Yoona",
    "au ra male": "Nikolai",
    "au ra female": "Elena",

    // Beast Tribes
    "amalj'aa": "Smaug",
    sylph: "Pixie",
    kobold: "Blitzkin",
    sahagin: "Medusa",
    ixal: "Xartan",
    vanu_vanu: "Grimalda",
    gnath: "Chitter",
    moogle: "Pixie",
    kojin: "Smaug",
    ananta: "Medusa",
    namazu: "Pixie",
    pixie: "Pixie",
    qiqirn: "Blitzkin",
    matanga: "Hades",
    omicron: "Dominus",
    goblin: "Blitzkin",
    mamool_ja: "Xartan",
    dragon: "Smaug",
    lupin: "Hades",
    bangaa: "Xartan",
    seeq: "Hades",
    nu_mou: "Abby",
    loporrit: "Pixie",
    ea: "Luna",
    karellian: "Stroud",
    grebuloff: "Pixie",
    nibirun: "Dennis",
    gordhonite: "Dominus",
  },
};
