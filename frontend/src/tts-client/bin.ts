import { TtsSocket } from "./services/tts-socket";
import { DefaultPreset } from "./presets/default";

const port = parseInt(process.env.TEXT_TO_TALK_PORT ?? "3000", 10);
const apiKey = process.env.INWORLD_API_KEY ?? process.env.INWORLD_KEY ?? "";
const model = process.env.INWORLD_MODEL ?? "inworld-tts-1.5-mini";

new TtsSocket({
  port,
  preset: new DefaultPreset(),
  apiKey,
  model,
});