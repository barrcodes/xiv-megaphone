import WebSocket from "ws";
import { SocketManager } from "./socket";
import type { IpcMessage } from "../models/IpcMessage";
import { InworldTTSService } from "./inworld";
import type { BasePreset } from "../presets/base";
import type { AudioPlayer } from "./audio-player";
import { StreamSpeakerPlayer } from "./speaker-streamed";

export interface TtsSocketOptions {
  port: number;
  preset: BasePreset;
  apiKey: string;
  model?: string;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

export class TtsSocket extends SocketManager {
  private inworld: InworldTTSService;
  private preset: BasePreset;
  private player: AudioPlayer;
  private model: string;
  private requestId = 0;

  constructor(options: TtsSocketOptions) {
    super(`ws://localhost:${options.port}/Messages`);
    this.preset = options.preset;
    this.model = options.model ?? "inworld-tts-1.5-mini";
    this.inworld = new InworldTTSService(options.apiKey);
    this.player = new StreamSpeakerPlayer();

    this.onOpen = options.onConnected ?? null;
    this.onClose = options.onDisconnected ?? null;

    this.inworld.setCallbacks({
      onAudioChunk: async (requestId: number, chunk: Buffer) => {
        console.log(`Received audio chunk (${chunk.length} bytes)`);
        await this.player.appendStream(requestId, chunk);
      },
      onDone: async (requestId: number, audioChunks: Buffer[]) => {
        console.log("Audio stream completed");
        if (audioChunks.length === 0) return;
        console.log(`Playing audio (${Buffer.concat(audioChunks).length} bytes)`);
        await this.player.endStream(requestId, audioChunks);
      },
      onError: async (requestId: number, error: Error) => {
        console.error("Inworld error:", error);
      },
    });
  }

  updatePreset(preset: BasePreset): void {
    this.preset = preset;
  }

  updateApiKey(apiKey: string): void {
    this.inworld.updateApiKey(apiKey);
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
      this.inworld.cancel();
      this.player.stop();
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
    const voice = this.preset.getVoice(
      message.Speaker?.toLowerCase(),
      message.Voice?.Name.toLocaleLowerCase(),
      message.Race?.toLocaleLowerCase()
    );

    this.player.beginStream(++this.requestId);
    this.inworld
      .speak(this.requestId, text, voice, this.model, this.preset.speakingRate)
      .catch((error) => {
        console.error("Error during TTS processing:", error);
      });
  }

  protected _onClose(): void {
    console.log("TTS WebSocket disconnected");
  }
}