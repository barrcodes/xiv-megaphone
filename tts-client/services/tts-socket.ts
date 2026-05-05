import WebSocket from "ws";
import { SocketManager } from "./socket";
import type { IpcMessage } from "../models/IpcMessage";
import { InworldTTSService } from "./inworld";
import { DefaultPreset } from "../presets/default";
import type { AudioPlayer } from "./audio-player";
import { StreamSpeakerPlayer } from "./speaker-streamed";

const TEXT_TO_TALK_PORT = parseInt(Bun.env.TEXT_TO_TALK_PORT ?? "3000", 10);
const TEXT_TO_TALK_URL = `ws://localhost:${TEXT_TO_TALK_PORT}/Messages`;
const INWORLD_MODEL = Bun.env.INWORLD_MODEL ?? "inworld-tts-1.5-mini";

const inworld = new InworldTTSService();
const preset = new DefaultPreset();
const player: AudioPlayer = new StreamSpeakerPlayer();
let requestId = 0;

inworld.setCallbacks({
  onAudioChunk: async (requestId: number, chunk: Buffer) => {
    console.log(`Received audio chunk (${chunk.length} bytes)`);
    await player.appendStream(requestId, chunk);
  },
  onDone: async (requestId: number, audioChunks: Buffer[]) => {
    console.log("Audio stream completed");
    if (audioChunks.length === 0) return;
    console.log(`Playing audio (${Buffer.concat(audioChunks).length} bytes)`);
    await player.endStream(requestId, audioChunks);
  },
  onError: async (requestId: number, error: Error) => {
    console.error("Inworld error:", error);
  },
});

export class TtsSocket extends SocketManager {
  protected get url() {
    return TEXT_TO_TALK_URL;
  }

  protected _onOpen(): void {
    console.log("TTS WebSocket connected");
  }

  protected _onMessage(data: WebSocket.Data): void {
    try {
      const message: IpcMessage = JSON.parse(data.toString());
      this.handleMessage(message);
    } catch (error) {
      console.error("Error processing message:", error);
    }
  }

  private handleMessage(message: IpcMessage): void {
    if (message.Type === "Cancel") {
      console.log("cancel message received, stopping playback");
      inworld.cancel();
      player.stop();
      return;
    }

    if (message.Type !== "Say") {
      console.warn(`Unsupported message type: ${message.Type}`);
      return;
    }

    console.log(
      `Received message: ${message.Speaker} (${message.Voice?.Name} ${message.Race}) says "${message.Payload}""`
    );

    const text = message.Payload;
    const voice = preset.getVoice(
      message.Speaker?.toLowerCase(),
      message.Voice?.Name.toLocaleLowerCase(),
      message.Race?.toLocaleLowerCase()
    );

    player.beginStream(++requestId);
    inworld
      .speak(requestId, text, voice, INWORLD_MODEL, preset.speakingRate)
      .catch((error) => {
        console.error("Error during TTS processing:", error);
      });
  }

  protected _onClose(): void {
    console.log("TTS WebSocket disconnected");
  }
}
