import Speaker from "speaker";
import { AudioPlayer } from "./audio-player";
import { createSilentPcm, extractPcmFromWav } from "../utils/wav";

export class StreamSpeakerPlayer extends AudioPlayer {
  supportsStreaming = true;
  private speaker: Speaker | null = null;
  requestId: number = 0;
  silence = createSilentPcm(
    { channels: 1, sampleRate: 48000, bitDepth: 16 },
    0.5
  );

  async _beginStream(requestId: number): Promise<void> {
    this.requestId = requestId;
    this.speaker = new Speaker({
      channels: 1,
      bitDepth: 16,
      sampleRate: 48000,
    });
  }

  async _appendStream(requestId: number, wav: Buffer): Promise<void> {
    if (!this.speaker || requestId !== this.requestId) {
      console.warn(
        `Ignoring chunk for requestId ${requestId} (current: ${this.requestId})`
      );
      return;
    }

    const { pcm } = extractPcmFromWav(wav);

    if (this.speaker.destroyed) return;

    this.speaker.write(pcm);
  }

  async _endStream(requestId: number): Promise<void> {
    if (!this.speaker || requestId !== this.requestId) {
      console.warn(
        `Ignoring end stream for requestId ${requestId} (current: ${this.requestId})`
      );
      return;
    }

    if (this.speaker.destroyed) return;

    this.speaker.write(this.silence);
  }

  stop(): void {
    const speaker = this.speaker;
    this.speaker = null;
    this.requestId = -1;

    if (!speaker) return;

    console.log("Stopping speaker stream");

    try {
      speaker.removeAllListeners();
      speaker.destroy();
      speaker.close(true);
    } catch {}
  }
}
