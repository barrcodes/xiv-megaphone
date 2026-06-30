import { combineWavChunks } from "../utils/wav";

export abstract class AudioPlayer {
  abstract supportsStreaming: boolean;

  async endStream(requestId: number, wavs: Buffer[]) {
    if (!this.supportsStreaming) {
      const wav = combineWavChunks(wavs);
      await this._play(requestId, wav);
    } else {
      await this._endStream(requestId);
    }
  }

  protected async _play(requestId: number, wav: Buffer) {}

  async beginStream(requestId: number) {
    if (!this.supportsStreaming) {
      return;
    }
    await this._beginStream(requestId);
  }

  protected async _beginStream(requestId: number) {}

  async appendStream(requestId: number, wav: Buffer) {
    if (!this.supportsStreaming) {
      return;
    }

    await this._appendStream(requestId, wav);
  }

  protected async _appendStream(requestId: number, wav: Buffer) {}

  protected async _endStream(requestId: number) {}

  abstract stop(): void;
}
