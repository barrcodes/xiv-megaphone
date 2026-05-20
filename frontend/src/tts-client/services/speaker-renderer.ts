import type { WebContents } from "electron";
import { AudioPlayer } from "./audio-player";
import { createSilentPcm, extractPcmFromWav } from "../utils/wav";

export class SpeakerRendererPlayer extends AudioPlayer {
  supportsStreaming = true;
  private webContents: WebContents;
  private currentRequestId = -1;

  constructor(webContents: WebContents) {
    super();
    this.webContents = webContents;
  }

  async _beginStream(requestId: number): Promise<void> {
    this.currentRequestId = requestId;
    if (!this.webContents.isDestroyed()) {
      this.webContents.send("audio-start");
    }
  }

  async _appendStream(requestId: number, wav: Buffer): Promise<void> {
    if (requestId !== this.currentRequestId) return;
    if (this.webContents.isDestroyed()) return;

    const { pcm } = extractPcmFromWav(wav);
    this.webContents.send("audio-chunk", pcm);
  }

  async _endStream(requestId: number): Promise<void> {
    if (requestId !== this.currentRequestId) return;
    if (this.webContents.isDestroyed()) return;

    const silence = createSilentPcm(
      { channels: 1, sampleRate: 48000, bitDepth: 16 },
      0.5
    );
    this.webContents.send("audio-chunk", silence);
    this.webContents.send("audio-end");
  }

  stop(): void {
    this.currentRequestId = -1;
    if (!this.webContents.isDestroyed()) {
      this.webContents.send("audio-stop");
    }
  }
}