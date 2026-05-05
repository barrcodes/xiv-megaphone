import { InworldTTS } from "@inworld/tts";

export interface InworldCallbacks {
  onAudioChunk?: (requestId: number, chunk: Buffer) => Promise<void>;
  onDone?: (requestId: number, buffers: Buffer[]) => Promise<void>;
  onError?: (requestId: number, error: Error) => Promise<void>;
}

export class InworldTTSService {
  private callbacks: InworldCallbacks = {};
  private abortController: AbortController | null = null;
  private tts = InworldTTS();

  setCallbacks(callbacks: InworldCallbacks): void {
    this.callbacks = callbacks;
  }

  async speak(
    requestId: number,
    text: string,
    voice: string,
    model: string,
    speakingRate: number
  ): Promise<void> {
    if (!Bun.env.INWORLD_API_KEY && !Bun.env.INWORLD_KEY) {
      throw new Error("INWORLD_API_KEY environment variable is not set");
    }

    this.cancel();
    this.abortController = new AbortController();
    const buffers: Buffer[] = [];

    try {
      for await (const chunk of this.tts.stream({
        text,
        voice,
        model,
        speakingRate,
        encoding: "LINEAR16",
        sampleRate: 48000,
      })) {
        if (this.abortController?.signal?.aborted) break;
        const bufferChunk = Buffer.from(chunk);
        await this.callbacks.onAudioChunk?.(requestId, bufferChunk);
        buffers.push(bufferChunk);
      }

      if (!this.abortController?.signal?.aborted) {
        await this.callbacks.onDone?.(requestId, buffers);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      await this.callbacks.onError?.(requestId, error);
      throw error;
    } finally {
      this.abortController = null;
    }
  }

  cancel(): void {
    this.abortController?.abort();
    this.abortController = null;
  }

  close(): void {
    this.cancel();
  }
}
