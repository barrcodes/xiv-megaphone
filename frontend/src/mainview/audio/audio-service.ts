const WORKLET_CODE = `
class TtsAudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buffer = new Float32Array(0);
    this._ended = false;
    this.port.onmessage = (e) => {
      const msg = e.data;
      switch (msg.type) {
        case 'audio-data': {
          const int16 = new Int16Array(msg.buffer);
          const float32 = new Float32Array(int16.length);
          for (let i = 0; i < int16.length; i++) {
            float32[i] = int16[i] / 32768;
          }
          const merged = new Float32Array(this._buffer.length + float32.length);
          merged.set(this._buffer);
          merged.set(float32, this._buffer.length);
          this._buffer = merged;
          break;
        }
        case 'silence': {
          const sil = new Float32Array(msg.samples).fill(0);
          const merged = new Float32Array(this._buffer.length + sil.length);
          merged.set(this._buffer);
          merged.set(sil, this._buffer.length);
          this._buffer = merged;
          break;
        }
        case 'end':
          this._ended = true;
          break;
        case 'stop':
          this._buffer = new Float32Array(0);
          this._ended = false;
          break;
      }
    };
  }

  process(inputs, outputs) {
    const output = outputs[0];
    if (!output || !output[0]) return true;
    const channel = output[0];
    if (this._ended && this._buffer.length === 0) return false;
    const avail = Math.min(channel.length, this._buffer.length);
    for (let i = 0; i < avail; i++) {
      channel[i] = this._buffer[i];
    }
    for (let i = avail; i < channel.length; i++) {
      channel[i] = 0;
    }
    this._buffer = this._buffer.slice(avail);
    return true;
  }
}
registerProcessor('tts-audio-processor', TtsAudioProcessor);
`;

export class AudioService {
  private ctx: AudioContext | null = null;
  private node: AudioWorkletNode | null = null;
  private initialized = false;

  async init(): Promise<void> {
    try {
      this.ctx = new AudioContext({ sampleRate: 48000 });
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }

      const blob = new Blob([WORKLET_CODE], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      await this.ctx.audioWorklet.addModule(url);
      URL.revokeObjectURL(url);

      this.node = new AudioWorkletNode(this.ctx, 'tts-audio-processor');
      this.node.connect(this.ctx.destination);
      this.initialized = true;
    } catch (err) {
      console.error('Failed to initialize audio service:', err);
    }
  }

  handleStart(): void {
    if (!this.node) return;
    this.node.port.postMessage({ type: 'stop' });
  }

  handleChunk(pcmData: Uint8Array): void {
    if (!this.node) return;
    const int16 = new Int16Array(pcmData.buffer, pcmData.byteOffset, pcmData.byteLength / 2);
    const transfer = int16.buffer.slice(
      int16.byteOffset,
      int16.byteOffset + int16.byteLength
    );
    this.node.port.postMessage({ type: 'audio-data', buffer: transfer }, [transfer]);
  }

  handleEnd(): void {
    if (!this.node) return;
    const silenceSamples = Math.ceil(48000 * 0.5);
    this.node.port.postMessage({ type: 'silence', samples: silenceSamples });
    this.node.port.postMessage({ type: 'end' });
  }

  handleStop(): void {
    if (!this.node) return;
    this.node.port.postMessage({ type: 'stop' });
  }

  destroy(): void {
    this.node?.disconnect();
    this.ctx?.close();
    this.initialized = false;
  }
}