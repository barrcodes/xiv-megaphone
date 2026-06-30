import WebSocket from "ws";
import type { WebContents } from "electron";
import { SocketManager } from "./socket";
import type { IpcMessage } from "../models/IpcMessage";
import type { BasePreset } from "../presets/base";
import { SpeakerRendererPlayer } from "./speaker-renderer";

export interface TtsSocketOptions {
  port: number;
  preset: BasePreset;
  webContents: WebContents;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

export class TtsSocket extends SocketManager {
  private preset: BasePreset;
  private player: SpeakerRendererPlayer;

  constructor(options: TtsSocketOptions) {
    super(`ws://localhost:${options.port}/Messages`);
    this.preset = options.preset;
    this.player = new SpeakerRendererPlayer(options.webContents);

    this.onOpen = options.onConnected ?? null;
    this.onClose = options.onDisconnected ?? null;
  }

  updatePreset(preset: BasePreset): void {
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
      `Received message: ${message.Speaker} (${message.Voice?.Name} ${message.Race}) says "${message.Payload}"`,
    );

    const text = message.Payload;
    const voice = this.preset.getVoice(
      message.Speaker?.toLowerCase(),
      message.Voice?.Name.toLocaleLowerCase(),
      message.Race?.toLocaleLowerCase(),
    );

    const lexiconText = this.preset.applyLexicon(text);

    try {
      await this.player.createStream({
        text: lexiconText,
        voice,
        speakingRate: this.preset.speakingRate,
      });
    } catch (error) {
      console.error("Error during TTS processing:", error);
    }
  }

  protected _onClose(): void {
    console.log("TTS WebSocket disconnected");
  }
}