import Speaker from "speaker";
import { AudioPlayer } from "./audio-player";

export class BufferedSpeakerPlayer extends AudioPlayer {
  supportsStreaming = false;
  _speaker: Speaker | null = null;

  private get speaker(): Speaker {
    if (!this._speaker) {
      this._speaker = new Speaker({
        channels: 1,
        bitDepth: 16,
        sampleRate: 48000,
      });
    }
    return this._speaker;
  }

  protected async _play(requestId: number, wav: Buffer): Promise<void> {
    this.speaker.write(wav);
    this.speaker.once("close", () => {
      this.stop();
    });
  }

  stop(): void {
    this.speaker.end();
    this._speaker = null;
  }
}
