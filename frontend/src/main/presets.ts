import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { app } from "electron";
import type { Preset } from "../shared/types";

const presetsDir = join(app.getPath("userData"), "presets");
const activeFile = join(app.getPath("userData"), "active.json");

export const MINIMAL_DEFAULT: Preset = {
  id: "default",
  name: "Default",
  isDefault: true,
  male: "Graham",
  female: "Wendy",
  default: "Luna",
  speakingRate: 1.25,
  namedVoices: {},
};

export function bootstrap() {
  mkdirSync(presetsDir, { recursive: true });

  if (!existsSync(activeFile)) {
    writeFileSync(
      activeFile,
      JSON.stringify({ activePresetId: "default" }, null, 2),
    );
  }
}

export function loadPresets(): Preset[] {
  const files = readdirSync(presetsDir).filter((f) => f.endsWith(".json"));
  const presets = files.map(
    (f) => JSON.parse(readFileSync(join(presetsDir, f), "utf-8")) as Preset,
  );
  return presets;
}

export function savePreset(preset: Preset): void {
  writeFileSync(
    join(presetsDir, `${preset.id}.json`),
    JSON.stringify(preset, null, 2),
  );
}

export function deletePreset(id: string): void {
  const path = join(presetsDir, `${id}.json`);
  if (!existsSync(path)) return;

  const preset = JSON.parse(readFileSync(path, "utf-8")) as Preset;
  if (preset.isDefault) return;

  unlinkSync(path);
}

export function getActivePresetId(): string {
  if (!existsSync(activeFile)) return "default";
  const data = JSON.parse(readFileSync(activeFile, "utf-8")) as {
    activePresetId: string;
  };
  return data.activePresetId;
}

export function setActivePresetId(id: string): void {
  writeFileSync(activeFile, JSON.stringify({ activePresetId: id }, null, 2));
}
