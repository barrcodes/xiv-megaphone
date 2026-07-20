import WebSocket from "ws";
import type { WebContents } from "electron";
import { SocketManager } from "./socket";
import type { IpcMessage } from "../models/IpcMessage";
import type { Preset } from "../../shared/types";
import { WebAudioPlayer } from "./web-audio";

export interface TtsSocketOptions {
  port: number;
  preset: Preset;
  webContents: WebContents;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

export class TtsSocket extends SocketManager {
  private preset: Preset;
  private player: WebAudioPlayer;

  constructor(options: TtsSocketOptions) {
    super(`ws://localhost:${options.port}/Messages`);
    this.preset = options.preset;
    this.player = new WebAudioPlayer(options.webContents);

    this.onOpen = options.onConnected ?? null;
    this.onClose = options.onDisconnected ?? null;
  }

  updatePreset(preset: Preset): void {
    this.preset = preset;
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

  private async handleMessage(message: IpcMessage): Promise<void> {
    if (message.Type === "Cancel") {
      console.log("cancel message received, stopping playback");
      this.player.stop();
      return;
    }

    if (message.Type !== "Say") {
      console.warn(`Unsupported message type: ${message.Type}`);
      return;
    }

    console.log(
      `Received message: ${message.Speaker} (${message.Voice?.Name} ${message.Race}) says "${message.Payload}" @ volume = ${message.Volume}.`,
    );

    let text = message.Payload;
    if (this.preset.lexicon) {
      for (const [word, replacement] of Object.entries(this.preset.lexicon)) {
        text = text.replaceAll(word, replacement);
      }
    }

    try {
      await this.player.createStream({
        text,
        speaker: message.Speaker?.toLowerCase(),
        gender: message.Voice?.Name?.toLocaleLowerCase(),
        race: message.Race?.toLocaleLowerCase(),
        voiceOverrides: this.preset.voiceOverrides,
        speakingRate: this.preset.speakingRate,
        volume: message.Volume ?? 1,
      });
    } catch (error) {
      console.error("Error during TTS processing:", error);
    }
  }

  protected _onClose(): void {}
}
